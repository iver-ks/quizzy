function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join_session_room', (payload = {}) => {
      const sessionId = Number(payload.sessionId);
      const role = payload.role === 'host' ? 'host' : 'participant';

      if (!Number.isInteger(sessionId) || sessionId <= 0) {
        socket.emit('socket_error', { message: 'Некорректный идентификатор комнаты' });
        return;
      }

      socket.join(`session_${sessionId}`);
      socket.join(`session_${sessionId}_${role}`);
      socket.emit('joined_session_room', { sessionId, role });
    });
  });
}

module.exports = registerSocketHandlers;
