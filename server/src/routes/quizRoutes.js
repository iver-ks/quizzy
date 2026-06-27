const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  createQuiz,
  updateQuiz,
  getMyQuizzes,
  getQuizById,
  getPublicWaitingQuizzes,
} = require('../controllers/quizController');
const { getQuizQuestions, createQuestion } = require('../controllers/questionController');
const { startQuizSession } = require('../controllers/sessionController');

const router = express.Router();

router.post('/', authMiddleware, createQuiz);
router.get('/my', authMiddleware, getMyQuizzes);
router.get('/public-waiting', getPublicWaitingQuizzes);
router.get('/:quizId/questions', authMiddleware, getQuizQuestions);
router.post('/:quizId/questions', authMiddleware, createQuestion);
router.post('/:quizId/start-session', authMiddleware, startQuizSession);
router.get('/:quizId', authMiddleware, getQuizById);
router.put('/:quizId', authMiddleware, updateQuiz);

module.exports = router;
