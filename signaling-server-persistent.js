// Enhanced Persistent Metaverse Server with Database Integration
// Full persistence layer with PostgreSQL, Redis caching, and batch processing

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');

// GLB Upload System Dependencies
const AWS = require('aws-sdk');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Persistence Layer Dependencies
const PersistenceLayer = require('./persistence/PersistenceLayer');
const CacheManager = require('./persistence/CacheManager');
const BatchProcessor = require('./persistence/BatchProcessor');

// Initialize Express and Socket.IO
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

// ==================== PERSISTENCE CONFIGURATION ====================

// Feature flags
const PERSISTENCE_ENABLED = process.env.PERSISTENCE_ENABLED !== 'false';
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const BATCH_PROCESSING_ENABLED = process.env.BATCH_PROCESSING_ENABLED !== 'false';

// Initialize persistence layer
let persistence = null;
let cache = null;
let batchProcessor = null;

if (PERSISTENCE_ENABLED) {
  console.log('🔧 Initializing persistence layer...');
  
  persistence = new PersistenceLayer({
    databaseUrl: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE) || 20,
    ssl: process.env.DATABASE_SSL !== 'false'
  });
  
  if (CACHE_ENABLED) {
    console.log('🔧 Initializing cache manager...');
    cache = new CacheManager({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      cluster: process.env.REDIS_CLUSTER === 'true'
    });
  }
  
  if (BATCH_PROCESSING_ENABLED && persistence && cache) {
    console.log('🔧 Initializing batch processor...');
    batchProcessor = new BatchProcessor(persistence, cache, {
      batchSize: parseInt(process.env.BATCH_SIZE) || 100,
      flushInterval: parseInt(process.env.BATCH_FLUSH_INTERVAL) || 100
    });
  }
}

// ==================== R2 CONFIGURATION ====================

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

// ==================== WORLD STATE MANAGEMENT ====================

// In-memory world state (fallback when persistence is disabled)
let worldState = {
  objects: new Map(),
  users: new Map(),
  uploadedModels: new Map(),
  chatHistory: [],
  sharedScreen: null,
  visitorCount: 0,
  spaces: new Map([['main', { 
    name: 'main', 
    createdAt: new Date(), 
    settings: {}
  }]])
};

// Load world state from database on startup
async function initializeWorldState() {
  if (!PERSISTENCE_ENABLED || !persistence) {
    console.log('💾 Using in-memory world state');
    return;
  }
  
  try {
    await persistence.connect();
    
    // Get or create default space
    const space = await persistence.getOrCreateSpace('main');
    console.log(`✅ Connected to space: ${space.name}`);
    
    // Load cached or fresh world state
    let loadedState = null;
    
    if (cache) {
      loadedState = await cache.getCachedWorldState(space.id);
      if (loadedState) {
        console.log('✅ Loaded world state from cache');
      }
    }
    
    if (!loadedState) {
      loadedState = await persistence.loadWorldState(space.id);
      console.log('✅ Loaded world state from database');
      
      // Cache for next time
      if (cache) {
        await cache.cacheWorldState(space.id, loadedState);
      }
    }
    
    // Convert to in-memory format
    if (loadedState.objects) {
      worldState.objects = new Map(Object.entries(loadedState.objects));
    }
    if (loadedState.uploadedModels) {
      worldState.uploadedModels = new Map(Object.entries(loadedState.uploadedModels));
    }
    if (loadedState.chatHistory) {
      worldState.chatHistory = loadedState.chatHistory;
    }
    
    console.log(`📊 Loaded ${worldState.objects.size} objects, ${worldState.uploadedModels.size} models`);
    
  } catch (error) {
    console.error('❌ Failed to initialize world state:', error);
    console.log('⚠️ Falling back to in-memory storage');
    PERSISTENCE_ENABLED = false;
  }
}

// Save world state periodically
async function saveWorldState() {
  if (!PERSISTENCE_ENABLED || !persistence) return;
  
  try {
    const stateToSave = {
      objects: Object.fromEntries(worldState.objects),
      uploadedModels: Object.fromEntries(worldState.uploadedModels),
      chatHistory: worldState.chatHistory.slice(-100) // Keep last 100 messages
    };
    
    await persistence.saveWorldState(stateToSave);
    
    // Update cache
    if (cache) {
      await cache.cacheWorldState('main', stateToSave);
    }
    
    console.log('✅ World state saved');
  } catch (error) {
    console.error('❌ Failed to save world state:', error);
  }
}

// ==================== SOCKET.IO CONNECTION HANDLING ====================

io.on('connection', async (socket) => {
  console.log('🔌 New connection:', socket.id);
  
  // Track connection in persistence
  let sessionId = null;
  let userId = null;
  
  // Handle user spawn with persistence
  socket.on('user-spawn', async (data) => {
    console.log('👤 User spawned:', data.username || 'Anonymous');
    
    userId = data.userId || uuidv4();
    const username = data.username || `User${Math.floor(Math.random() * 10000)}`;
    
    // Store user in world state
    const userData = {
      id: userId,
      socketId: socket.id,
      username: username,
      displayName: data.displayName || username,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      color: Math.random() * 0xffffff,
      joinedAt: new Date()
    };
    
    worldState.users.set(userId, userData);
    
    // Persist user session
    if (persistence) {
      try {
        await persistence.upsertUser({
          userId: userId,
          username: username,
          displayName: userData.displayName,
          avatarUrl: data.avatarUrl
        });
        
        const session = await persistence.createSession(userId, socket.id, 'main');
        sessionId = session.id;
      } catch (error) {
        console.error('Failed to persist user session:', error);
      }
    }
    
    // Cache user session
    if (cache) {
      await cache.setUserSession(userId, userData);
    }
    
    // Send world state to new user
    const stateToSend = {
      objects: Object.fromEntries(worldState.objects),
      uploadedModels: Object.fromEntries(worldState.uploadedModels),
      chatHistory: worldState.chatHistory.slice(-50),
      users: Object.fromEntries(worldState.users),
      sharedScreen: worldState.sharedScreen
    };
    
    socket.emit('world-state', stateToSend);
    
    // Notify other users
    socket.broadcast.emit('user-joined', userData);
    
    // Log event
    if (persistence) {
      await persistence.logEvent('user.join', { 
        userId, 
        username, 
        socketId: socket.id 
      });
    }
  });
  
  // Handle user movement with batch processing
  socket.on('user-move', async (data) => {
    if (!userId) return;
    
    const user = worldState.users.get(userId);
    if (user) {
      user.position = data.position;
      user.rotation = data.rotation;
      
      // Batch position updates
      if (batchProcessor) {
        batchProcessor.add('userPositions', {
          userId,
          position: data.position,
          rotation: data.rotation,
          spaceId: 'main'
        });
      } else if (persistence) {
        // Direct update if no batch processing
        await persistence.updateUserPosition(userId, data.position, data.rotation);
      }
      
      // Broadcast to other users
      socket.broadcast.emit('user-moved', {
        userId,
        position: data.position,
        rotation: data.rotation
      });
    }
  });
  
  // Handle object creation with persistence
  socket.on('object-add', async (data) => {
    console.log('➕ Object added:', data.name);
    
    const objectId = data.objectId || uuidv4();
    const objectData = {
      ...data,
      objectId,
      createdBy: userId,
      createdAt: new Date()
    };
    
    worldState.objects.set(objectId, objectData);
    
    // Persist object
    if (persistence) {
      try {
        await persistence.saveObject({
          ...objectData,
          spaceId: 'main'
        });
      } catch (error) {
        console.error('Failed to persist object:', error);
      }
    }
    
    // Cache object
    if (cache) {
      await cache.hset('object', 'main', objectId, objectData);
    }
    
    // Broadcast to all users
    io.emit('object-added', objectData);
    
    // Log event
    if (persistence) {
      await persistence.logEvent('object.create', { 
        objectId, 
        userId, 
        objectType: data.type 
      });
    }
  });
  
  // Handle object movement with batch processing
  socket.on('object-move', async (data) => {
    const object = worldState.objects.get(data.objectId);
    if (object) {
      object.position = data.position;
      object.rotation = data.rotation;
      object.scale = data.scale;
      
      // Batch object updates
      if (batchProcessor) {
        batchProcessor.add('objectUpdates', {
          objectId: data.objectId,
          position: data.position,
          rotation: data.rotation,
          scale: data.scale,
          updatedBy: userId,
          spaceId: 'main'
        });
      } else if (persistence) {
        // Direct update if no batch processing
        await persistence.updateObject(data.objectId, {
          position: data.position,
          rotation: data.rotation,
          scale: data.scale
        }, userId);
      }
      
      // Broadcast to other users
      socket.broadcast.emit('object-moved', data);
    }
  });
  
  // Handle object deletion with persistence
  socket.on('object-delete', async (data) => {
    console.log('➖ Object deleted:', data.objectId);
    
    if (worldState.objects.has(data.objectId)) {
      worldState.objects.delete(data.objectId);
      
      // Persist deletion
      if (persistence) {
        try {
          await persistence.deleteObject(data.objectId, userId);
        } catch (error) {
          console.error('Failed to delete object:', error);
        }
      }
      
      // Remove from cache
      if (cache) {
        await cache.delete('object', data.objectId);
      }
      
      // Broadcast to all users
      io.emit('object-deleted', { objectId: data.objectId });
    }
  });
  
  // Handle chat messages with persistence
  socket.on('chat-message', async (data) => {
    const user = worldState.users.get(userId);
    if (!user) return;
    
    const message = {
      id: uuidv4(),
      userId,
      username: user.username,
      message: data.message.substring(0, 200),
      timestamp: new Date()
    };
    
    worldState.chatHistory.push(message);
    if (worldState.chatHistory.length > 100) {
      worldState.chatHistory.shift();
    }
    
    // Batch chat messages
    if (batchProcessor) {
      batchProcessor.add('chatMessages', {
        ...message,
        spaceId: 'main'
      });
    } else if (persistence) {
      // Direct save if no batch processing
      await persistence.saveChatMessage(message);
    }
    
    // Broadcast to all users
    io.emit('chat-message', message);
  });
  
  // Handle screen sharing with persistence
  socket.on('screen-share-started', async (data) => {
    console.log('🖥️ Screen share started by:', data.username);
    
    worldState.sharedScreen = {
      userId,
      username: data.username,
      shareType: data.shareType || 'screen'
    };
    
    // Persist screen share session
    let shareId = null;
    if (persistence) {
      try {
        const share = await persistence.startScreenShare(userId, data.shareType);
        shareId = share.id;
      } catch (error) {
        console.error('Failed to persist screen share:', error);
      }
    }
    
    // Cache screen share state
    if (cache) {
      await cache.set('screenShare', 'main', worldState.sharedScreen, 300);
    }
    
    // Store share ID for later
    socket.shareId = shareId;
    
    // Notify all users
    io.emit('screen-share-started', worldState.sharedScreen);
  });
  
  socket.on('screen-share-stopped', async () => {
    console.log('🖥️ Screen share stopped');
    
    // End screen share session in database
    if (persistence && socket.shareId) {
      try {
        await persistence.endScreenShare(socket.shareId);
      } catch (error) {
        console.error('Failed to end screen share:', error);
      }
    }
    
    worldState.sharedScreen = null;
    
    // Clear from cache
    if (cache) {
      await cache.delete('screenShare', 'main');
    }
    
    io.emit('screen-share-stopped');
  });
  
  // Handle WebRTC signaling (unchanged)
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
  
  // Handle disconnection with persistence
  socket.on('disconnect', async () => {
    console.log('🔌 Disconnected:', socket.id);
    
    // Find and remove user
    let disconnectedUser = null;
    for (const [id, user] of worldState.users) {
      if (user.socketId === socket.id) {
        disconnectedUser = user;
        worldState.users.delete(id);
        
        // End session in database
        if (persistence) {
          try {
            await persistence.endSession(socket.id);
          } catch (error) {
            console.error('Failed to end session:', error);
          }
        }
        
        // Remove from cache
        if (cache) {
          await cache.removeUserSession(id);
        }
        
        // Notify other users
        socket.broadcast.emit('user-left', { userId: id });
        
        // Log event
        if (persistence) {
          await persistence.logEvent('user.leave', { 
            userId: id, 
            socketId: socket.id 
          });
        }
        
        break;
      }
    }
    
    // Clear screen share if this user was sharing
    if (worldState.sharedScreen && worldState.sharedScreen.userId === userId) {
      worldState.sharedScreen = null;
      io.emit('screen-share-stopped');
    }
  });
});

// ==================== REST API ENDPOINTS ====================

// Health check with persistence status
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
    persistence: {
      enabled: PERSISTENCE_ENABLED,
      database: false,
      cache: false
    },
    worldState: {
      users: worldState.users.size,
      objects: worldState.objects.size,
      models: worldState.uploadedModels.size,
      messages: worldState.chatHistory.length
    }
  };
  
  // Check database connection
  if (persistence) {
    try {
      await persistence.pool.query('SELECT 1');
      health.persistence.database = true;
    } catch (error) {
      health.persistence.database = false;
    }
  }
  
  // Check cache connection
  if (cache) {
    health.persistence.cache = await cache.ping();
  }
  
  // Get batch processor stats
  if (batchProcessor) {
    health.batchProcessor = batchProcessor.getStats();
  }
  
  res.json(health);
});

// Get world state snapshot
app.get('/api/world-state', async (req, res) => {
  const state = {
    objects: Object.fromEntries(worldState.objects),
    users: Object.fromEntries(worldState.users),
    models: Object.fromEntries(worldState.uploadedModels),
    chatHistory: worldState.chatHistory.slice(-50),
    sharedScreen: worldState.sharedScreen
  };
  
  res.json(state);
});

// Get space statistics
app.get('/api/statistics/:spaceId?', async (req, res) => {
  const spaceId = req.params.spaceId || 'main';
  
  if (!persistence) {
    return res.json({
      error: 'Persistence not enabled',
      inMemoryStats: {
        users: worldState.users.size,
        objects: worldState.objects.size,
        models: worldState.uploadedModels.size,
        messages: worldState.chatHistory.length
      }
    });
  }
  
  try {
    const stats = await persistence.getSpaceStatistics(spaceId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload GLB model endpoint
app.post('/api/upload-model', 
  uploadLimiter,
  authenticateUser,
  upload.single('model'),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const modelId = uuidv4();
      const key = `models/${modelId}.glb`;
      
      // Upload to R2
      const uploadParams = {
        Bucket: process.env.R2_BUCKET || '3d-world-models',
        Key: key,
        Body: file.buffer,
        ContentType: 'model/gltf-binary',
        Metadata: {
          originalName: file.originalname,
          uploadedBy: req.userId,
          uploadedAt: new Date().toISOString()
        }
      };
      
      await r2.upload(uploadParams).promise();
      
      const publicUrl = `https://${process.env.R2_PUBLIC_URL || 'assets.3dworld.com'}/${key}`;
      
      // Store model info
      const modelData = {
        modelId,
        name: req.body.name || file.originalname,
        originalFilename: file.originalname,
        r2Key: key,
        publicUrl,
        fileSize: file.size,
        format: 'glb',
        uploadedBy: req.userId,
        uploadedAt: new Date()
      };
      
      worldState.uploadedModels.set(modelId, modelData);
      
      // Persist model info
      if (persistence) {
        await persistence.saveUploadedModel(modelData);
      }
      
      // Cache model info
      if (cache) {
        await cache.hset('model', 'main', modelId, modelData);
      }
      
      // Broadcast new model to all users
      io.emit('model-uploaded', modelData);
      
      res.json({
        success: true,
        modelId,
        publicUrl,
        message: 'Model uploaded successfully'
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload model' });
    }
  }
);

// Get uploaded models
app.get('/api/models', async (req, res) => {
  const models = Array.from(worldState.uploadedModels.values());
  res.json(models);
});

// ==================== PERIODIC TASKS ====================

// Save world state every 5 minutes
setInterval(saveWorldState, 5 * 60 * 1000);

// Refresh materialized views every hour
if (persistence) {
  setInterval(async () => {
    await persistence.refreshMaterializedViews();
  }, 60 * 60 * 1000);
}

// Database cleanup every 24 hours
if (persistence) {
  setInterval(async () => {
    await persistence.cleanup();
  }, 24 * 60 * 60 * 1000);
}

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 3001;

async function startServer() {
  // Initialize world state from database
  await initializeWorldState();
  
  // Start listening
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       🚀 Persistent 3D World Server Started                 ║
║                                                              ║
║       Port: ${PORT}                                         ║
║       Persistence: ${PERSISTENCE_ENABLED ? '✅ Enabled' : '❌ Disabled'}                     ║
║       Cache: ${CACHE_ENABLED ? '✅ Enabled' : '❌ Disabled'}                           ║
║       Batch Processing: ${BATCH_PROCESSING_ENABLED ? '✅ Enabled' : '❌ Disabled'}               ║
║                                                              ║
║       Health Check: http://localhost:${PORT}/health         ║
║       World State: http://localhost:${PORT}/api/world-state ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 SIGTERM received, shutting down gracefully...');
  
  // Flush batch processor
  if (batchProcessor) {
    await batchProcessor.shutdown();
  }
  
  // Save final world state
  await saveWorldState();
  
  // Close database connection
  if (persistence) {
    await persistence.disconnect();
  }
  
  // Close cache connection
  if (cache) {
    await cache.disconnect();
  }
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});