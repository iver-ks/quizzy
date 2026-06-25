const pool = require('../config/db');

async function getCategories(req, res) {
  try {
    const result = await pool.query(
      'SELECT category_id, name FROM categories ORDER BY category_id ASC'
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении категорий' });
  }
}

module.exports = {
  getCategories,
};
