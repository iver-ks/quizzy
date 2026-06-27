const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getSessionById,
  joinSessionByCode,
  joinSessionById,
  getParticipantSession,
  leaveSession,
  cancelSession,
} = require('../controllers/sessionController');

const router = express.Router();

router.post('/join', authMiddleware, joinSessionByCode);
router.post('/:sessionId/join', authMiddleware, joinSessionById);
router.delete('/:sessionId/leave', authMiddleware, leaveSession);
router.delete('/:sessionId/cancel', authMiddleware, cancelSession);
router.get('/:sessionId/participant', authMiddleware, getParticipantSession);
router.get('/:sessionId', authMiddleware, getSessionById);

module.exports = router;
