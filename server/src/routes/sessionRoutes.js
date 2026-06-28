const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
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
} = require('../controllers/sessionController');

const router = express.Router();

router.post('/join', authMiddleware, joinSessionByCode);
router.post('/:sessionId/join', authMiddleware, joinSessionById);
router.post('/:sessionId/start', authMiddleware, startSession);
router.post('/:sessionId/answers', authMiddleware, submitAnswer);
router.delete('/:sessionId/leave', authMiddleware, leaveSession);
router.delete('/:sessionId/cancel', authMiddleware, cancelSession);
router.get('/:sessionId/current-question', authMiddleware, getCurrentQuestion);
router.get('/:sessionId/live-leaderboard', authMiddleware, getLiveLeaderboard);
router.get('/:sessionId/results', authMiddleware, getResults);
router.get('/:sessionId/leaderboard', authMiddleware, getLeaderboard);
router.get('/:sessionId/participant', authMiddleware, getParticipantSession);
router.get('/:sessionId', authMiddleware, getSessionById);

module.exports = router;
