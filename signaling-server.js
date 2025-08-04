// Simple WebRTC Signaling Server for 3D Interactive Website
// Deploy this to Heroku, Railway, or any Node.js hosting service

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store rooms and users
const rooms = new Map();
const users = new Map();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'WebRTC Signaling Server Online',
    rooms: rooms.size,
    users: users.size,
    timestamp: new Date().toISOString()
  });
});

// Get room info endpoint
app.get('/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    users: room.users.length,
    created: room.created
  }));
  res.json(roomList);
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  users.set(socket.id, {
    id: socket.id,
    room: null,
    connected: new Date()
  });

  // Create a new room
  socket.on('create-room', (roomId) => {
    if (rooms.has(roomId)) {
      socket.emit('room-error', 'Room already exists');
      return;
    }

    const room = {
      id: roomId,
      host: socket.id,
      users: [socket.id],
      created: new Date()
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    
    const user = users.get(socket.id);
    user.room = roomId;
    
    socket.emit('room-created', roomId);
    console.log(`Room created: ${roomId} by ${socket.id}`);
  });

  // Join an existing room
  socket.on('join-room', (roomId) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('room-error', 'Room not found');
      return;
    }

    if (room.users.length >= 4) {
      socket.emit('room-error', 'Room is full (max 4 users)');
      return;
    }

    room.users.push(socket.id);
    socket.join(roomId);
    
    const user = users.get(socket.id);
    user.room = roomId;

    // Notify user they joined
    socket.emit('room-joined', {
      roomId: roomId,
      users: room.users,
      host: room.host
    });

    // Notify others in room
    socket.to(roomId).emit('user-joined', {
      roomId: roomId,
      newUserId: socket.id,
      users: room.users
    });

    console.log(`User ${socket.id} joined room ${roomId}. Total users: ${room.users.length}`);
  });

  // Leave room
  socket.on('leave-room', (roomId) => {
    leaveRoom(socket.id, roomId);
  });

  // Forward WebRTC signaling data
  socket.on('signal', (data) => {
    socket.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user && user.room) {
      leaveRoom(socket.id, user.room);
    }
    users.delete(socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });

  function leaveRoom(userId, roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.users = room.users.filter(id => id !== userId);
    
    // Notify others in room
    socket.to(roomId).emit('user-left', {
      roomId: roomId,
      userId: userId,
      users: room.users
    });

    // If room is empty, delete it
    if (room.users.length === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    } else if (room.host === userId && room.users.length > 0) {
      // Transfer host to next user
      room.host = room.users[0];
      socket.to(roomId).emit('host-changed', {
        roomId: roomId,
        newHost: room.host
      });
      console.log(`Host transferred in room ${roomId} to ${room.host}`);
    }

    socket.leave(roomId);
    console.log(`User ${userId} left room ${roomId}. Remaining: ${room.users.length}`);
  }
});

// Clean up empty rooms every 10 minutes
setInterval(() => {
  const now = new Date();
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.length === 0 || (now - room.created) > 24 * 60 * 60 * 1000) {
      rooms.delete(roomId);
      console.log(`Cleaned up room: ${roomId}`);
    }
  }
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebRTC Signaling Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
});

module.exports = server;