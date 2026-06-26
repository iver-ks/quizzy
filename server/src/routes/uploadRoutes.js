const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadQuestionImageMiddleware } = require('../config/multer');
const { uploadQuestionImage } = require('../controllers/uploadController');

const router = express.Router();

router.post(
  '/question-image',
  authMiddleware,
  uploadQuestionImageMiddleware.single('image'),
  uploadQuestionImage
);

module.exports = router;
