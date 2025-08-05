// Persistent Metaverse Server for 3D Interactive Website
// Maintains world state, object positions, user avatars, and shared experiences

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

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

// Environment configuration
const SPACE_NAME = process.env.SPACE_NAME || 'main-world';

// Database setup for persistent visitor tracking
const DB_DIR = process.env.DB_DIR || './data';
const DB_PATH = path.join(DB_DIR, 'visitors.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`📁 Created database directory: ${DB_DIR}`);
}

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
  } else {
    console.log(`✅ Connected to SQLite database at ${DB_PATH}`);
  }
});

// Create tables if they don't exist
db.serialize(() => {
  // Visitor tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      space_name TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      first_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(space_name, visitor_id)
    )
  `, (err) => {
    if (err) console.error('Error creating visitors table:', err);
    else console.log('✅ Visitors table ready');
  });

  // Space statistics table
  db.run(`
    CREATE TABLE IF NOT EXISTS space_stats (
      space_name TEXT PRIMARY KEY,
      total_visitors INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating space_stats table:', err);
    else console.log('✅ Space stats table ready');
  });

  // Initialize space if it doesn't exist
  db.run(`
    INSERT OR IGNORE INTO space_stats (space_name, total_visitors) 
    VALUES (?, 0)
  `, [SPACE_NAME], (err) => {
    if (err) console.error('Error initializing space:', err);
    else console.log(`✅ Space "${SPACE_NAME}" initialized`);
  });
});

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
  visitorCount: 0,        // Total unique visitors (will be fetched from Cloudflare)
  spaceName: SPACE_NAME   // The name of this space
};

// Database functions for persistent visitor tracking
const getVisitorCount = () => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT total_visitors FROM space_stats WHERE space_name = ?`,
      [SPACE_NAME],
      (err, row) => {
        if (err) {
          console.error('❌ Error fetching visitor count:', err);
          resolve(0);
        } else {
          const count = row ? row.total_visitors : 0;
          console.log(`📊 Visitor count for ${SPACE_NAME}: ${count}`);
          resolve(count);
        }
      }
    );
  });
};

const recordVisitor = (visitorId) => {
  return new Promise((resolve, reject) => {
    // First, check if visitor already exists
    db.get(
      `SELECT visitor_id FROM visitors WHERE space_name = ? AND visitor_id = ?`,
      [SPACE_NAME, visitorId],
      (err, row) => {
        if (err) {
          console.error('❌ Error checking visitor:', err);
          resolve({ visitorCount: worldState.visitorCount, isNewVisitor: false });
          return;
        }

        if (row) {
          // Existing visitor - update last visit
          db.run(
            `UPDATE visitors SET last_visit = CURRENT_TIMESTAMP WHERE space_name = ? AND visitor_id = ?`,
            [SPACE_NAME, visitorId],
            (err) => {
              if (err) console.error('Error updating visitor:', err);
            }
          );
          resolve({ visitorCount: worldState.visitorCount, isNewVisitor: false });
        } else {
          // New visitor - insert and update count
          db.run(
            `INSERT INTO visitors (space_name, visitor_id) VALUES (?, ?)`,
            [SPACE_NAME, visitorId],
            (err) => {
              if (err) {
                console.error('Error inserting visitor:', err);
                resolve({ visitorCount: worldState.visitorCount, isNewVisitor: false });
                return;
              }

              // Update total visitor count
              db.run(
                `UPDATE space_stats 
                 SET total_visitors = total_visitors + 1, 
                     last_updated = CURRENT_TIMESTAMP 
                 WHERE space_name = ?`,
                [SPACE_NAME],
                async (err) => {
                  if (err) {
                    console.error('Error updating visitor count:', err);
                  }
                  
                  // Get updated count
                  const newCount = await getVisitorCount();
                  worldState.visitorCount = newCount;
                  console.log(`🎉 New visitor! Total visitors for ${SPACE_NAME}: ${newCount}`);
                  
                  resolve({
                    visitorCount: newCount,
                    isNewVisitor: true,
                    message: 'New visitor recorded in database'
                  });
                }
              );
            }
          );
        }
      }
    );
  });
};

// Space initialization is handled by the database setup above

// Simulate database (in production, use Railway PostgreSQL)
const saveWorldState = () => {
  // In production: save to Railway database
  console.log('💾 World state saved - Objects:', worldState.objects.size, 'Users:', worldState.users.size);
};

const loadWorldState = async () => {
  // Load visitor count from database
  worldState.visitorCount = await getVisitorCount();
  console.log(`📊 Loaded visitor count for space ${SPACE_NAME}: ${worldState.visitorCount}`);
  
  // In production: load other world state from database
  console.log('📂 World state loaded');
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

// Get visitor statistics from database
app.get('/api/visitor-stats', async (req, res) => {
  try {
    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM space_stats WHERE space_name = ?`,
        [SPACE_NAME],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    const recentVisitors = await new Promise((resolve, reject) => {
      db.all(
        `SELECT visitor_id, first_visit, last_visit 
         FROM visitors 
         WHERE space_name = ? 
         ORDER BY last_visit DESC 
         LIMIT 10`,
        [SPACE_NAME],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    res.json({
      space: SPACE_NAME,
      totalVisitors: stats ? stats.total_visitors : 0,
      createdAt: stats ? stats.created_at : null,
      lastUpdated: stats ? stats.last_updated : null,
      recentVisitors: recentVisitors,
      databasePath: DB_PATH
    });
  } catch (error) {
    console.error('Error fetching visitor stats:', error);
    res.status(500).json({ error: 'Failed to fetch visitor statistics' });
  }
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

io.on('connection', async (socket) => {
  console.log('👥 User connected:', socket.id);

  // Track unique visitor with Cloudflare Worker
  const visitorData = await recordVisitor(socket.id);
  if (visitorData) {
    worldState.visitorCount = visitorData.visitorCount;
    
    // Broadcast updated visitor count to all users
    io.emit('visitor-count-update', { 
      visitorCount: worldState.visitorCount,
      spaceName: worldState.spaceName 
    });
    
    if (visitorData.isNewVisitor) {
      console.log(`🎉 New visitor to space ${SPACE_NAME}! Total visitors: ${worldState.visitorCount}`);
    }
  }

  // Send current world state to new user
  socket.emit('world-state', {
    objects: Array.from(worldState.objects.entries()),
    users: Array.from(worldState.users.entries()),
    sharedScreen: worldState.sharedScreen,
    chatHistory: worldState.chatHistory.slice(-10), // Last 10 messages
    roomSettings: worldState.roomSettings,
    visitorCount: worldState.visitorCount,
    spaceName: worldState.spaceName
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
    console.log(`🧑 User spawned: ${userAvatar.username} (${socket.id}), Total users: ${worldState.users.size}`);
    
    // Notify all users of new avatar
    io.emit('user-joined', userAvatar);
    
    // Send updated user count to all
    io.emit('user-count-update', { count: worldState.users.size });
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
      console.log(`👥 User removed: ${user.username}, Remaining users: ${worldState.users.size}`);
      
      // Notify others that user left
      socket.broadcast.emit('user-left', {
        userId: socket.id,
        username: user.username
      });
      
      // Send updated user count to all
      io.emit('user-count-update', { count: worldState.users.size });
      
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
  console.log(`\n🌍 3D World Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Space name: ${SPACE_NAME}`);
  console.log(`Database: ${DB_PATH}`);
  
  // Load visitor statistics and world state from database
  await loadWorldState();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing database and server...');
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database closed');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing database and server...');
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database closed');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

module.exports = server;