const pool = require('../config/db');

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

function getClosedSessionMessage(status) {
  if (status === 'active') {
    return 'Квиз уже начался';
  }

  if (status === 'finished' || status === 'cancelled') {
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

    if (String(session.creator_id) === String(req.user.user_id)) {
      return res.status(400).json({
        message: 'Организатор не может выйти через этот endpoint. Используйте закрытие комнаты.',
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

module.exports = {
  startQuizSession,
  getSessionById,
  joinSessionByCode,
  joinSessionById,
  getParticipantSession,
  leaveSession,
  cancelSession,
};
