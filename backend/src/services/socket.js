let io = null;

function initSocket(server, corsOptions) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: corsOptions,
  });

  io.on('connection', (socket) => {
    const orgId = socket.handshake.query?.org_id;
    if (orgId) {
      socket.join(`org:${orgId}`);
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
