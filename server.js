const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuid } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Allow requests from the React app
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store rooms: { roomId: { id, displayName, password, createdAt, expiresAt, participants: { userId: { role, socketId, joinedAt } }, messages: [], lastActivity } }
const rooms = new Map();

app.use(express.static('build'));

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createRoom', ({ roomId, displayName, password }, callback) => {
    if (rooms.has(roomId)) {
      return callback({ error: 'Room already exists' });
    }
    rooms.set(roomId, {
      id: roomId,
      displayName,
      password,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour expiry
      participants: {},
      messages: [], // Messages and notifications
      lastActivity: Date.now(),
    });
    callback({ success: true });
  });

  socket.on('joinRoom', ({ roomId, role, userId }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('roomNotFound', { message: 'Room does not exist' });

    // Check for duplicate roles among active participants
    const roles = Object.values(room.participants).map((p) => p.role);
    const anonymousCount = roles.filter((r) => r === 'anonymous').length;
    const ownerCount = roles.filter((r) => r === 'owner').length;

    if ((role === 'anonymous' && anonymousCount > 0) || (role === 'owner' && ownerCount > 0)) {
      socket.emit('roomFull', { message: 'This room already has a user with your role.' });
      return;
    }

    socket.join(roomId);
    room.participants[userId] = { role, socketId: socket.id, joinedAt: Date.now() };
    room.lastActivity = Date.now();

    // Add join notification to messages
    const notification = {
      type: 'notification',
      id: `join-${userId}-${Date.now()}-${uuid()}`, // Use uuid for better uniqueness
      message: `${role === 'anonymous' ? 'Anonymous User' : 'Car Owner'} joined the room`,
      timestamp: Date.now(),
      serverTimestamp: Date.now(),
    };
    room.messages.push(notification);
    room.messages.sort((a, b) => (a.serverTimestamp || a.timestamp) - (b.serverTimestamp || b.timestamp));

    io.to(roomId).emit('roomUpdated', room);
    io.to(roomId).emit('receiveMessage', notification);
    console.log(`User ${role} (${userId}) joined room ${roomId}, participants: ${JSON.stringify(Object.keys(room.participants))}`);
  });

  socket.on('sendMessage', (messageData, callback) => {
    const { roomId, role, message, createdAt } = messageData;
    const room = rooms.get(roomId);
    if (!room) return callback({ error: 'Room does not exist' });

    const messageId = uuid();
    const serverTimestamp = Date.now();
    const messageObj = { type: 'message', messageId, roomId, role, message, createdAt, serverTimestamp };
    room.messages.push(messageObj);
    room.messages.sort((a, b) => (a.serverTimestamp || a.timestamp) - (b.serverTimestamp || b.timestamp));
    room.lastActivity = serverTimestamp;

    io.to(roomId).emit('receiveMessage', messageObj);
    console.log(`Message sent to room ${roomId} by ${role}: ${message} (ID: ${messageId}, Timestamp: ${serverTimestamp})`);
    callback({ success: true, messageId });
  });

  socket.on('leaveRoom', ({ roomId, role, userId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    delete room.participants[userId];
    socket.leave(roomId);
    room.lastActivity = Date.now();

    const notification = {
      type: 'notification',
      id: `leave-${userId}-${Date.now()}-${uuid()}`, // Use uuid for better uniqueness
      message: `${role === 'anonymous' ? 'Anonymous User' : 'Car Owner'} left the room`,
      timestamp: Date.now(),
      serverTimestamp: Date.now(),
    };
    room.messages.push(notification);
    room.messages.sort((a, b) => (a.serverTimestamp || a.timestamp) - (b.serverTimestamp || b.timestamp));

    io.to(roomId).emit('roomUpdated', room);
    io.to(roomId).emit('receiveMessage', notification);
    console.log(`User ${role} (${userId}) left room ${roomId}, participants: ${JSON.stringify(Object.keys(room.participants))}`);
  });

  socket.on('getMessages', ({ roomId }, callback) => {
    const room = rooms.get(roomId);
    if (room) {
      room.messages.sort((a, b) => (a.serverTimestamp || a.timestamp) - (b.serverTimestamp || b.timestamp));
      callback(room.messages);
    } else {
      callback([]);
    }
  });

  socket.on('getRooms', (callback) => {
    callback(Array.from(rooms.values()));
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const [roomId, room] of rooms.entries()) {
      const userId = Object.keys(room.participants).find(
        (uid) => room.participants[uid].socketId === socket.id
      );
      if (userId) {
        const { role } = room.participants[userId];
        delete room.participants[userId];
        room.lastActivity = Date.now();

        const notification = {
          type: 'notification',
          id: `leave-${userId}-${Date.now()}-${uuid()}`, // Use uuid for better uniqueness
          message: `${role === 'anonymous' ? 'Anonymous User' : 'Car Owner'} left the room`,
          timestamp: Date.now(),
          serverTimestamp: Date.now(),
        };
        room.messages.push(notification);
        room.messages.sort((a, b) => (a.serverTimestamp || a.timestamp) - (b.serverTimestamp || b.timestamp));

        io.to(roomId).emit('roomUpdated', room);
        io.to(roomId).emit('receiveMessage', notification);
        console.log(`User ${role} (${userId}) disconnected from room ${roomId}, participants: ${JSON.stringify(Object.keys(room.participants))}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3031;
server.listen(PORT, () => {
  console.log(`Socket.IO server listening at http://localhost:${PORT}`);
});