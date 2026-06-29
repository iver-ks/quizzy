const pool = require('../config/db');

const ACCESS_TYPES = new Set(['public', 'private']);

function normalizeTitle(title) {
  return typeof title === 'string' ? title.trim() : '';
}

function normalizeDescription(description) {
  return typeof description === 'string' ? description.trim() : '';
}

function validateQuizPayload({ title, description, category_id: categoryId, access_type: accessType }) {
  const trimmedTitle = normalizeTitle(title);
  const trimmedDescription = normalizeDescription(description);

  if (!trimmedTitle) {
    return { message: 'Введите название квиза', field: 'title' };
  }

  if (trimmedTitle.length < 3) {
    return { message: 'Название должно содержать минимум 3 символа', field: 'title' };
  }

  if (trimmedTitle.length > 100) {
    return { message: 'Название не должно быть длиннее 100 символов', field: 'title' };
  }

  if (trimmedDescription.length > 500) {
    return { message: 'Описание не должно быть длиннее 500 символов', field: 'description' };
  }

  if (categoryId === undefined || categoryId === null || categoryId === '') {
    return { message: 'Выберите категорию', field: 'category_id' };
  }

  const parsedCategoryId = Number(categoryId);

  if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
    return { message: 'Категория не найдена', field: 'category_id' };
  }

  if (!accessType) {
    return { message: 'Выберите тип доступа', field: 'access_type' };
  }

  if (!ACCESS_TYPES.has(accessType)) {
    return { message: 'Некорректный тип доступа', field: 'access_type' };
  }

  return {
    value: {
      title: trimmedTitle,
      description: trimmedDescription,
      categoryId: parsedCategoryId,
      accessType,
    },
  };
}

async function getOwnedQuiz(quizId, userId) {
  const result = await pool.query(
    `SELECT quiz_id, creator_id, category_id, title, description, access_type, status, created_at, updated_at
     FROM quizzes
     WHERE quiz_id = $1
     LIMIT 1`,
    [quizId]
  );

  if (result.rows.length === 0) {
    return { error: { status: 404, message: 'Квиз не найден' } };
  }

  const quiz = result.rows[0];

  if (String(quiz.creator_id) !== String(userId)) {
    return {
      error: {
        status: 403,
        message: 'У вас нет доступа к редактированию этого квиза',
      },
    };
  }

  return { quiz };
}

async function ensureCategoryExists(categoryId) {
  const categoryResult = await pool.query(
    'SELECT category_id FROM categories WHERE category_id = $1 LIMIT 1',
    [categoryId]
  );

  return categoryResult.rows.length > 0;
}

async function createQuiz(req, res) {
  const validation = validateQuizPayload(req.body);

  if (validation.message) {
    return res.status(400).json(validation);
  }

  const { title, description, categoryId, accessType } = validation.value;

  try {
    const hasCategory = await ensureCategoryExists(categoryId);

    if (!hasCategory) {
      return res.status(404).json({ message: 'Категория не найдена', field: 'category_id' });
    }

    const result = await pool.query(
      `INSERT INTO quizzes (creator_id, category_id, title, description, access_type, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING quiz_id, creator_id, category_id, title, description, access_type, status`,
      [req.user.user_id, categoryId, title, description || null, accessType]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create quiz error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при создании квиза' });
  }
}

async function updateQuiz(req, res) {
  const quizId = Number(req.params.quizId);

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор квиза' });
  }

  const validation = validateQuizPayload(req.body);

  if (validation.message) {
    return res.status(400).json(validation);
  }

  const { title, description, categoryId, accessType } = validation.value;

  try {
    const ownership = await getOwnedQuiz(quizId, req.user.user_id);

    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    const hasCategory = await ensureCategoryExists(categoryId);

    if (!hasCategory) {
      return res.status(404).json({ message: 'Категория не найдена', field: 'category_id' });
    }

    const result = await pool.query(
      `UPDATE quizzes
       SET title = $1,
           description = $2,
           category_id = $3,
           access_type = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE quiz_id = $5
       RETURNING quiz_id, creator_id, category_id, title, description, access_type, status, created_at, updated_at`,
      [title, description || null, categoryId, accessType, quizId]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Update quiz error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при обновлении квиза' });
  }
}

async function getMyQuizzes(req, res) {
  try {
    const result = await pool.query(
      `SELECT quiz_id, creator_id, category_id, title, description, access_type, status, created_at, updated_at
       FROM quizzes
       WHERE creator_id = $1
       ORDER BY created_at DESC`,
      [req.user.user_id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Get my quizzes error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении квизов' });
  }
}

async function getPaginatedMyQuizzes(req, res) {
  const page = Number.parseInt(req.query.page, 10);
  const limit = Number.parseInt(req.query.limit, 10);
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 3;
  const offset = (normalizedPage - 1) * normalizedLimit;

  try {
    const result = await pool.query(
      `SELECT
         q.quiz_id,
         q.title,
         q.access_type,
         COUNT(question_rows.question_id)::int AS questions_count,
         EXISTS (
           SELECT 1
           FROM results r
           JOIN quiz_sessions qs ON qs.session_id = r.session_id
           WHERE qs.quiz_id = q.quiz_id
         ) AS has_results
       FROM quizzes q
       LEFT JOIN questions question_rows ON question_rows.quiz_id = q.quiz_id
       WHERE q.creator_id = $1
       GROUP BY q.quiz_id, q.title, q.access_type, q.updated_at, q.created_at
       ORDER BY COALESCE(q.updated_at, q.created_at) DESC, q.quiz_id DESC
       LIMIT $2 OFFSET $3`,
      [req.user.user_id, normalizedLimit + 1, offset]
    );

    const hasMore = result.rows.length > normalizedLimit;
    const quizzes = hasMore ? result.rows.slice(0, normalizedLimit) : result.rows;

    return res.json({
      quizzes: quizzes.map((quiz) => ({
        quiz_id: Number(quiz.quiz_id),
        title: quiz.title,
        access_type: quiz.access_type,
        questions_count: Number(quiz.questions_count || 0),
        has_results: Boolean(quiz.has_results),
      })),
      hasMore,
    });
  } catch (error) {
    console.error('Get paginated my quizzes error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении моих квизов' });
  }
}

async function getLatestQuizResultsSession(req, res) {
  const quizId = Number(req.params.quizId);

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор квиза' });
  }

  try {
    const ownership = await getOwnedQuiz(quizId, req.user.user_id);

    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    const result = await pool.query(
      `SELECT qs.session_id
       FROM results r
       JOIN quiz_sessions qs ON qs.session_id = r.session_id
       WHERE qs.quiz_id = $1
       GROUP BY qs.session_id, qs.finished_at, qs.started_at, qs.created_at
       ORDER BY COALESCE(qs.finished_at, qs.started_at, qs.created_at) DESC, qs.session_id DESC
       LIMIT 1`,
      [quizId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Для этого квиза пока нет результатов' });
    }

    return res.json({
      session_id: Number(result.rows[0].session_id),
      redirect_to: `/results/${Number(result.rows[0].session_id)}`,
    });
  } catch (error) {
    console.error('Get latest quiz results session error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении результатов квиза' });
  }
}

async function getQuizById(req, res) {
  const quizId = Number(req.params.quizId);

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор квиза' });
  }

  try {
    const ownership = await getOwnedQuiz(quizId, req.user.user_id);

    if (ownership.error) {
      return res.status(ownership.error.status).json({ message: ownership.error.message });
    }

    return res.json(ownership.quiz);
  } catch (error) {
    console.error('Get quiz by id error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении квиза' });
  }
}

async function getPublicWaitingQuizzes(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         q.quiz_id,
         q.creator_id,
         qs.session_id,
         q.title,
         q.description,
         COALESCE(c.name, 'Другое') AS category,
         u.name AS creator_name,
         COUNT(DISTINCT question_rows.question_id)::int AS questions_count,
         COUNT(DISTINCT sp.participant_id)::int AS participants_count,
         q.access_type,
         q.status AS quiz_status,
         qs.status AS session_status,
         qs.created_at
       FROM quizzes q
       INNER JOIN quiz_sessions qs ON qs.quiz_id = q.quiz_id
       INNER JOIN users u ON u.user_id = q.creator_id
       LEFT JOIN categories c ON c.category_id = q.category_id
       LEFT JOIN questions question_rows ON question_rows.quiz_id = q.quiz_id
       LEFT JOIN session_participants sp ON sp.session_id = qs.session_id
       WHERE q.access_type = 'public'
         AND q.status = 'waiting'
         AND qs.status = 'waiting'
       GROUP BY
         q.quiz_id,
         q.creator_id,
         qs.session_id,
         q.title,
         q.description,
         c.name,
         u.name,
         q.access_type,
         q.status,
         qs.status,
         qs.created_at
       HAVING COUNT(DISTINCT question_rows.question_id) > 0
       ORDER BY qs.created_at DESC, q.quiz_id DESC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Get public waiting quizzes error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении публичных квизов' });
  }
}

module.exports = {
  createQuiz,
  updateQuiz,
  getMyQuizzes,
  getPaginatedMyQuizzes,
  getLatestQuizResultsSession,
  getQuizById,
  getPublicWaitingQuizzes,
};
