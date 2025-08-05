// Persistent Metaverse Server for 3D Interactive Website
// Maintains world state, object positions, user avatars, and shared experiences

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

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

// ===== PERSISTENT WORLD STATE =====
const worldState = {
  objects: new Map(),     // 3D object positions/rotations/scales
  users: new Map(),       // Active user avatars
  sharedScreen: null,     // Current screen sharing state
  chatHistory: [],        // Chat messages
  roomSettings: {
    lighting: { ambient: 0.3, directional: 0.8 },
    environment: 'room1'
  },
  visitorCount: 0,        // Total unique visitors
  uniqueVisitors: new Set() // Track unique visitor IDs
};

// Data persistence file path
const DATA_DIR = path.join(__dirname, 'data');
const VISITOR_DATA_FILE = path.join(DATA_DIR, 'visitor-stats.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
};

// Save visitor statistics
const saveVisitorStats = async () => {
  try {
    const stats = {
      visitorCount: worldState.visitorCount,
      uniqueVisitors: Array.from(worldState.uniqueVisitors),
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(VISITOR_DATA_FILE, JSON.stringify(stats, null, 2));
    console.log('💾 Visitor stats saved - Total visitors:', worldState.visitorCount);
  } catch (error) {
    console.error('Error saving visitor stats:', error);
  }
};

// Load visitor statistics
const loadVisitorStats = async () => {
  try {
    const data = await fs.readFile(VISITOR_DATA_FILE, 'utf8');
    const stats = JSON.parse(data);
    worldState.visitorCount = stats.visitorCount || 0;
    worldState.uniqueVisitors = new Set(stats.uniqueVisitors || []);
    console.log('📂 Visitor stats loaded - Total visitors:', worldState.visitorCount);
  } catch (error) {
    console.log('📂 No existing visitor stats found, starting fresh');
    worldState.visitorCount = 0;
    worldState.uniqueVisitors = new Set();
  }
};

// Simulate database (in production, use Railway PostgreSQL)
const saveWorldState = () => {
  // In production: save to Railway database
  console.log('💾 World state saved - Objects:', worldState.objects.size, 'Users:', worldState.users.size);
  saveVisitorStats(); // Also save visitor stats
};

const loadWorldState = async () => {
  // In production: load from Railway database
  console.log('📂 World state loaded');
  await loadVisitorStats(); // Also load visitor stats
};

// ===== WORLD STATE API ENDPOINTS =====
app.get('/api/world-state', (req, res) => {
  res.json({
    objects: Array.from(worldState.objects.entries()),
    users: Array.from(worldState.users.entries()),
    sharedScreen: worldState.sharedScreen,
    chatHistory: worldState.chatHistory.slice(-10),
    roomSettings: worldState.roomSettings,
    activeUsers: worldState.users.size,
    visitorCount: worldState.visitorCount
  });
});

app.get('/api/users', (req, res) => {
  res.json({
    count: worldState.users.size,
    users: Array.from(worldState.users.entries())
  });
});

app.get('/api/objects', (req, res) => {
  res.json({
    count: worldState.objects.size,
    objects: Array.from(worldState.objects.entries())
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Persistent Metaverse Server Online',
    worldState: {
      users: worldState.users.size,
      objects: worldState.objects.size,
      sharedScreen: !!worldState.sharedScreen,
      chatMessages: worldState.chatHistory.length,
      visitorCount: worldState.visitorCount
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

io.on('connection', (socket) => {
  console.log('👥 User connected:', socket.id);

  // Track unique visitor
  if (!worldState.uniqueVisitors.has(socket.id)) {
    worldState.uniqueVisitors.add(socket.id);
    worldState.visitorCount++;
    saveVisitorStats(); // Save the updated count
    
    // Broadcast updated visitor count to all users
    io.emit('visitor-count-update', { visitorCount: worldState.visitorCount });
    console.log('🎉 New visitor! Total visitors:', worldState.visitorCount);
  }

  // Send current world state to new user
  socket.emit('world-state', {
    objects: Array.from(worldState.objects.entries()),
    users: Array.from(worldState.users.entries()),
    sharedScreen: worldState.sharedScreen,
    chatHistory: worldState.chatHistory.slice(-10), // Last 10 messages
    roomSettings: worldState.roomSettings,
    visitorCount: worldState.visitorCount
  });

  // ===== USER AVATAR MANAGEMENT =====
  socket.on('user-spawn', (data) => {
    const userAvatar = {
      id: socket.id,
      position: data.position || { x: 0, y: 0, z: 0 },
      rotation: data.rotation || { x: 0, y: 0, z: 0 },
      username: data.username || `User${socket.id.substr(0,4)}`,
      customAvatarUrl: data.customAvatarUrl || null,
      joinedAt: new Date()
    };

    worldState.users.set(socket.id, userAvatar);
    
    // Notify all users of new avatar
    io.emit('user-joined', userAvatar);
    
    // Removed verbose spawning log
  });

  // ===== REAL-TIME POSITION UPDATES =====
  socket.on('user-move', (data) => {
    if (worldState.users.has(socket.id)) {
      const user = worldState.users.get(socket.id);
      user.position = data.position;
      user.rotation = data.rotation;
      
      // Broadcast to all other users
      socket.broadcast.emit('user-moved', {
        userId: socket.id,
        position: data.position,
        rotation: data.rotation
      });
    }
  });

  // ===== USER NAME CHANGES =====
  socket.on('user-name-change', (data) => {
    if (worldState.users.has(socket.id)) {
      const user = worldState.users.get(socket.id);
      const oldName = user.username;
      user.username = data.newName;
      
      console.log(`📝 User ${socket.id} changed name from "${oldName}" to "${data.newName}"`);
      
      // Broadcast name change to all users (including sender for confirmation)
      io.emit('user-name-changed', {
        userId: socket.id,
        oldName: oldName,
        newName: data.newName
      });
      
      saveWorldState();
    }
  });

  // ===== CUSTOM AVATAR UPDATES =====
  socket.on('user-avatar-update', (data) => {
    if (worldState.users.has(socket.id)) {
      const user = worldState.users.get(socket.id);
      user.customAvatarUrl = data.customAvatarUrl;
      
      // Log size info if available
      const sizeInfo = data.customAvatarUrl ? 
        ` (size: ${(data.customAvatarUrl.length / 1024).toFixed(2)}KB)` : '';
      console.log(`🎭 User ${socket.id} updated their avatar${sizeInfo}`);
      
      // Broadcast avatar update to all OTHER users (not sender)
      socket.broadcast.emit('user-avatar-updated', {
        userId: socket.id,
        customAvatarUrl: data.customAvatarUrl,
        position: user.position,
        rotation: user.rotation
      });
      
      saveWorldState();
    }
  });

  // ===== PERSISTENT OBJECT INTERACTIONS =====
  socket.on('object-add', (data) => {
    // Save new object permanently
    worldState.objects.set(data.objectId, {
      name: data.name,
      type: data.type,
      position: data.position,
      rotation: data.rotation,
      scale: data.scale,
      addedBy: socket.id,
      addedAt: new Date()
    });

    // Notify all other users of new object
    socket.broadcast.emit('object-added', {
      objectId: data.objectId,
      name: data.name,
      type: data.type,
      position: data.position,
      rotation: data.rotation,
      scale: data.scale,
      addedBy: socket.id
    });

    saveWorldState();
    console.log(`📦 Object ${data.objectId} (${data.name}) added by ${socket.id}`);
  });

  socket.on('object-move', (data) => {
    // Get existing object data or create new entry
    const existingObject = worldState.objects.get(data.objectId) || {};
    
    // Update object position permanently, preserving other properties
    worldState.objects.set(data.objectId, {
      ...existingObject,  // Preserve name, type, etc.
      position: data.position,
      rotation: data.rotation,
      scale: data.scale,
      movedBy: socket.id,
      movedAt: new Date()
    });

    // Notify all users of object change
    io.emit('object-moved', {
      objectId: data.objectId,
      position: data.position,
      rotation: data.rotation,
      scale: data.scale,
      movedBy: socket.id
    });

    saveWorldState(); // Persist to database
    console.log(`📦 Object ${data.objectId} moved by ${socket.id}`);
  });

  socket.on('object-delete', (data) => {
    // Remove object permanently
    worldState.objects.delete(data.objectId);

    // Notify all users of object deletion
    io.emit('object-deleted', {
      objectId: data.objectId,
      deletedBy: socket.id
    });

    saveWorldState();
    console.log(`🗑️ Object ${data.objectId} deleted by ${socket.id}`);
  });



  // ===== PERSISTENT SCREEN SHARING =====
  socket.on('screen-share-start', (data) => {
    worldState.sharedScreen = {
      userId: socket.id,
      startedAt: new Date(),
      streamId: data.streamId,
      hasAudio: data.hasAudio,
      isVideoFile: data.isVideoFile,
      fileName: data.fileName
    };

    // Apply screen to SHARESCREEN-HERE object for everyone
    io.emit('screen-share-started', {
      userId: socket.id,
      streamId: data.streamId,
      applyToObject: 'SHARESCREEN-HERE',
      hasAudio: data.hasAudio,
      isVideoFile: data.isVideoFile,
      fileName: data.fileName
    });

    if (data.isVideoFile) {
      console.log(`📹 ${socket.id} started video file sharing: ${data.fileName}`);
    } else {
      console.log(`📺 ${socket.id} started screen sharing`);
    }
  });

  socket.on('screen-share-stop', () => {
    if (worldState.sharedScreen?.userId === socket.id) {
      worldState.sharedScreen = null;
      
      io.emit('screen-share-stopped', {
        userId: socket.id,
        clearObject: 'SHARESCREEN-HERE'
      });
    }
  });

  // ===== VOICE CHAT COORDINATION (WebRTC P2P for audio only) =====
  socket.on('webrtc-offer', (data) => {
    socket.to(data.to).emit('webrtc-offer', {
      from: socket.id,
      offer: data.offer
    });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.to).emit('webrtc-answer', {
      from: socket.id,
      answer: data.answer
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.to).emit('webrtc-ice-candidate', {
      from: socket.id,
      candidate: data.candidate
    });
  });

  // ===== CHAT SYSTEM =====
  socket.on('chat-message', (data) => {
    const chatMessage = {
      id: Date.now(),
      userId: socket.id,
      username: worldState.users.get(socket.id)?.username || 'Unknown',
      message: data.message,
      timestamp: new Date()
    };

    worldState.chatHistory.push(chatMessage);
    
    // Keep only last 100 messages
    if (worldState.chatHistory.length > 100) {
      worldState.chatHistory.shift();
    }

    io.emit('chat-message', chatMessage);
    saveWorldState();
  });

  // ===== WORLD SETTINGS =====
  socket.on('change-lighting', (data) => {
    worldState.roomSettings.lighting = data.lighting;
    io.emit('lighting-changed', data.lighting);
    saveWorldState();
  });

  socket.on('change-environment', (data) => {
    worldState.roomSettings.environment = data.environment;
    io.emit('environment-changed', data.environment);
    saveWorldState();
  });

  // ===== DISCONNECT HANDLING =====
  socket.on('disconnect', () => {
    console.log(`👋 User disconnected: ${socket.id}`);
    
    // Remove user from world state
    if (worldState.users.has(socket.id)) {
      const user = worldState.users.get(socket.id);
      worldState.users.delete(socket.id);
      
      // Notify others that user left
      socket.broadcast.emit('user-left', {
        userId: socket.id,
        username: user.username
      });
      
      console.log(`🗑️ Removed ${user.username} from world state`);
    }
    
    // If this user was sharing screen, stop it
    if (worldState.sharedScreen?.userId === socket.id) {
      worldState.sharedScreen = null;
      io.emit('screen-share-stopped', {
        userId: socket.id,
        clearObject: 'SHARESCREEN-HERE'
      });
      console.log(`📺 Screen sharing stopped - user ${socket.id} disconnected`);
    }
    
    saveWorldState();
  });
});

// ===== WORLD STATE CLEANUP =====
// Clean up stale data every 10 minutes
setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  
  // Clean up old chat messages (keep last 100)
  if (worldState.chatHistory.length > 100) {
    const removed = worldState.chatHistory.length - 100;
    worldState.chatHistory = worldState.chatHistory.slice(-100);
    cleaned += removed;
  }
  
  // Clean up objects not moved in 24 hours (optional)
  for (const [objectId, objectData] of worldState.objects.entries()) {
    if (objectData.movedAt && (now - new Date(objectData.movedAt)) > 24 * 60 * 60 * 1000) {
      // Optionally remove old objects
      // worldState.objects.delete(objectId);
      // cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} stale items from world state`);
    saveWorldState();
  }
}, 10 * 60 * 1000);

// Initialize server and load visitor stats
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`WebRTC Signaling Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  
  // Load visitor statistics on startup
  await ensureDataDir();
  await loadWorldState();
});

module.exports = server;