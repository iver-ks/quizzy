const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getMyResults } = require('../controllers/resultsController');

const router = express.Router();

router.get('/', authMiddleware, getMyResults);

module.exports = router;
