const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getProfile } = require('../controllers/profileController');

const router = express.Router();

router.get('/', authMiddleware, getProfile);

module.exports = router;
