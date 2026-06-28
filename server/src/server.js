require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const pool = require('./config/db');
const registerSocketHandlers = require('./socket');
const { setSocketServer } = require('./controllers/sessionController');

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await pool.query('SELECT 1');

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    app.set('io', io);
    setSocketServer(io);
    registerSocketHandlers(io);

    server.listen(PORT, () => {
      console.log(`Quizzy server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
