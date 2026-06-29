const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const quizRoutes = require('./routes/quizRoutes');
const questionRoutes = require('./routes/questionRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resultsRoutes = require('./routes/resultsRoutes');

const app = express();

const allowedOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOriginPattern.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Доступ с этого адреса запрещён'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ message: 'Quizzy backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/results', resultsRoutes);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'Размер изображения не должен превышать 5 MB',
      field: 'image',
    });
  }

  if (error?.field === 'image' || error?.status === 400) {
    return res.status(error.status || 400).json({
      message: error.message || 'Ошибка загрузки изображения',
      field: error.field || 'image',
    });
  }

  return next(error);
});

app.use((req, res) => {
  res.status(404).json({ message: 'Маршрут не найден' });
});

module.exports = app;
