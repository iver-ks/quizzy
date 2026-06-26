const pool = require('../config/db');

const ANSWER_TYPES = new Set(['single', 'multiple']);
const VALID_TIME_LIMITS = new Set([10, 15, 20, 30, 45, 60]);
const VALID_POINTS = new Set([10, 20, 30, 40, 50, 100]);

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function getOwnedQuiz(quizId, userId) {
  const result = await pool.query(
    'SELECT quiz_id, creator_id, title, description, access_type, status, category_id FROM quizzes WHERE quiz_id = $1 LIMIT 1',
    [quizId]
  );

  if (result.rows.length === 0) {
    return { error: { status: 404, message: 'Квиз не найден' } };
  }

  const quiz = result.rows[0];

  if (String(quiz.creator_id) !== String(userId)) {
    return { error: { status: 403, message: 'У вас нет доступа к редактированию этого квиза' } };
  }

  return { quiz };
}

async function getOwnedQuestion(questionId, userId) {
  const result = await pool.query(
    `SELECT q.question_id, q.quiz_id, q.question_text, q.image_url, q.answer_type, q.time_limit_seconds, q.points, q.question_order
     FROM questions q
     JOIN quizzes qu ON qu.quiz_id = q.quiz_id
     WHERE q.question_id = $1
     LIMIT 1`,
    [questionId]
  );

  if (result.rows.length === 0) {
    return { error: { status: 404, message: 'Вопрос не найден' } };
  }

  const question = result.rows[0];

  const ownerCheck = await getOwnedQuiz(question.quiz_id, userId);
  if (ownerCheck.error) {
    return { error: ownerCheck.error };
  }

  return { question, quiz: ownerCheck.quiz };
}

function validateQuestionPayload(payload) {
  const questionText = normalizeText(payload.question_text);
  const imageUrl = payload.image_url ? String(payload.image_url).trim() : null;
  const answerType = payload.answer_type;
  const timeLimitSeconds = Number(payload.time_limit_seconds);
  const pointsNumber = Number(payload.points);
  const options = Array.isArray(payload.options) ? payload.options : [];

  if (!questionText) {
    return { message: 'Введите текст вопроса', field: 'question_text' };
  }

  if (questionText.length < 3) {
    return { message: 'Текст вопроса должен содержать минимум 3 символа', field: 'question_text' };
  }

  if (questionText.length > 200) {
    return { message: 'Текст вопроса не должен быть длиннее 200 символов', field: 'question_text' };
  }

  if (!ANSWER_TYPES.has(answerType)) {
    return { message: 'Некорректный тип ответа', field: 'answer_type' };
  }

  if (!VALID_TIME_LIMITS.has(timeLimitSeconds)) {
    return { message: 'Выберите время на вопрос', field: 'time_limit_seconds' };
  }

  if (!VALID_POINTS.has(pointsNumber)) {
    return { message: 'Выберите количество баллов', field: 'points' };
  }

  if (options.length < 2) {
    return { message: 'Добавьте минимум 2 варианта ответа', field: 'options' };
  }

  if (options.length > 6) {
    return { message: 'Можно добавить максимум 6 вариантов ответа', field: 'options' };
  }

  const normalizedOptions = options.map((option, index) => ({
    option_text: normalizeText(option.option_text),
    is_correct: Boolean(option.is_correct),
    option_order: index + 1,
  }));

  for (const option of normalizedOptions) {
    if (!option.option_text) {
      return { message: 'Вариант ответа не может быть пустым', field: 'options' };
    }

    if (option.option_text.length > 200) {
      return { message: 'Вариант ответа не должен быть длиннее 200 символов', field: 'options' };
    }
  }

  const correctOptions = normalizedOptions.filter((option) => option.is_correct);

  if (answerType === 'single' && correctOptions.length !== 1) {
    return {
      message: 'Для вопроса с одним ответом выберите один правильный вариант',
      field: 'options',
    };
  }

  if (answerType === 'multiple' && correctOptions.length < 1) {
    return {
      message: 'Для вопроса с несколькими ответами выберите хотя бы один правильный вариант',
      field: 'options',
    };
  }

  return {
    value: {
      questionText,
      imageUrl,
      answerType,
      timeLimitSeconds,
      points: pointsNumber,
      options: normalizedOptions,
    },
  };
}

async function mapQuestionsWithOptions(quizId) {
  const questionsResult = await pool.query(
    `SELECT question_id, quiz_id, question_text, image_url, answer_type, time_limit_seconds, points, question_order
     FROM questions
     WHERE quiz_id = $1
     ORDER BY question_order ASC, question_id ASC`,
    [quizId]
  );

  const optionsResult = await pool.query(
    `SELECT ao.option_id, ao.question_id, ao.option_text, ao.is_correct, ao.option_order
     FROM answer_options ao
     JOIN questions q ON q.question_id = ao.question_id
     WHERE q.quiz_id = $1
     ORDER BY ao.option_order ASC, ao.option_id ASC`,
    [quizId]
  );

  const optionsByQuestionId = new Map();

  for (const option of optionsResult.rows) {
    const current = optionsByQuestionId.get(String(option.question_id)) || [];
    current.push(option);
    optionsByQuestionId.set(String(option.question_id), current);
  }

  return questionsResult.rows.map((question) => ({
    ...question,
    options: optionsByQuestionId.get(String(question.question_id)) || [],
  }));
}

async function getQuizQuestions(req, res) {
  const quizId = Number(req.params.quizId);

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор квиза' });
  }

  try {
    const ownership = await getOwnedQuiz(quizId, req.user.user_id);

    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    const questions = await mapQuestionsWithOptions(quizId);
    return res.json(questions);
  } catch (error) {
    console.error('Get quiz questions error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении вопросов' });
  }
}

async function createQuestion(req, res) {
  const quizId = Number(req.params.quizId);

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор квиза' });
  }

  const validation = validateQuestionPayload(req.body);
  if (validation.message) {
    return res.status(400).json(validation);
  }

  const client = await pool.connect();

  try {
    const ownership = await getOwnedQuiz(quizId, req.user.user_id);
    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    const { questionText, imageUrl, answerType, timeLimitSeconds, points, options } = validation.value;

    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT COALESCE(MAX(question_order), 0) + 1 AS next_order FROM questions WHERE quiz_id = $1',
      [quizId]
    );
    const questionOrder = Number(orderResult.rows[0].next_order);

    const questionResult = await client.query(
      `INSERT INTO questions (quiz_id, question_text, image_url, answer_type, time_limit_seconds, points, question_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING question_id, quiz_id, question_text, image_url, answer_type, time_limit_seconds, points, question_order`,
      [quizId, questionText, imageUrl, answerType, timeLimitSeconds, points, questionOrder]
    );

    const question = questionResult.rows[0];
    const createdOptions = [];

    for (const option of options) {
      const optionResult = await client.query(
        `INSERT INTO answer_options (question_id, option_text, is_correct, option_order)
         VALUES ($1, $2, $3, $4)
         RETURNING option_id, question_id, option_text, is_correct, option_order`,
        [question.question_id, option.option_text, option.is_correct, option.option_order]
      );
      createdOptions.push(optionResult.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      ...question,
      options: createdOptions,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create question error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при создании вопроса' });
  } finally {
    client.release();
  }
}

async function updateQuestion(req, res) {
  const questionId = Number(req.params.questionId);

  if (!Number.isInteger(questionId) || questionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор вопроса' });
  }

  const validation = validateQuestionPayload(req.body);
  if (validation.message) {
    return res.status(400).json(validation);
  }

  const client = await pool.connect();

  try {
    const ownership = await getOwnedQuestion(questionId, req.user.user_id);
    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    const { questionText, imageUrl, answerType, timeLimitSeconds, points, options } = validation.value;

    await client.query('BEGIN');

    const questionResult = await client.query(
      `UPDATE questions
       SET question_text = $1,
           image_url = $2,
           answer_type = $3,
           time_limit_seconds = $4,
           points = $5
       WHERE question_id = $6
       RETURNING question_id, quiz_id, question_text, image_url, answer_type, time_limit_seconds, points, question_order`,
      [questionText, imageUrl, answerType, timeLimitSeconds, points, questionId]
    );

    await client.query('DELETE FROM answer_options WHERE question_id = $1', [questionId]);

    const updatedOptions = [];
    for (const option of options) {
      const optionResult = await client.query(
        `INSERT INTO answer_options (question_id, option_text, is_correct, option_order)
         VALUES ($1, $2, $3, $4)
         RETURNING option_id, question_id, option_text, is_correct, option_order`,
        [questionId, option.option_text, option.is_correct, option.option_order]
      );
      updatedOptions.push(optionResult.rows[0]);
    }

    await client.query('COMMIT');

    return res.json({
      ...questionResult.rows[0],
      options: updatedOptions,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update question error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при обновлении вопроса' });
  } finally {
    client.release();
  }
}

async function deleteQuestion(req, res) {
  const questionId = Number(req.params.questionId);

  if (!Number.isInteger(questionId) || questionId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор вопроса' });
  }

  const client = await pool.connect();

  try {
    const ownership = await getOwnedQuestion(questionId, req.user.user_id);
    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM answer_options WHERE question_id = $1', [questionId]);
    await client.query('DELETE FROM questions WHERE question_id = $1', [questionId]);
    await client.query('COMMIT');

    return res.json({ message: 'Вопрос удалён' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Delete question error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при удалении вопроса' });
  } finally {
    client.release();
  }
}

module.exports = {
  getQuizQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
