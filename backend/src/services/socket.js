let io = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');
  const config = require('../config');
  io = new Server(server);

  io.on('connection', (socket) => {
    // Authenticate socket via accessToken cookie
    const token = socket.handshake.headers.cookie
      ?.split(';')
      ?.find((c) => c.trim().startsWith('accessToken='))
      ?.split('=')[1];

    if (!token) {
      socket.emit('auth_error', { message: 'Authentication failed. Please log in again.' });
      setTimeout(() => socket.disconnect(true), 1000);
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      socket.join(`org:${decoded.org_id}`);
    } catch {
      socket.emit('auth_error', { message: 'Authentication failed. Please log in again.' });
      setTimeout(() => socket.disconnect(true), 1000);
      return;
    }

    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conv:${conversationId}`);
      }
    });

    socket.on('disconnect', () => {
      // cleanup handled automatically by socket.io
    });
  });

  return io;
}

function emitToOrg(orgId, event, payload) {
  if (!io) return;
  io.to(`org:${orgId}`).emit(event, payload);
}

function emitToConversation(orgId, conversationId, event, payload) {
  if (!io) return;
  io.to(`conv:${conversationId}`).emit(event, payload);
}

function getIO() {
  return io;
}

module.exports = {
  initSocket,
  emitToOrg,
  emitToConversation,
  getIO,
};
