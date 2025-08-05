// Persistent Metaverse Server for 3D Interactive Website
// Maintains world state, object positions, user avatars, and shared experiences

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

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

// Cloudflare Worker API endpoint for visitor tracking
const VISITOR_COUNTER_API = process.env.VISITOR_COUNTER_API || 'https://visitor-counter.YOUR-SUBDOMAIN.workers.dev';
const SPACE_NAME = process.env.SPACE_NAME || 'main-world';

// Check if using default API (not configured)
if (VISITOR_COUNTER_API.includes('YOUR-SUBDOMAIN')) {
  console.warn('⚠️  WARNING: Using default Cloudflare Worker URL. Please set VISITOR_COUNTER_API environment variable!');
  console.warn('⚠️  Visitor counting will not work until you deploy the Cloudflare Worker and set the URL.');
}

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

// Cloudflare Worker API functions
const getVisitorCount = async () => {
  // Skip if using default URL
  if (VISITOR_COUNTER_API.includes('YOUR-SUBDOMAIN')) {
    return worldState.visitorCount || 0;
  }
  
  try {
    console.log(`📊 Fetching visitor count from: ${VISITOR_COUNTER_API}/api/space/${SPACE_NAME}`);
    const response = await fetch(`${VISITOR_COUNTER_API}/api/space/${SPACE_NAME}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Visitor count fetched:`, data);
      return data.visitorCount || 0;
    } else {
      console.error(`❌ Failed to fetch visitor count: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Error fetching visitor count:', error.message);
  }
  return 0;
};

const recordVisitor = async (visitorId) => {
  // Skip if using default URL
  if (VISITOR_COUNTER_API.includes('YOUR-SUBDOMAIN')) {
    // Use local counting as fallback
    if (!worldState.localVisitors) {
      worldState.localVisitors = new Set();
    }
    
    if (!worldState.localVisitors.has(visitorId)) {
      worldState.localVisitors.add(visitorId);
      worldState.visitorCount = worldState.localVisitors.size;
      return {
        visitorCount: worldState.visitorCount,
        isNewVisitor: true,
        message: 'Local visitor tracking (Cloudflare Worker not configured)'
      };
    }
    return {
      visitorCount: worldState.visitorCount,
      isNewVisitor: false
    };
  }
  
  try {
    console.log(`📊 Recording visitor ${visitorId} to: ${VISITOR_COUNTER_API}/api/space/visit`);
    const response = await fetch(`${VISITOR_COUNTER_API}/api/space/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceName: SPACE_NAME, visitorId })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Visitor recorded for space ${SPACE_NAME}:`, data);
      return data;
    } else {
      console.error(`❌ Failed to record visitor: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Error recording visitor:', error.message);
  }
  return null;
};

const createSpaceIfNeeded = async () => {
  // Skip if using default URL
  if (VISITOR_COUNTER_API.includes('YOUR-SUBDOMAIN')) {
    console.log('⚠️  Skipping space creation - Cloudflare Worker not configured');
    return;
  }
  
  try {
    console.log(`🔍 Checking if space exists: ${VISITOR_COUNTER_API}/api/space/${SPACE_NAME}`);
    // First check if space exists
    const checkResponse = await fetch(`${VISITOR_COUNTER_API}/api/space/${SPACE_NAME}`);
    
    if (checkResponse.status === 404 || !checkResponse.ok) {
      console.log(`📦 Space ${SPACE_NAME} not found, creating...`);
      // Create the space
      const createResponse = await fetch(`${VISITOR_COUNTER_API}/api/space/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceName: SPACE_NAME })
      });
      
      if (createResponse.ok) {
        console.log(`✅ Created new space: ${SPACE_NAME}`);
      } else {
        console.error(`❌ Failed to create space: ${createResponse.status} ${createResponse.statusText}`);
      }
    } else {
      console.log(`✅ Space ${SPACE_NAME} already exists`);
    }
  } catch (error) {
    console.error('❌ Error checking/creating space:', error.message);
  }
};

// Simulate database (in production, use Railway PostgreSQL)
const saveWorldState = () => {
  // In production: save to Railway database
  console.log('💾 World state saved - Objects:', worldState.objects.size, 'Users:', worldState.users.size);
};

const loadWorldState = async () => {
  // In production: load from Railway database
  console.log('📂 World state loaded');
  
  // Load visitor count from Cloudflare
  worldState.visitorCount = await getVisitorCount();
  console.log(`📊 Loaded visitor count for space ${SPACE_NAME}: ${worldState.visitorCount}`);
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
  console.log(`Space name: ${SPACE_NAME}`);
  console.log(`Visitor API: ${VISITOR_COUNTER_API}`);
  
  // Create space if needed and load visitor statistics
  await createSpaceIfNeeded();
  await loadWorldState();
});

module.exports = server;