const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getPaginatedMyQuizzes } = require('../controllers/quizController');

const router = express.Router();

router.get('/', authMiddleware, getPaginatedMyQuizzes);

module.exports = router;
