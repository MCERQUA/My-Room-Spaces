// Persistent Metaverse Server for 3D Interactive Website
// PostgreSQL version - maintains world state, object positions, user avatars, and shared experiences

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const { Pool } = require('pg');
const fs = require('fs');

// GLB Upload System Dependencies
const AWS = require('aws-sdk');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.r2.cloudflarestorage.com"],
      connectSrc: ["'self'", "wss:", "https://*.r2.cloudflarestorage.com"]
    }
  }
}));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests from this IP'
});
app.use(globalLimiter);

// GLB Upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per window
  message: 'Too many uploads, try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://threedworld:ThreeD2024WorldSecure@127.0.0.1:5432/threedworld',
  max: parseInt(process.env.DATABASE_POOL_SIZE) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database at', new Date(res.rows[0].now).toISOString());
  }
});

// R2 Configuration (S3-compatible)
const r2 = new AWS.S3({
  endpoint: `https://${process.env.R2_ACCOUNT_ID || 'demo'}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto'
});

// File upload middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'model/gltf-binary' || 
        file.originalname.toLowerCase().endsWith('.glb')) {
      cb(null, true);
    } else {
      cb(new Error('Only GLB files allowed'), false);
    }
  }
});

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.body.userId;
  const sessionToken = req.headers['authorization'];
  
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }
  
  // For MVP: simple user ID validation
  // In production: validate session token
  req.userId = userId;
  next();
};

// GLB validation function
const validateGLBFile = async (buffer) => {
  try {
    // Check GLB magic number (first 4 bytes should be "glTF")
    const magic = buffer.slice(0, 4).toString();
    if (magic !== 'glTF') {
      throw new Error('Invalid GLB file format');
    }
    
    // Check file structure integrity
    const version = buffer.readUInt32LE(4);
    const length = buffer.readUInt32LE(8);
    
    if (version !== 2) {
      throw new Error('Unsupported GLB version');
    }
    
    if (length !== buffer.length) {
      throw new Error('Corrupted GLB file');
    }
    
    // Parse and validate JSON chunk
    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonChunk = buffer.slice(20, 20 + jsonChunkLength);
    const gltfData = JSON.parse(jsonChunk.toString());
    
    // Security checks
    if (gltfData.meshes && gltfData.meshes.length > 100) {
      throw new Error('Too many meshes (max 100)');
    }
    
    // Check for excessive polygon count
    const totalPrimitives = gltfData.meshes?.reduce((sum, mesh) => 
      sum + (mesh.primitives?.length || 0), 0) || 0;
    
    if (totalPrimitives > 1000) {
      throw new Error('Too many primitives (max 1000)');
    }
    
    return { valid: true, metadata: gltfData };
    
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Environment configuration
const SPACE_NAME = process.env.SPACE_NAME || 'main-world';

// Helper function to track visitor
async function trackVisitor(spaceName, visitorId) {
  try {
    // Update or insert visitor record
    const result = await pool.query(`
      INSERT INTO visitors (space_name, visitor_id, first_visit, last_visit)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (space_name, visitor_id) 
      DO UPDATE SET last_visit = CURRENT_TIMESTAMP
      RETURNING *
    `, [spaceName, visitorId]);

    // Update space stats
    const statsResult = await pool.query(`
      INSERT INTO space_stats (space_name, total_visits, unique_visitors)
      VALUES ($1, 1, 1)
      ON CONFLICT (space_name)
      DO UPDATE SET 
        total_visits = space_stats.total_visits + 1,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
    `, [spaceName]);

    // Count unique visitors
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT visitor_id) as unique_visitors
      FROM visitors
      WHERE space_name = $1
    `, [spaceName]);

    // Update unique visitors count
    await pool.query(`
      UPDATE space_stats 
      SET unique_visitors = $1
      WHERE space_name = $2
    `, [countResult.rows[0].unique_visitors, spaceName]);

    return {
      isNew: result.rows[0].first_visit === result.rows[0].last_visit,
      stats: statsResult.rows[0]
    };
  } catch (error) {
    console.error('Error tracking visitor:', error);
    return null;
  }
}

// Get visitor count for a space
async function getVisitorCount(spaceName) {
  try {
    const result = await pool.query(`
      SELECT unique_visitors, total_visits 
      FROM space_stats 
      WHERE space_name = $1
    `, [spaceName]);

    if (result.rows.length > 0) {
      return result.rows[0].unique_visitors || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting visitor count:', error);
    return 0;
  }
}

// Persistent world state for each space
const worldStates = new Map();

// Initialize or get world state for a space
function getWorldState(spaceName) {
  if (!worldStates.has(spaceName)) {
    worldStates.set(spaceName, {
      objects: new Map(),
      users: new Map(),
      sharedScreen: null,
      screenShareUserId: null,
      messages: []
    });
  }
  return worldStates.get(spaceName);
}

// Load world objects from database
async function loadWorldObjects(spaceName) {
  try {
    const result = await pool.query(`
      SELECT * FROM world_objects 
      WHERE space_name = $1
    `, [spaceName]);

    const worldState = getWorldState(spaceName);
    result.rows.forEach(row => {
      worldState.objects.set(row.object_id, {
        objectId: row.object_id,
        type: row.object_type,
        position: { x: row.position_x, y: row.position_y, z: row.position_z },
        rotation: { x: row.rotation_x, y: row.rotation_y, z: row.rotation_z },
        scale: { x: row.scale_x, y: row.scale_y, z: row.scale_z },
        metadata: row.metadata
      });
    });

    console.log(`✅ Loaded ${result.rows.length} objects for space: ${spaceName}`);
  } catch (error) {
    console.error('Error loading world objects:', error);
  }
}

// Save world object to database
async function saveWorldObject(spaceName, objectData) {
  try {
    await pool.query(`
      INSERT INTO world_objects (
        object_id, space_name, object_type,
        position_x, position_y, position_z,
        rotation_x, rotation_y, rotation_z,
        scale_x, scale_y, scale_z,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (object_id) DO UPDATE SET
        position_x = $4, position_y = $5, position_z = $6,
        rotation_x = $7, rotation_y = $8, rotation_z = $9,
        scale_x = $10, scale_y = $11, scale_z = $12,
        metadata = $13,
        updated_at = CURRENT_TIMESTAMP
    `, [
      objectData.objectId, spaceName, objectData.type || 'model',
      objectData.position.x, objectData.position.y, objectData.position.z,
      objectData.rotation.x, objectData.rotation.y, objectData.rotation.z,
      objectData.scale.x, objectData.scale.y, objectData.scale.z,
      JSON.stringify(objectData.metadata || {})
    ]);
  } catch (error) {
    console.error('Error saving world object:', error);
  }
}

// Delete world object from database
async function deleteWorldObject(objectId) {
  try {
    await pool.query('DELETE FROM world_objects WHERE object_id = $1', [objectId]);
  } catch (error) {
    console.error('Error deleting world object:', error);
  }
}

// Load chat messages from database
async function loadChatMessages(spaceName, limit = 50) {
  try {
    const result = await pool.query(`
      SELECT * FROM chat_messages 
      WHERE space_name = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [spaceName, limit]);

    return result.rows.reverse().map(row => ({
      userId: row.user_id,
      username: row.username,
      message: row.message,
      timestamp: row.created_at
    }));
  } catch (error) {
    console.error('Error loading chat messages:', error);
    return [];
  }
}

// Save chat message to database
async function saveChatMessage(spaceName, messageData) {
  try {
    await pool.query(`
      INSERT INTO chat_messages (space_name, user_id, username, message)
      VALUES ($1, $2, $3, $4)
    `, [spaceName, messageData.userId, messageData.username, messageData.message]);
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
}

// Initialize world states on server start
async function initializeWorlds() {
  const spaces = ['main-world', 'Game-Room', 'Social-Space', 'Creative-Studio'];
  for (const space of spaces) {
    await loadWorldObjects(space);
    const messages = await loadChatMessages(space);
    const worldState = getWorldState(space);
    worldState.messages = messages;
  }
}

// Initialize on startup
initializeWorlds();

// Socket.IO connection handling
io.on('connection', (socket) => {
  let currentUserId = null;
  let currentSpaceName = SPACE_NAME;
  let currentUserData = null;

  socket.on('join-world', async (data) => {
    currentUserId = data.userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    currentSpaceName = data.spaceName || SPACE_NAME;
    currentUserData = {
      userId: currentUserId,
      username: data.username || 'Anonymous',
      position: data.position || { x: 0, y: 2, z: 0 },
      rotation: data.rotation || { x: 0, y: 0, z: 0 }
    };

    // Join the space room
    socket.join(currentSpaceName);
    
    // Track visitor
    const visitorResult = await trackVisitor(currentSpaceName, currentUserId);
    
    // Get world state
    const worldState = getWorldState(currentSpaceName);
    
    // Add user to world state
    worldState.users.set(currentUserId, {
      ...currentUserData,
      socketId: socket.id
    });

    // Send world state to new user
    socket.emit('world-state', {
      objects: Array.from(worldState.objects.values()),
      users: Array.from(worldState.users.values()),
      sharedScreen: worldState.sharedScreen,
      screenShareUserId: worldState.screenShareUserId,
      messages: worldState.messages,
      visitorCount: await getVisitorCount(currentSpaceName)
    });

    // Notify others of new user
    socket.to(currentSpaceName).emit('user-joined', currentUserData);

    // Log session
    await pool.query(`
      INSERT INTO user_sessions (user_id, socket_id, space_name, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      currentUserId, 
      socket.id, 
      currentSpaceName,
      socket.handshake.address,
      socket.handshake.headers['user-agent']
    ]);

    console.log(`👤 User ${currentUserId} joined ${currentSpaceName} (Total users: ${worldState.users.size})`);
  });

  // Handle user movement
  socket.on('user-move', (data) => {
    if (!currentUserId || !currentSpaceName) return;
    
    const worldState = getWorldState(currentSpaceName);
    const user = worldState.users.get(currentUserId);
    if (user) {
      user.position = data.position;
      user.rotation = data.rotation;
      socket.to(currentSpaceName).emit('user-move', {
        userId: currentUserId,
        position: data.position,
        rotation: data.rotation
      });
    }
  });

  // Handle object operations
  socket.on('object-add', async (data) => {
    if (!currentSpaceName) return;
    
    const worldState = getWorldState(currentSpaceName);
    const objectData = {
      ...data,
      objectId: data.objectId || `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    worldState.objects.set(objectData.objectId, objectData);
    await saveWorldObject(currentSpaceName, objectData);
    
    io.to(currentSpaceName).emit('object-add', objectData);
    console.log(`🎯 Object added to ${currentSpaceName}: ${objectData.objectId}`);
  });

  socket.on('object-move', async (data) => {
    if (!currentSpaceName) return;
    
    const worldState = getWorldState(currentSpaceName);
    const object = worldState.objects.get(data.objectId);
    if (object) {
      object.position = data.position;
      object.rotation = data.rotation;
      object.scale = data.scale;
      
      await saveWorldObject(currentSpaceName, object);
      socket.to(currentSpaceName).emit('object-move', data);
    }
  });

  socket.on('object-delete', async (data) => {
    if (!currentSpaceName) return;
    
    const worldState = getWorldState(currentSpaceName);
    worldState.objects.delete(data.objectId);
    await deleteWorldObject(data.objectId);
    
    io.to(currentSpaceName).emit('object-delete', data);
    console.log(`🗑️ Object deleted from ${currentSpaceName}: ${data.objectId}`);
  });

  // Handle chat messages
  socket.on('chat-message', async (data) => {
    if (!currentUserId || !currentSpaceName) return;
    
    const worldState = getWorldState(currentSpaceName);
    const user = worldState.users.get(currentUserId);
    if (!user) return;

    const messageData = {
      userId: currentUserId,
      username: user.username,
      message: data.message,
      timestamp: new Date().toISOString()
    };

    worldState.messages.push(messageData);
    if (worldState.messages.length > 100) {
      worldState.messages.shift();
    }

    await saveChatMessage(currentSpaceName, messageData);
    
    io.to(currentSpaceName).emit('chat-message', messageData);
    console.log(`💬 Chat in ${currentSpaceName}: ${user.username}: ${data.message}`);
  });

  // Handle screen sharing
  socket.on('screen-share-started', (data) => {
    if (!currentUserId || !currentSpaceName) return;
    
    const worldState = getWorldState(currentSpaceName);
    worldState.sharedScreen = true;
    worldState.screenShareUserId = currentUserId;
    
    socket.to(currentSpaceName).emit('screen-share-started', {
      userId: currentUserId,
      username: worldState.users.get(currentUserId)?.username
    });
    
    console.log(`📺 Screen share started in ${currentSpaceName} by ${currentUserId}`);
  });

  socket.on('screen-share-stopped', () => {
    if (!currentUserId || !currentSpaceName) return;
    
    const worldState = getWorldState(currentSpaceName);
    worldState.sharedScreen = null;
    worldState.screenShareUserId = null;
    
    socket.to(currentSpaceName).emit('screen-share-stopped', {
      userId: currentUserId
    });
    
    console.log(`📺 Screen share stopped in ${currentSpaceName}`);
  });

  // Handle WebRTC signaling
  socket.on('webrtc-offer', (data) => {
    socket.to(data.targetUserId).emit('webrtc-offer', {
      offer: data.offer,
      userId: currentUserId
    });
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.targetUserId).emit('webrtc-answer', {
      answer: data.answer,
      userId: currentUserId
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.targetUserId).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      userId: currentUserId
    });
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    if (!currentUserId || !currentSpaceName) return;
    
    const worldState = getWorldState(currentSpaceName);
    worldState.users.delete(currentUserId);
    
    // Update session disconnect time
    await pool.query(`
      UPDATE user_sessions 
      SET disconnected_at = CURRENT_TIMESTAMP 
      WHERE socket_id = $1
    `, [socket.id]);
    
    // If user was screen sharing, stop it
    if (worldState.screenShareUserId === currentUserId) {
      worldState.sharedScreen = null;
      worldState.screenShareUserId = null;
      io.to(currentSpaceName).emit('screen-share-stopped', {
        userId: currentUserId
      });
    }
    
    socket.to(currentSpaceName).emit('user-left', { userId: currentUserId });
    console.log(`👤 User ${currentUserId} left ${currentSpaceName} (Remaining users: ${worldState.users.size})`);
  });
});

// API Endpoints

// Health check
app.get('/', (req, res) => {
  const spaces = Array.from(worldStates.keys());
  const totalUsers = spaces.reduce((sum, space) => 
    sum + getWorldState(space).users.size, 0);
  const totalObjects = spaces.reduce((sum, space) => 
    sum + getWorldState(space).objects.size, 0);

  res.json({
    status: 'operational',
    server: 'PostgreSQL Persistent World Server',
    database: 'PostgreSQL',
    spaces: spaces.length,
    totalUsers,
    totalObjects,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Get world state for a space
app.get('/api/world-state/:spaceName', async (req, res) => {
  const { spaceName } = req.params;
  const worldState = getWorldState(spaceName);
  
  res.json({
    spaceName,
    objects: Array.from(worldState.objects.values()),
    users: Array.from(worldState.users.values()),
    sharedScreen: worldState.sharedScreen,
    messages: worldState.messages,
    visitorCount: await getVisitorCount(spaceName)
  });
});

// Get visitor statistics
app.get('/api/stats/:spaceName', async (req, res) => {
  const { spaceName } = req.params;
  
  try {
    const statsResult = await pool.query(`
      SELECT * FROM space_stats WHERE space_name = $1
    `, [spaceName]);
    
    const recentVisitors = await pool.query(`
      SELECT COUNT(*) as recent_count 
      FROM visitors 
      WHERE space_name = $1 
      AND last_visit > NOW() - INTERVAL '24 hours'
    `, [spaceName]);
    
    res.json({
      spaceName,
      stats: statsResult.rows[0] || { unique_visitors: 0, total_visits: 0 },
      recentVisitors: parseInt(recentVisitors.rows[0]?.recent_count || 0)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Visitor counter endpoint (Cloudflare compatibility)
app.post('/api/visitor-counter/:spaceName', async (req, res) => {
  const { spaceName } = req.params;
  const { visitorId } = req.body;
  
  if (!visitorId) {
    return res.status(400).json({ error: 'Visitor ID required' });
  }
  
  const result = await trackVisitor(spaceName, visitorId);
  const count = await getVisitorCount(spaceName);
  
  res.json({
    success: true,
    count,
    isNewVisitor: result?.isNew || false
  });
});

// Get visitor count
app.get('/api/visitor-count/:spaceName', async (req, res) => {
  const { spaceName } = req.params;
  const count = await getVisitorCount(spaceName);
  
  res.json({
    spaceName,
    count,
    timestamp: new Date().toISOString()
  });
});

// GLB Upload endpoint
app.post('/api/upload-glb', 
  uploadLimiter,
  authenticateUser,
  upload.single('glb'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Validate GLB file
      const validation = await validateGLBFile(req.file.buffer);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Invalid GLB file',
          details: validation.error 
        });
      }

      // Generate unique filename
      const fileId = uuidv4();
      const fileName = `${fileId}.glb`;
      const key = `models/${req.userId}/${fileName}`;

      // Upload to R2
      const uploadParams = {
        Bucket: process.env.R2_BUCKET || '3d-world-models',
        Key: key,
        Body: req.file.buffer,
        ContentType: 'model/gltf-binary',
        Metadata: {
          userId: req.userId,
          originalName: req.file.originalname,
          uploadTime: new Date().toISOString()
        }
      };

      const uploadResult = await r2.upload(uploadParams).promise();

      // Generate public URL
      const publicUrl = `https://${process.env.R2_PUBLIC_URL || 'assets.example.com'}/${key}`;

      res.json({
        success: true,
        fileId,
        url: publicUrl,
        metadata: validation.metadata,
        size: req.file.size
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        error: 'Upload failed',
        details: error.message 
      });
    }
  }
);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
🌐 =============================================
🚀 PostgreSQL Persistent World Server Running
📍 Port: ${PORT}
🗄️  Database: PostgreSQL
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Features: World State, Visitor Tracking, Chat
🔄 Real-time: Socket.IO enabled
🔒 CORS: Enabled for all origins
⏰ Started: ${new Date().toISOString()}
=============================================
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await pool.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...');
  await pool.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});