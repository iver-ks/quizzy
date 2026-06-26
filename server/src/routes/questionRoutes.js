const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { updateQuestion, deleteQuestion } = require('../controllers/questionController');

const router = express.Router();

router.put('/:questionId', authMiddleware, updateQuestion);
router.delete('/:questionId', authMiddleware, deleteQuestion);

module.exports = router;
