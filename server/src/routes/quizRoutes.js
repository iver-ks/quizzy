const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  createQuiz,
  updateQuiz,
  getMyQuizzes,
  getQuizById,
} = require('../controllers/quizController');
const { getQuizQuestions, createQuestion } = require('../controllers/questionController');

const router = express.Router();

router.post('/', authMiddleware, createQuiz);
router.get('/my', authMiddleware, getMyQuizzes);
router.get('/:quizId/questions', authMiddleware, getQuizQuestions);
router.post('/:quizId/questions', authMiddleware, createQuestion);
router.get('/:quizId', authMiddleware, getQuizById);
router.put('/:quizId', authMiddleware, updateQuiz);

module.exports = router;
