require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await pool.query('SELECT 1');
    app.listen(PORT, () => {
      console.log(`Quizzy server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
