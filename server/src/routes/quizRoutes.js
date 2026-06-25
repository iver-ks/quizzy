const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { createQuiz, getMyQuizzes, getQuizById } = require('../controllers/quizController');

const router = express.Router();

router.post('/', authMiddleware, createQuiz);
router.get('/my', authMiddleware, getMyQuizzes);
router.get('/:quizId', authMiddleware, getQuizById);

module.exports = router;
