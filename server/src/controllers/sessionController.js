const pool = require('../config/db');

const sessionTimers = new Map();
let socketServer = null;

function setSocketServer(io) {
  socketServer = io;
}

function clearSessionTimer(sessionId) {
  const existingTimer = sessionTimers.get(String(sessionId));

  if (existingTimer) {
    clearTimeout(existingTimer);
    sessionTimers.delete(String(sessionId));
  }
}

function scheduleSessionTimer(sessionId, delayMs, callback) {
  clearSessionTimer(sessionId);

  const timer = setTimeout(async () => {
    sessionTimers.delete(String(sessionId));

    try {
      await callback();
    } catch (error) {
      console.error(`Session timer error for session ${sessionId}:`, error);
    }
  }, Math.max(0, delayMs));

  sessionTimers.set(String(sessionId), timer);
}

function generateRoomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getWaitingSessionByQuizId(quizId) {
  const result = await pool.query(
    `SELECT session_id, quiz_id, creator_id, room_code, status, created_at, started_at, finished_at
     FROM quiz_sessions
     WHERE quiz_id = $1 AND status = 'waiting'
     ORDER BY created_at DESC
     LIMIT 1`,
    [quizId]
  );

  return result.rows[0] || null;
}

async function getQuizLaunchData(quizId) {
  const quizResult = await pool.query(
    `SELECT quiz_id, creator_id, title, description, access_type, status
     FROM quizzes
     WHERE quiz_id = $1
     LIMIT 1`,
    [quizId]
  );

  return quizResult.rows[0] || null;
}

async function validateQuizReadyForSession(quizId) {
  const questionsResult = await pool.query(
    `SELECT q.question_id,
            COUNT(ao.option_id) AS options_count,
            COUNT(*) FILTER (WHERE ao.is_correct = true) AS correct_options_count
     FROM questions q
     LEFT JOIN answer_options ao ON ao.question_id = q.question_id
     WHERE q.quiz_id = $1
     GROUP BY q.question_id
     ORDER BY q.question_order ASC, q.question_id ASC`,
    [quizId]
  );

  if (questionsResult.rows.length === 0) {
    return { error: { status: 400, message: 'Добавьте хотя бы один вопрос' } };
  }

  for (const question of questionsResult.rows) {
    const optionsCount = Number(question.options_count);
    const correctOptionsCount = Number(question.correct_options_count);

    if (optionsCount < 2) {
      return {
        error: {
          status: 400,
          message: 'У каждого вопроса должно быть минимум 2 варианта ответа',
        },
      };
    }

    if (correctOptionsCount < 1) {
      return {
        error: {
          status: 400,
          message: 'У каждого вопроса должен быть правильный ответ',
        },
      };
    }
  }

  return { ok: true };
}

async function generateUniqueRoomCode(client) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const roomCode = generateRoomCode();
    const existing = await client.query(
      `SELECT session_id
       FROM quiz_sessions
       WHERE room_code = $1 AND status IN ('waiting', 'active')
       LIMIT 1`,
      [roomCode]
    );

    if (existing.rows.length === 0) {
      return roomCode;
    }
  }

  throw new Error('Failed to generate unique room code');
}

async function buildSessionResponse(sessionId) {
  const sessionResult = await pool.query(
    `SELECT qs.session_id,
            qs.quiz_id,
            qs.creator_id,
            qs.room_code,
            qs.status,
            qs.created_at,
            qs.started_at,
            qs.finished_at,
            q.title AS quiz_title,
            q.description AS quiz_description,
            q.access_type AS quiz_access_type,
            u.user_id AS creator_user_id,
            u.name AS creator_name
     FROM quiz_sessions qs
     JOIN quizzes q ON q.quiz_id = qs.quiz_id
     JOIN users u ON u.user_id = qs.creator_id
     WHERE qs.session_id = $1
     LIMIT 1`,
    [sessionId]
  );

  if (sessionResult.rows.length === 0) {
    return null;
  }

  const session = sessionResult.rows[0];
  const participantsResult = await pool.query(
    `SELECT sp.participant_id, sp.user_id, sp.joined_at, u.name
     FROM session_participants sp
     LEFT JOIN users u ON u.user_id = sp.user_id
     WHERE sp.session_id = $1
     ORDER BY sp.joined_at ASC, sp.participant_id ASC`,
    [sessionId]
  );

  const participants = participantsResult.rows.map((participant) => ({
    participant_id: Number(participant.participant_id),
    user_id: Number(participant.user_id),
    name: participant.name,
    joined_at: participant.joined_at,
  }));

  return {
    session_id: Number(session.session_id),
    quiz_id: Number(session.quiz_id),
    creator_id: Number(session.creator_id),
    room_code: session.room_code,
    status: session.status,
    created_at: session.created_at,
    started_at: session.started_at,
    finished_at: session.finished_at,
    quiz: {
      quiz_id: Number(session.quiz_id),
      title: session.quiz_title,
      description: session.quiz_description,
      access_type: session.quiz_access_type,
    },
    creator: {
      user_id: Number(session.creator_user_id),
      name: session.creator_name,
    },
    participants,
    participants_count: participants.length,
  };
}

async function getSessionWithQuizById(sessionId) {
  const result = await pool.query(
    `SELECT qs.session_id,
            qs.quiz_id,
            qs.creator_id,
            qs.room_code,
            qs.status,
            q.title,
            q.description,
            q.access_type,
            u.user_id AS creator_user_id,
            u.name AS creator_name
     FROM quiz_sessions qs
     JOIN quizzes q ON q.quiz_id = qs.quiz_id
     JOIN users u ON u.user_id = qs.creator_id
     WHERE qs.session_id = $1
     LIMIT 1`,
    [sessionId]
  );

  return result.rows[0] || null;
}

async function getSessionWithQuizByRoomCode(roomCode) {
  const result = await pool.query(
    `SELECT qs.session_id,
            qs.quiz_id,
            qs.creator_id,
            qs.room_code,
            qs.status,
            q.title,
            q.description,
            q.access_type,
            u.user_id AS creator_user_id,
            u.name AS creator_name
     FROM quiz_sessions qs
     JOIN quizzes q ON q.quiz_id = qs.quiz_id
     JOIN users u ON u.user_id = qs.creator_id
     WHERE qs.room_code = $1
     ORDER BY qs.created_at DESC, qs.session_id DESC
     LIMIT 1`,
    [roomCode]
  );

  return result.rows[0] || null;
}

async function getExistingParticipant(sessionId, userId) {
  const result = await pool.query(
    `SELECT participant_id, session_id, user_id, joined_at
     FROM session_participants
     WHERE session_id = $1 AND user_id = $2
     LIMIT 1`,
    [sessionId, userId]
  );

  return result.rows[0] || null;
}

async function deleteParticipant(sessionId, userId) {
  const result = await pool.query(
    `DELETE FROM session_participants
     WHERE session_id = $1 AND user_id = $2
     RETURNING participant_id`,
    [sessionId, userId]
  );

  return result.rows[0] || null;
}

async function getParticipantsCount(sessionId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS participants_count
     FROM session_participants
     WHERE session_id = $1`,
    [sessionId]
  );

  return Number(result.rows[0]?.participants_count || 0);
}

async function createParticipant(sessionId, userId) {
  const result = await pool.query(
    `INSERT INTO session_participants (session_id, user_id)
     VALUES ($1, $2)
     RETURNING participant_id, session_id, user_id, joined_at`,
    [sessionId, userId]
  );

  return result.rows[0];
}

async function getOrderedQuizQuestions(quizId, client = pool) {
  const result = await client.query(
    `SELECT q.question_id,
            q.question_text,
            q.image_url,
            q.answer_type,
            q.time_limit_seconds,
            q.points,
            q.question_order
     FROM questions q
     WHERE q.quiz_id = $1
     ORDER BY q.question_order ASC, q.question_id ASC`,
    [quizId]
  );

  return result.rows;
}

async function ensureSessionQuestions(sessionId, quizId, client) {
  const existingResult = await client.query(
    `SELECT session_question_id
     FROM session_questions
     WHERE session_id = $1
     LIMIT 1`,
    [sessionId]
  );

  if (existingResult.rows.length > 0) {
    return;
  }

  const questions = await getOrderedQuizQuestions(quizId, client);

  for (const [index, question] of questions.entries()) {
    const isFirstQuestion = index === 0;
    await client.query(
      `INSERT INTO session_questions (
         session_id,
         question_id,
         question_order,
         started_at,
         ended_at,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        question.question_id,
        Number(question.question_order),
        isFirstQuestion ? new Date() : null,
        null,
        isFirstQuestion ? 'active' : 'pending',
      ]
    );
  }
}

async function getQuestionOptions(questionId, includeCorrect = false, client = pool) {
  const result = await client.query(
    `SELECT option_id, option_text, option_order${includeCorrect ? ', is_correct' : ''}
     FROM answer_options
     WHERE question_id = $1
     ORDER BY option_order ASC, option_id ASC`,
    [questionId]
  );

  return result.rows.map((option) => ({
    option_id: Number(option.option_id),
    option_text: option.option_text,
    option_order: Number(option.option_order),
    ...(includeCorrect ? { is_correct: Boolean(option.is_correct) } : {}),
  }));
}

async function getCurrentSessionQuestionRecord(sessionId, client = pool) {
  const result = await client.query(
    `SELECT sq.session_question_id,
            sq.session_id,
            sq.question_id,
            sq.question_order,
            sq.started_at,
            sq.ended_at,
            sq.status,
            qs.quiz_id,
            qu.title AS quiz_title,
            q.question_text,
            q.image_url,
            q.answer_type,
            q.time_limit_seconds,
            q.points
     FROM session_questions sq
     JOIN quiz_sessions qs ON qs.session_id = sq.session_id
     JOIN quizzes qu ON qu.quiz_id = qs.quiz_id
     JOIN questions q ON q.question_id = sq.question_id
     WHERE sq.session_id = $1
       AND sq.status = 'active'
     ORDER BY sq.question_order ASC
     LIMIT 1`,
    [sessionId]
  );

  return result.rows[0] || null;
}

async function getCurrentQuestionPayload(sessionId, userId = null, client = pool) {
  const question = await getCurrentSessionQuestionRecord(sessionId, client);

  if (!question) {
    return null;
  }

  const [options, totalQuestionsResult, participantsCount, answeredCountResult, currentUserAnswerResult, answerStats] =
    await Promise.all([
      getQuestionOptions(question.question_id, false, client),
      client.query(
        `SELECT COUNT(*)::int AS total_questions
         FROM session_questions
         WHERE session_id = $1`,
        [sessionId]
      ),
      getParticipantsCount(sessionId),
      client.query(
        `SELECT COUNT(*)::int AS answered_count
         FROM participant_answers
         WHERE session_id = $1 AND question_id = $2`,
        [sessionId, question.question_id]
      ),
      userId
        ? client.query(
            `SELECT answer_id
             FROM participant_answers
             WHERE session_id = $1 AND question_id = $2 AND user_id = $3
             LIMIT 1`,
            [sessionId, question.question_id, userId]
          )
        : Promise.resolve({ rows: [] }),
      getAnswerStats(sessionId, question.question_id, client),
    ]);

  const startedAtIso = question.started_at ? new Date(question.started_at).toISOString() : null;
  const expiresAtIso = question.started_at
    ? new Date(
        new Date(question.started_at).getTime() + Number(question.time_limit_seconds) * 1000
      ).toISOString()
    : null;

  return {
    session_id: Number(question.session_id),
    quiz_id: Number(question.quiz_id),
    quiz: {
      quiz_id: Number(question.quiz_id),
      title: question.quiz_title,
    },
    question_number: Number(question.question_order),
    total_questions: Number(totalQuestionsResult.rows[0]?.total_questions || 0),
    participants_count: participantsCount,
    answered_count: Number(answeredCountResult.rows[0]?.answered_count || 0),
    current_user_answered: currentUserAnswerResult.rows.length > 0,
    option_stats: answerStats.option_stats,
    question: {
      question_id: Number(question.question_id),
      question_text: question.question_text,
      image_url: question.image_url,
      answer_type: question.answer_type,
      time_limit_seconds: Number(question.time_limit_seconds),
      points: Number(question.points),
      started_at: startedAtIso,
      expires_at: expiresAtIso,
      options,
    },
  };
}

async function getAnswerStats(sessionId, questionId, client = pool) {
  const [participantsCount, answeredCountResult, optionsResult, selectedCountResult] = await Promise.all([
    getParticipantsCount(sessionId),
    client.query(
      `SELECT COUNT(*)::int AS answered_count
       FROM participant_answers
       WHERE session_id = $1 AND question_id = $2`,
      [sessionId, questionId]
    ),
    getQuestionOptions(questionId, false, client),
    client.query(
      `SELECT pao.option_id, COUNT(*)::int AS selected_count
       FROM participant_answer_options pao
       JOIN participant_answers pa ON pa.answer_id = pao.answer_id AND pa.question_id = pao.question_id
       WHERE pa.session_id = $1 AND pa.question_id = $2
       GROUP BY pao.option_id`,
      [sessionId, questionId]
    ),
  ]);

  const selectedCounts = new Map(
    selectedCountResult.rows.map((row) => [String(row.option_id), Number(row.selected_count)])
  );

  const answeredCount = Number(answeredCountResult.rows[0]?.answered_count || 0);

  return {
    participants_count: participantsCount,
    answered_count: answeredCount,
    option_stats: optionsResult.map((option) => {
      const selectedCount = selectedCounts.get(String(option.option_id)) || 0;
      const percent = answeredCount > 0 ? Math.round((selectedCount / answeredCount) * 100) : 0;

      return {
        option_id: option.option_id,
        option_text: option.option_text,
        selected_count: selectedCount,
        percent,
      };
    }),
  };
}

async function saveResultsForSession(sessionId, client) {
  const totalsResult = await client.query(
    `SELECT sp.user_id,
            COALESCE(SUM(pa.points_awarded), 0)::numeric AS total_points,
            COALESCE(COUNT(*) FILTER (WHERE pa.answer_status = 'correct'), 0)::int AS correct_answers_count
     FROM session_participants sp
     LEFT JOIN participant_answers pa
       ON pa.session_id = sp.session_id
      AND pa.user_id = sp.user_id
     WHERE sp.session_id = $1
     GROUP BY sp.user_id
     ORDER BY total_points DESC, correct_answers_count DESC, sp.user_id ASC`,
    [sessionId]
  );

  const activeUserIds = totalsResult.rows.map((row) => Number(row.user_id));

  if (activeUserIds.length > 0) {
    await client.query(
      `DELETE FROM results
       WHERE session_id = $1
         AND user_id <> ALL($2::int[])`,
      [sessionId, activeUserIds]
    );
  } else {
    await client.query('DELETE FROM results WHERE session_id = $1', [sessionId]);
  }

  for (const [index, row] of totalsResult.rows.entries()) {
    const values = [
      sessionId,
      Number(row.user_id),
      Number(row.total_points),
      Number(row.correct_answers_count),
      index + 1,
    ];

    const updateResult = await client.query(
      `UPDATE results
       SET total_points = $3,
           correct_answers_count = $4,
           place_in_leaderboard = $5,
           saved_at = CURRENT_TIMESTAMP
       WHERE session_id = $1 AND user_id = $2`,
      values
    );

    if (updateResult.rowCount === 0) {
      await client.query(
        `INSERT INTO results (
           session_id,
           user_id,
           total_points,
           correct_answers_count,
           place_in_leaderboard,
           saved_at
         )
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        values
      );
    }
  }
}

async function getLeaderboardRows(sessionId, client = pool) {
  const result = await client.query(
    `SELECT r.place_in_leaderboard, r.user_id, u.name, r.total_points, r.correct_answers_count
     FROM results r
     JOIN users u ON u.user_id = r.user_id
     WHERE r.session_id = $1
     ORDER BY r.place_in_leaderboard ASC, r.user_id ASC`,
    [sessionId]
  );

  return result.rows.map((row) => ({
    place_in_leaderboard: Number(row.place_in_leaderboard),
    user_id: Number(row.user_id),
    name: row.name,
    total_points: Number(row.total_points),
    correct_answers_count: Number(row.correct_answers_count),
  }));
}

async function getResultsPayload(sessionId, client = pool) {
  const quizResult = await client.query(
    `SELECT q.title
     FROM quiz_sessions qs
     JOIN quizzes q ON q.quiz_id = qs.quiz_id
     WHERE qs.session_id = $1
     LIMIT 1`,
    [sessionId]
  );

  const leaderboardResult = await client.query(
    `SELECT r.place_in_leaderboard,
            r.user_id,
            u.name,
            r.total_points
     FROM results r
     JOIN users u ON u.user_id = r.user_id
     WHERE r.session_id = $1
     ORDER BY r.place_in_leaderboard ASC, r.user_id ASC`,
    [sessionId]
  );

  return {
    quizTitle: quizResult.rows[0]?.title || 'Квиз',
    leaderboard: leaderboardResult.rows.map((row) => ({
      place: Number(row.place_in_leaderboard),
      userId: Number(row.user_id),
      name: row.name,
      totalPoints: Number(row.total_points),
    })),
  };
}

async function getLiveLeaderboardRows(sessionId, client = pool) {
  const result = await client.query(
    `SELECT u.user_id,
            u.name,
            COALESCE(SUM(pa.points_awarded), 0)::int AS total_points,
            sp.joined_at
     FROM session_participants sp
     JOIN users u ON u.user_id = sp.user_id
     LEFT JOIN participant_answers pa
       ON pa.session_id = sp.session_id
      AND pa.user_id = sp.user_id
     WHERE sp.session_id = $1
     GROUP BY u.user_id, u.name, sp.joined_at
     ORDER BY total_points DESC, sp.joined_at ASC, u.name ASC, u.user_id ASC`,
    [sessionId]
  );

  return result.rows.map((row, index) => ({
    place: index + 1,
    user_id: Number(row.user_id),
    name: row.name,
    total_points: Number(row.total_points),
  }));
}

function getClosedSessionMessage(status) {
  if (status === 'active') {
    return 'Квиз уже начался';
  }

  if (status === 'finished') {
    return 'Комната закрыта';
  }

  return 'Подключение к этой комнате уже закрыто';
}

function validateJoinableSession(sessionRow, userId, notFoundMessage) {
  if (!sessionRow) {
    return { status: 404, message: notFoundMessage };
  }

  if (sessionRow.status !== 'waiting') {
    return { status: 400, message: getClosedSessionMessage(sessionRow.status) };
  }

  if (String(sessionRow.creator_id) === String(userId)) {
    return { status: 403, message: 'Автор не может подключиться к своему квизу как участник' };
  }

  return null;
}

function buildJoinResponse(sessionRow, participantRow) {
  return {
    session_id: Number(sessionRow.session_id),
    participant_id: Number(participantRow.participant_id),
    room_code: sessionRow.room_code,
    status: sessionRow.status,
    quiz: {
      quiz_id: Number(sessionRow.quiz_id),
      title: sessionRow.title,
      description: sessionRow.description,
      access_type: sessionRow.access_type,
    },
    creator: {
      user_id: Number(sessionRow.creator_user_id),
      name: sessionRow.creator_name,
    },
  };
}

async function ensureParticipantJoined(sessionRow, userId) {
  const existingParticipant = await getExistingParticipant(sessionRow.session_id, userId);

  if (existingParticipant) {
    return buildJoinResponse(sessionRow, existingParticipant);
  }

  const participant = await createParticipant(sessionRow.session_id, userId);
  return buildJoinResponse(sessionRow, participant);
}

async function emitQuestionStarted(sessionId) {
  if (!socketServer) {
    return;
  }

  const payload = await getCurrentQuestionPayload(sessionId);
  if (!payload) {
    return;
  }

  socketServer.to(`session_${sessionId}`).emit('question_started', {
    sessionId: payload.session_id,
    quiz: payload.quiz,
    questionNumber: payload.question_number,
    totalQuestions: payload.total_questions,
    question: payload.question,
    timeLimitSeconds: payload.question.time_limit_seconds,
    participantsCount: payload.participants_count,
    answeredCount: payload.answered_count,
    optionStats: payload.option_stats,
    current_user_answered: false,
  });
}

async function emitAnswerSubmitted(sessionId, questionId) {
  if (!socketServer) {
    return;
  }

  const stats = await getAnswerStats(sessionId, questionId);

  socketServer.to(`session_${sessionId}_host`).emit('answer_submitted', {
    sessionId: Number(sessionId),
    questionId: Number(questionId),
    answeredCount: stats.answered_count,
    participantsCount: stats.participants_count,
    optionStats: stats.option_stats,
  });
}

async function emitLeaderboardUpdated(sessionId) {
  if (!socketServer) {
    return;
  }

  const leaderboard = await getLiveLeaderboardRows(sessionId);

  socketServer.to(`session_${sessionId}`).emit('leaderboard_updated', {
    sessionId: Number(sessionId),
    leaderboard,
  });
}

async function finishQuizSession(sessionId, quizId, client) {
  await client.query(
    `UPDATE quiz_sessions
     SET status = 'finished',
         finished_at = CURRENT_TIMESTAMP
     WHERE session_id = $1`,
    [sessionId]
  );

  await client.query(
    `UPDATE quizzes
     SET status = 'finished',
         updated_at = CURRENT_TIMESTAMP
     WHERE quiz_id = $1`,
    [quizId]
  );

  await saveResultsForSession(sessionId, client);
}

async function closeCurrentQuestionAndAdvance(sessionId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentQuestion = await getCurrentSessionQuestionRecord(sessionId, client);

    if (!currentQuestion) {
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `UPDATE session_questions
       SET status = 'closed',
           ended_at = CURRENT_TIMESTAMP
       WHERE session_id = $1 AND question_id = $2 AND status = 'active'`,
      [sessionId, currentQuestion.question_id]
    );

    const nextQuestionResult = await client.query(
      `SELECT question_id, question_order
       FROM session_questions
       WHERE session_id = $1 AND status = 'pending'
       ORDER BY question_order ASC
       LIMIT 1`,
      [sessionId]
    );

    if (nextQuestionResult.rows.length > 0) {
      const nextQuestion = nextQuestionResult.rows[0];

      await client.query(
        `UPDATE session_questions
         SET status = 'active',
             started_at = CURRENT_TIMESTAMP,
             ended_at = NULL
         WHERE session_id = $1 AND question_id = $2`,
        [sessionId, nextQuestion.question_id]
      );

      await client.query('COMMIT');

      if (socketServer) {
        socketServer.to(`session_${sessionId}`).emit('question_finished', {
          sessionId: Number(sessionId),
          questionId: Number(currentQuestion.question_id),
        });
      }

      const nextPayload = await getCurrentQuestionPayload(sessionId);
      if (nextPayload) {
        await emitQuestionStarted(sessionId);
        scheduleSessionTimer(sessionId, nextPayload.question.time_limit_seconds * 1000, async () => {
          await closeCurrentQuestionAndAdvance(sessionId);
        });
      }

      return;
    }

    await finishQuizSession(sessionId, currentQuestion.quiz_id, client);
    await client.query('COMMIT');

    clearSessionTimer(sessionId);

    if (socketServer) {
      socketServer.to(`session_${sessionId}`).emit('question_finished', {
        sessionId: Number(sessionId),
        questionId: Number(currentQuestion.question_id),
      });
      socketServer.to(`session_${sessionId}`).emit('quiz:finished', {
        sessionId: Number(sessionId),
        redirectTo: `/results/${sessionId}`,
      });
      socketServer.to(`session_${sessionId}`).emit('quiz_finished', {
        sessionId: Number(sessionId),
        redirectTo: `/results/${sessionId}`,
      });
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function startQuizSession(req, res) {
  const quizId = Number(req.params.quizId);

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор квиза' });
  }

  try {
    const quiz = await getQuizLaunchData(quizId);

    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    if (String(quiz.creator_id) !== String(req.user.user_id)) {
      return res.status(403).json({ message: 'У вас нет доступа к запуску этого квиза' });
    }

    const readiness = await validateQuizReadyForSession(quizId);
    if (readiness.error) {
      return res.status(readiness.error.status).json({ message: readiness.error.message });
    }

    const existingSession = await getWaitingSessionByQuizId(quizId);
    if (existingSession) {
      const sessionResponse = await buildSessionResponse(existingSession.session_id);
      return res.json(sessionResponse);
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const roomCode = await generateUniqueRoomCode(client);

      const sessionResult = await client.query(
        `INSERT INTO quiz_sessions (quiz_id, creator_id, room_code, status, started_at, finished_at)
         VALUES ($1, $2, $3, 'waiting', NULL, NULL)
         RETURNING session_id`,
        [quizId, req.user.user_id, roomCode]
      );

      await client.query(
        `UPDATE quizzes
         SET status = 'waiting',
             updated_at = CURRENT_TIMESTAMP
         WHERE quiz_id = $1`,
        [quizId]
      );

      await client.query('COMMIT');

      const sessionResponse = await buildSessionResponse(sessionResult.rows[0].session_id);
      return res.status(201).json(sessionResponse);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Start quiz session error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при запуске комнаты ожидания' });
  }
}

async function getSessionById(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  try {
    const session = await buildSessionResponse(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    if (String(session.creator_id) !== String(req.user.user_id)) {
      return res.status(403).json({ message: 'У вас нет доступа к этой комнате' });
    }

    return res.json(session);
  } catch (error) {
    console.error('Get session by id error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении данных комнаты' });
  }
}

async function joinSessionByCode(req, res) {
  const roomCode = typeof req.body?.room_code === 'string' ? req.body.room_code.trim() : '';

  if (!roomCode) {
    return res.status(400).json({ message: 'Введите код комнаты', field: 'room_code' });
  }

  try {
    const session = await getSessionWithQuizByRoomCode(roomCode);
    const validationError = validateJoinableSession(
      session,
      req.user.user_id,
      'Комната с таким кодом не найдена'
    );

    if (validationError) {
      return res.status(validationError.status).json({ message: validationError.message });
    }

    const response = await ensureParticipantJoined(session, req.user.user_id);
    return res.json(response);
  } catch (error) {
    console.error('Join session by code error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при подключении к комнате' });
  }
}

async function joinSessionById(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  try {
    const session = await getSessionWithQuizById(sessionId);
    const validationError = validateJoinableSession(session, req.user.user_id, 'Комната не найдена');

    if (validationError) {
      return res.status(validationError.status).json({ message: validationError.message });
    }

    const response = await ensureParticipantJoined(session, req.user.user_id);
    return res.json(response);
  } catch (error) {
    console.error('Join session by id error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при подключении к комнате' });
  }
}

async function getParticipantSession(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  try {
    const session = await buildSessionResponse(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    const isCreator = String(session.creator_id) === String(req.user.user_id);
    const isParticipant = session.participants.some(
      (participant) => String(participant.user_id) === String(req.user.user_id)
    );

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'Вы не подключены к этой комнате' });
    }

    return res.json({
      session_id: session.session_id,
      room_code: session.room_code,
      status: session.status,
      quiz: session.quiz,
      creator: session.creator,
      participants_count: session.participants_count,
      current_user_joined: isParticipant,
    });
  } catch (error) {
    console.error('Get participant session error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении данных комнаты' });
  }
}

async function leaveSession(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  try {
    const session = await getSessionWithQuizById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    if (session.status !== 'waiting') {
      return res.status(400).json({ message: 'Из активного или завершённого квиза выйти через этот endpoint нельзя' });
    }

    if (String(session.creator_id) === String(req.user.user_id)) {
      return res.status(400).json({
        message: 'Организатор не может выйти через этот endpoint. Используйте отдельное закрытие комнаты.',
      });
    }

    await deleteParticipant(sessionId, req.user.user_id);
    const participantsCount = await getParticipantsCount(sessionId);

    return res.json({
      message: 'Вы вышли из комнаты',
      participants_count: participantsCount,
    });
  } catch (error) {
    console.error('Leave session error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при выходе из комнаты' });
  }
}

async function cancelSession(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `SELECT qs.session_id, qs.quiz_id, qs.creator_id, qs.status
       FROM quiz_sessions qs
       WHERE qs.session_id = $1
       LIMIT 1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    const session = sessionResult.rows[0];

    if (String(session.creator_id) !== String(req.user.user_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Только организатор может закрыть комнату' });
    }

    if (session.status !== 'waiting') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Комната уже не находится в статусе ожидания' });
    }

    await client.query(
      `DELETE FROM session_participants
       WHERE session_id = $1`,
      [sessionId]
    );

    const updatedSessionResult = await client.query(
      `UPDATE quiz_sessions
       SET status = 'finished',
           finished_at = CURRENT_TIMESTAMP
       WHERE session_id = $1
       RETURNING session_id, status`,
      [sessionId]
    );

    const updatedQuizResult = await client.query(
      `UPDATE quizzes
       SET status = 'draft',
           updated_at = CURRENT_TIMESTAMP
       WHERE quiz_id = $1
       RETURNING quiz_id, status`,
      [session.quiz_id]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Комната закрыта',
      session_id: Number(updatedSessionResult.rows[0].session_id),
      session_status: updatedSessionResult.rows[0].status,
      quiz_status: updatedQuizResult.rows[0].status,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Cancel session error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при закрытии комнаты' });
  } finally {
    client.release();
  }
}

async function startSession(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `SELECT qs.session_id, qs.quiz_id, qs.creator_id, qs.status
       FROM quiz_sessions qs
       WHERE qs.session_id = $1
       LIMIT 1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    const session = sessionResult.rows[0];

    if (session.status !== 'waiting') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Квиз уже нельзя запустить из этой комнаты' });
    }

    if (String(session.creator_id) !== String(req.user.user_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Только организатор может начать квиз' });
    }

    const readiness = await validateQuizReadyForSession(session.quiz_id);
    if (readiness.error) {
      await client.query('ROLLBACK');
      return res.status(readiness.error.status).json({ message: readiness.error.message });
    }

    const participantsCount = await getParticipantsCount(sessionId);
    if (participantsCount < 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Нельзя начать квиз без участников' });
    }

    await ensureSessionQuestions(sessionId, session.quiz_id, client);

    await client.query(
      `UPDATE quiz_sessions
       SET status = 'active',
           started_at = CURRENT_TIMESTAMP
       WHERE session_id = $1`,
      [sessionId]
    );

    await client.query(
      `UPDATE quizzes
       SET status = 'active',
           updated_at = CURRENT_TIMESTAMP
       WHERE quiz_id = $1`,
      [session.quiz_id]
    );

    await client.query('COMMIT');

    const currentQuestion = await getCurrentQuestionPayload(sessionId);

    if (socketServer) {
      socketServer.to(`session_${sessionId}`).emit('quiz_started', {
        sessionId,
        quizId: Number(session.quiz_id),
        status: 'active',
        redirectHostTo: `/sessions/${sessionId}/host`,
        redirectParticipantTo: `/sessions/${sessionId}/play`,
      });
    }

    await emitQuestionStarted(sessionId);

    if (currentQuestion) {
      scheduleSessionTimer(sessionId, currentQuestion.question.time_limit_seconds * 1000, async () => {
        await closeCurrentQuestionAndAdvance(sessionId);
      });
    }

    return res.json({
      message: 'Квиз начался',
      session_id: sessionId,
      status: 'active',
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Start session error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при запуске квиза' });
  } finally {
    client.release();
  }
}

async function getCurrentQuestion(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  try {
    const session = await buildSessionResponse(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    const isCreator = String(session.creator_id) === String(req.user.user_id);
    const isParticipant = session.participants.some(
      (participant) => String(participant.user_id) === String(req.user.user_id)
    );

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'У вас нет доступа к текущему вопросу этой комнаты' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Квиз ещё не начался' });
    }

    const currentQuestion = await getCurrentQuestionPayload(sessionId, req.user.user_id);

    if (!currentQuestion) {
      return res.status(404).json({ message: 'Активный вопрос не найден' });
    }

    return res.json(currentQuestion);
  } catch (error) {
    console.error('Get current question error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении текущего вопроса' });
  }
}

async function submitAnswer(req, res) {
  const sessionId = Number(req.params.sessionId);
  const questionId = Number(req.body?.question_id);
  const selectedOptions = Array.isArray(req.body?.selected_options)
    ? [...new Set(req.body.selected_options.map((optionId) => Number(optionId)).filter((optionId) => Number.isInteger(optionId) && optionId > 0))]
    : [];

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  if (!Number.isInteger(questionId) || questionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор вопроса' });
  }

  if (selectedOptions.length === 0) {
    return res.status(400).json({ message: 'Выберите хотя бы один вариант ответа' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const participantResult = await client.query(
      `SELECT sp.participant_id, qs.status AS session_status
       FROM session_participants sp
       JOIN quiz_sessions qs ON qs.session_id = sp.session_id
       WHERE sp.session_id = $1 AND sp.user_id = $2
       LIMIT 1`,
      [sessionId, req.user.user_id]
    );

    if (participantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Вы не участвуете в этой комнате' });
    }

    if (participantResult.rows[0].session_status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Квиз уже не принимает ответы' });
    }

    const activeQuestion = await getCurrentSessionQuestionRecord(sessionId, client);

    if (!activeQuestion || Number(activeQuestion.question_id) !== questionId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Этот вопрос сейчас не активен' });
    }

    const expiresAt = new Date(activeQuestion.started_at).getTime() + Number(activeQuestion.time_limit_seconds) * 1000;
    if (Date.now() > expiresAt) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Время на этот вопрос уже закончилось' });
    }

    const existingAnswer = await client.query(
      `SELECT answer_id
       FROM participant_answers
       WHERE session_id = $1 AND user_id = $2 AND question_id = $3
       LIMIT 1`,
      [sessionId, req.user.user_id, questionId]
    );

    if (existingAnswer.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Ответ уже отправлен' });
    }

    const options = await getQuestionOptions(questionId, true, client);
    const optionsById = new Map(options.map((option) => [option.option_id, option]));

    if (selectedOptions.some((optionId) => !optionsById.has(optionId))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Выбранные варианты не принадлежат этому вопросу' });
    }

    const correctOptions = options.filter((option) => option.is_correct).map((option) => option.option_id);
    const selectedCorrectCount = selectedOptions.filter((optionId) => optionsById.get(optionId)?.is_correct).length;
    const selectedWrongCount = selectedOptions.filter((optionId) => !optionsById.get(optionId)?.is_correct).length;

    const isFullyCorrect = selectedWrongCount === 0 && selectedCorrectCount === correctOptions.length;
    const pointsAwarded = isFullyCorrect ? Number(activeQuestion.points) : 0;

    let answerStatus = 'incorrect';
    if (isFullyCorrect) {
      answerStatus = 'correct';
    } else if (selectedCorrectCount > 0) {
      answerStatus = 'partially_correct';
    }

    const answerInsertResult = await client.query(
      `INSERT INTO participant_answers (
         session_id,
         user_id,
         question_id,
         answer_status,
         points_awarded,
         correct_options_selected,
         wrong_options_selected
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING answer_id`,
      [
        sessionId,
        req.user.user_id,
        questionId,
        answerStatus,
        pointsAwarded,
        selectedCorrectCount,
        selectedWrongCount,
      ]
    );

    const answerId = Number(answerInsertResult.rows[0].answer_id);

    for (const optionId of selectedOptions) {
      await client.query(
        `INSERT INTO participant_answer_options (answer_id, question_id, option_id)
         VALUES ($1, $2, $3)`,
        [answerId, questionId, optionId]
      );
    }

    await client.query('COMMIT');

    await Promise.all([
      emitAnswerSubmitted(sessionId, questionId),
      emitLeaderboardUpdated(sessionId),
    ]);

    return res.status(201).json({
      message: 'Ответ принят',
      question_id: questionId,
      answer_status: answerStatus,
      points_awarded: pointsAwarded,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Submit answer error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при отправке ответа' });
  } finally {
    client.release();
  }
}

async function getLeaderboard(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  try {
    const session = await buildSessionResponse(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    const isCreator = String(session.creator_id) === String(req.user.user_id);
    const isParticipant = session.participants.some(
      (participant) => String(participant.user_id) === String(req.user.user_id)
    );

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'У вас нет доступа к лидерборду этой комнаты' });
    }

    if (session.status !== 'finished') {
      return res.status(400).json({ message: 'Лидерборд будет доступен после завершения квиза' });
    }

    const leaderboard = await getLeaderboardRows(sessionId);
    return res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении лидерборда' });
  }
}

async function getLiveLeaderboard(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ РєРѕРјРЅР°С‚С‹' });
  }

  try {
    const session = await buildSessionResponse(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'РљРѕРјРЅР°С‚Р° РЅРµ РЅР°Р№РґРµРЅР°' });
    }

    const isCreator = String(session.creator_id) === String(req.user.user_id);
    const isParticipant = session.participants.some(
      (participant) => String(participant.user_id) === String(req.user.user_id)
    );

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'РЈ РІР°СЃ РЅРµС‚ РґРѕСЃС‚СѓРїР° Рє Р»РёРґРµСЂР±РѕСЂРґСѓ СЌС‚РѕР№ РєРѕРјРЅР°С‚С‹' });
    }

    const leaderboard = await getLiveLeaderboardRows(sessionId);
    return res.json(leaderboard);
  } catch (error) {
    console.error('Get live leaderboard error:', error);
    return res.status(500).json({ message: 'РћС€РёР±РєР° СЃРµСЂРІРµСЂР° РїСЂРё РїРѕР»СѓС‡РµРЅРёРё live-Р»РёРґРµСЂР±РѕСЂРґР°' });
  }
}

async function getResults(req, res) {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор комнаты' });
  }

  try {
    const session = await buildSessionResponse(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    const isCreator = String(session.creator_id) === String(req.user.user_id);
    const isParticipant = session.participants.some(
      (participant) => String(participant.user_id) === String(req.user.user_id)
    );

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'У вас нет доступа к результатам этой комнаты' });
    }

    if (session.status !== 'finished') {
      return res.status(400).json({ message: 'Результаты будут доступны после завершения квиза' });
    }

    const payload = await getResultsPayload(sessionId);
    return res.json(payload);
  } catch (error) {
    console.error('Get results error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении итоговых результатов' });
  }
}

module.exports = {
  setSocketServer,
  startQuizSession,
  getSessionById,
  joinSessionByCode,
  joinSessionById,
  getParticipantSession,
  leaveSession,
  cancelSession,
  startSession,
  getCurrentQuestion,
  submitAnswer,
  getLeaderboard,
  getLiveLeaderboard,
  getResults,
};
