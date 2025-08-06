# GLB Object Persistence Implementation Plan

## Current State Analysis

Based on the codebase review, here's what currently happens with GLB objects:

### Current Issues:
1. **No GLB Data Persistence**: When a user uploads a GLB file, only the object's position/rotation/scale is sent to the server via `object-add` event, but NOT the actual GLB model data
2. **Local-Only Models**: GLB files are loaded locally in each user's browser and not shared
3. **No Model Reconstruction**: When new users join, they receive object metadata but cannot reconstruct the 3D models without the original GLB data
4. **Missing on Refresh**: When users refresh the page, all GLB models disappear

## Solution Architecture

### Option 1: Base64 Data URL Storage (Recommended for Small Models)
**Best for**: Models under 5MB
**Pros**: Simple implementation, works with current architecture
**Cons**: Limited to smaller models, increases memory usage

### Option 2: Cloud Storage with URLs (Recommended for Production)
**Best for**: All model sizes, production environments
**Pros**: Scalable, efficient, supports large models
**Cons**: Requires external storage service

### Option 3: Hybrid Approach (Best Overall)
**Best for**: Mixed use cases
**Implementation**: Use Base64 for small models (<2MB), cloud storage for larger ones

## Implementation Plan - Phase 1: Base64 Storage

### 1. Client-Side Changes (index.html)

#### A. Modify GLB Loading Function
```javascript
async function loadGLBModel(file) {
  // Convert file to base64 data URL
  const reader = new FileReader();
  reader.onload = async function(e) {
    const dataUrl = e.target.result;
    
    // Load the model locally first
    const loader = new GLTFLoader();
    loader.load(dataUrl, function(gltf) {
      const model = gltf.scene;
      
      // Position and configure model
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);
      
      // Generate unique ID
      const objectId = `glb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store metadata
      model.userData = {
        name: file.name,
        type: 'glb-model',
        objectId: objectId,
        modelDataUrl: dataUrl, // Store the base64 data
        fileSize: file.size,
        originalPosition: model.position.clone(),
        originalScale: model.scale.clone(),
        originalRotation: model.rotation.clone()
      };
      
      // Add to scene
      scene.add(model);
      sceneObjects.push(model);
      
      // Send to server with model data
      if (socket && socket.connected) {
        socket.emit('glb-model-add', {
          objectId: objectId,
          name: file.name,
          modelDataUrl: dataUrl,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          fileSize: file.size
        });
      }
    });
  };
  reader.readAsDataURL(file);
}
```

#### B. Handle Incoming GLB Models from Server
```javascript
socket.on('glb-model-added', (data) => {
  // Don't re-add if we're the sender
  if (data.addedBy === socket.id) return;
  
  // Load the model from base64 data
  const loader = new GLTFLoader();
  loader.load(data.modelDataUrl, function(gltf) {
    const model = gltf.scene;
    
    // Apply saved transform
    model.position.set(data.position.x, data.position.y, data.position.z);
    model.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    model.scale.set(data.scale.x, data.scale.y, data.scale.z);
    
    // Store metadata
    model.userData = {
      name: data.name,
      type: 'glb-model',
      objectId: data.objectId,
      modelDataUrl: data.modelDataUrl,
      originalPosition: model.position.clone(),
      originalScale: model.scale.clone(),
      originalRotation: model.rotation.clone()
    };
    
    // Add to scene
    scene.add(model);
    sceneObjects.push(model);
    
    console.log(`✅ Loaded GLB model from ${data.addedBy}: ${data.name}`);
  });
});
```

#### C. Handle World State with GLB Models
```javascript
socket.on('world-state', (worldData) => {
  // Load all GLB models from world state
  if (worldData.glbModels) {
    worldData.glbModels.forEach(([objectId, modelData]) => {
      loadGLBFromWorldState(objectId, modelData);
    });
  }
  
  // ... existing world state handling
});

function loadGLBFromWorldState(objectId, modelData) {
  const loader = new GLTFLoader();
  loader.load(modelData.modelDataUrl, function(gltf) {
    const model = gltf.scene;
    
    model.position.set(modelData.position.x, modelData.position.y, modelData.position.z);
    model.rotation.set(modelData.rotation.x, modelData.rotation.y, modelData.rotation.z);
    model.scale.set(modelData.scale.x, modelData.scale.y, modelData.scale.z);
    
    model.userData = {
      name: modelData.name,
      type: 'glb-model',
      objectId: objectId,
      modelDataUrl: modelData.modelDataUrl,
      originalPosition: new THREE.Vector3(modelData.position.x, modelData.position.y, modelData.position.z),
      originalScale: new THREE.Vector3(modelData.scale.x, modelData.scale.y, modelData.scale.z),
      originalRotation: new THREE.Euler(modelData.rotation.x, modelData.rotation.y, modelData.rotation.z)
    };
    
    scene.add(model);
    sceneObjects.push(model);
  });
}
```

### 2. Server-Side Changes (signaling-server.js)

#### A. Add GLB Model Storage
```javascript
// Add to worldState object
const worldState = {
  objects: new Map(),     // Generic objects
  glbModels: new Map(),   // GLB models with base64 data
  users: new Map(),
  sharedScreen: null,
  chatHistory: [],
  roomSettings: {
    lighting: { ambient: 0.3, directional: 0.8 },
    environment: 'room1'
  }
};
```

#### B. Handle GLB Model Events
```javascript
socket.on('glb-model-add', (data) => {
  // Size check (limit to 10MB for base64)
  if (data.fileSize > 10 * 1024 * 1024) {
    socket.emit('error', { 
      message: 'Model too large. Maximum size is 10MB.' 
    });
    return;
  }
  
  // Store GLB model with full data
  worldState.glbModels.set(data.objectId, {
    name: data.name,
    modelDataUrl: data.modelDataUrl,
    position: data.position,
    rotation: data.rotation,
    scale: data.scale,
    fileSize: data.fileSize,
    addedBy: socket.id,
    addedAt: new Date()
  });
  
  // Broadcast to all other users
  socket.broadcast.emit('glb-model-added', {
    objectId: data.objectId,
    name: data.name,
    modelDataUrl: data.modelDataUrl,
    position: data.position,
    rotation: data.rotation,
    scale: data.scale,
    addedBy: socket.id
  });
  
  console.log(`📦 GLB model ${data.name} (${data.fileSize} bytes) added by ${socket.id}`);
  saveWorldState();
});

// Modify world-state emission to include GLB models
socket.emit('world-state', {
  objects: Array.from(worldState.objects.entries()),
  glbModels: Array.from(worldState.glbModels.entries()),
  users: Array.from(worldState.users.entries()),
  sharedScreen: worldState.sharedScreen,
  chatHistory: worldState.chatHistory.slice(-10),
  roomSettings: worldState.roomSettings
});

// Handle GLB model updates (position/rotation/scale)
socket.on('glb-model-update', (data) => {
  const model = worldState.glbModels.get(data.objectId);
  if (model) {
    model.position = data.position;
    model.rotation = data.rotation;
    model.scale = data.scale;
    model.movedBy = socket.id;
    model.movedAt = new Date();
    
    // Broadcast update to all users
    io.emit('glb-model-updated', {
      objectId: data.objectId,
      position: data.position,
      rotation: data.rotation,
      scale: data.scale,
      movedBy: socket.id
    });
    
    saveWorldState();
  }
});

// Handle GLB model deletion
socket.on('glb-model-delete', (data) => {
  if (worldState.glbModels.has(data.objectId)) {
    worldState.glbModels.delete(data.objectId);
    
    io.emit('glb-model-deleted', {
      objectId: data.objectId,
      deletedBy: socket.id
    });
    
    console.log(`🗑️ GLB model ${data.objectId} deleted by ${socket.id}`);
    saveWorldState();
  }
});
```

### 3. Database Persistence (Optional but Recommended)

#### A. SQLite Schema Addition
```sql
CREATE TABLE IF NOT EXISTS glb_models (
  id TEXT PRIMARY KEY,
  space_name TEXT NOT NULL,
  name TEXT NOT NULL,
  model_data TEXT NOT NULL,  -- Base64 data
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  position_z REAL DEFAULT 0,
  rotation_x REAL DEFAULT 0,
  rotation_y REAL DEFAULT 0,
  rotation_z REAL DEFAULT 0,
  scale_x REAL DEFAULT 1,
  scale_y REAL DEFAULT 1,
  scale_z REAL DEFAULT 1,
  file_size INTEGER,
  added_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### B. Save/Load Functions
```javascript
const saveGLBModel = (objectId, modelData) => {
  db.run(`
    INSERT OR REPLACE INTO glb_models 
    (id, space_name, name, model_data, position_x, position_y, position_z,
     rotation_x, rotation_y, rotation_z, scale_x, scale_y, scale_z,
     file_size, added_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    objectId, SPACE_NAME, modelData.name, modelData.modelDataUrl,
    modelData.position.x, modelData.position.y, modelData.position.z,
    modelData.rotation.x, modelData.rotation.y, modelData.rotation.z,
    modelData.scale.x, modelData.scale.y, modelData.scale.z,
    modelData.fileSize, modelData.addedBy
  ]);
};

const loadGLBModels = async () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM glb_models WHERE space_name = ?`,
      [SPACE_NAME],
      (err, rows) => {
        if (err) reject(err);
        else {
          const models = new Map();
          rows.forEach(row => {
            models.set(row.id, {
              name: row.name,
              modelDataUrl: row.model_data,
              position: { x: row.position_x, y: row.position_y, z: row.position_z },
              rotation: { x: row.rotation_x, y: row.rotation_y, z: row.rotation_z },
              scale: { x: row.scale_x, y: row.scale_y, z: row.scale_z },
              fileSize: row.file_size,
              addedBy: row.added_by,
              addedAt: row.created_at
            });
          });
          resolve(models);
        }
      }
    );
  });
};
```

## Implementation Plan - Phase 2: Cloud Storage (Future Enhancement)

### For Production Scale:
1. **Use S3/Cloudflare R2** for model storage
2. **Generate signed URLs** for secure access
3. **Implement CDN** for fast global delivery
4. **Add model compression** before upload
5. **Implement progressive loading** for large models

### Architecture:
```
User Upload → Compress → Upload to S3 → Store URL in DB → Broadcast URL to users → Users fetch from CDN
```

## Testing Plan

1. **Single User Test**: Upload GLB, refresh page, verify model persists
2. **Multi-User Test**: User A uploads, User B sees model immediately
3. **Late Join Test**: User C joins after upload, sees all models
4. **Movement Sync Test**: User A moves model, all users see update
5. **Deletion Test**: User deletes model, removed for all users
6. **Size Limit Test**: Try uploading >10MB file, verify rejection
7. **Performance Test**: Load 10+ models, check frame rate

## Performance Considerations

1. **Model Size Limits**: 
   - Base64: Max 10MB per model
   - Total scene: Max 50MB of models
   
2. **Optimization Strategies**:
   - Compress GLB files before upload
   - Use Draco compression for geometry
   - Implement LOD (Level of Detail) system
   - Lazy load models based on camera distance
   
3. **Memory Management**:
   - Dispose of Three.js geometries/materials when removing models
   - Implement model cache with LRU eviction
   - Monitor browser memory usage

## Security Considerations

1. **File Validation**:
   - Check file extension (.glb, .gltf only)
   - Validate MIME type
   - Scan for malicious content
   
2. **Size Limits**:
   - Client-side: Pre-check before upload
   - Server-side: Enforce strict limits
   
3. **Rate Limiting**:
   - Max 10 model uploads per user per minute
   - Max 100 models per space

## Migration Path

### From Current State to Phase 1:
1. Deploy server changes first (backward compatible)
2. Update client to send both old and new events
3. Migrate existing objects to new system
4. Remove old event handlers

### From Phase 1 to Phase 2:
1. Add cloud storage service
2. Update upload flow to use cloud
3. Migrate existing base64 models to cloud
4. Keep base64 as fallback

## Rollback Plan

If issues arise:
1. Server can ignore new GLB events
2. Client can fall back to local-only models
3. Database changes are non-destructive
4. Version flag can toggle features

## Success Metrics

- ✅ Models persist across page refreshes
- ✅ New users see all existing models
- ✅ Model positions sync in real-time
- ✅ <3 second load time for average model
- ✅ Support for 20+ concurrent users
- ✅ 99% uptime for model availability