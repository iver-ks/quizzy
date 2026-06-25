const pool = require('../config/db');

const ACCESS_TYPES = new Set(['public', 'private']);

function normalizeTitle(title) {
  return typeof title === 'string' ? title.trim() : '';
}

function normalizeDescription(description) {
  if (typeof description !== 'string') {
    return '';
  }

  return description.trim();
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

async function createQuiz(req, res) {
  const validation = validateQuizPayload(req.body);

  if (validation.message) {
    return res.status(400).json(validation);
  }

  const { title, description, categoryId, accessType } = validation.value;

  try {
    const categoryResult = await pool.query(
      'SELECT category_id FROM categories WHERE category_id = $1 LIMIT 1',
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
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

async function getQuizById(req, res) {
  const quizId = Number(req.params.quizId);

  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ message: 'Некорректный идентификатор квиза' });
  }

  try {
    const result = await pool.query(
      `SELECT quiz_id, creator_id, category_id, title, description, access_type, status, created_at, updated_at
       FROM quizzes
       WHERE quiz_id = $1 AND creator_id = $2
       LIMIT 1`,
      [quizId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get quiz by id error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении квиза' });
  }
}

module.exports = {
  createQuiz,
  getMyQuizzes,
  getQuizById,
};
