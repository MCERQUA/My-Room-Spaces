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

// Store the main shared room and users
const MAIN_ROOM = 'MAIN_SHARED_ROOM';
const mainRoom = {
  id: MAIN_ROOM,
  users: [],
  created: new Date()
};
const users = new Map();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'WebRTC Signaling Server Online',
    mainRoom: {
      users: mainRoom.users.length,
      created: mainRoom.created
    },
    totalUsers: users.size,
    timestamp: new Date().toISOString()
  });
});

// Get main room info endpoint
app.get('/room', (req, res) => {
  res.json({
    id: MAIN_ROOM,
    users: mainRoom.users.length,
    created: mainRoom.created,
    maxUsers: 4
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  users.set(socket.id, {
    id: socket.id,
    room: null,
    connected: new Date()
  });

  // Join the main shared room
  socket.on('join-main-room', () => {
    if (mainRoom.users.length >= 4) {
      socket.emit('room-error', 'Main room is full (max 4 users)');
      return;
    }

    // Check if user is already in room
    if (mainRoom.users.includes(socket.id)) {
      socket.emit('room-error', 'Already in main room');
      return;
    }

    mainRoom.users.push(socket.id);
    socket.join(MAIN_ROOM);
    
    const user = users.get(socket.id);
    user.room = MAIN_ROOM;

    // Notify user they joined
    socket.emit('room-joined', {
      roomId: MAIN_ROOM,
      users: mainRoom.users,
      isMainRoom: true
    });

    // Notify others in room
    socket.to(MAIN_ROOM).emit('user-joined', {
      roomId: MAIN_ROOM,
      newUserId: socket.id,
      users: mainRoom.users
    });

    console.log(`User ${socket.id} joined main room. Total users: ${mainRoom.users.length}`);
  });

  // Leave main room
  socket.on('leave-main-room', () => {
    leaveMainRoom(socket.id);
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
    if (user && user.room === MAIN_ROOM) {
      leaveMainRoom(socket.id);
    }
    users.delete(socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });

  function leaveMainRoom(userId) {
    if (!mainRoom.users.includes(userId)) return;

    mainRoom.users = mainRoom.users.filter(id => id !== userId);
    
    // Notify others in main room
    socket.to(MAIN_ROOM).emit('user-left', {
      roomId: MAIN_ROOM,
      userId: userId,
      users: mainRoom.users
    });

    socket.leave(MAIN_ROOM);
    console.log(`User ${userId} left main room. Remaining: ${mainRoom.users.length}`);
  }
});

// Clean up disconnected users from main room every 5 minutes
setInterval(() => {
  // Remove any users that are no longer connected
  const connectedUserIds = Array.from(users.keys());
  const originalCount = mainRoom.users.length;
  mainRoom.users = mainRoom.users.filter(userId => connectedUserIds.includes(userId));
  
  if (mainRoom.users.length !== originalCount) {
    console.log(`Cleaned up main room: ${originalCount - mainRoom.users.length} disconnected users removed`);
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebRTC Signaling Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
});

module.exports = server;