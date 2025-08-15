# User-Uploaded GLB Implementation Plan

## Executive Summary

This document outlines the implementation plan for enabling users to upload GLB files to the 3D multi-user world, with persistent storage and real-time synchronization across all connected users. Based on comprehensive research of storage solutions, current system architecture, and best practices for 3D model streaming.

## Current System Analysis

### Existing Object System (Railway Backend)
- **Server-Authoritative Architecture**: Objects stored in `worldState.objects` Map
- **Real-time Synchronization**: Socket.IO events (`object-add`, `object-move`, `object-delete`)
- **Persistent Object State**: Objects survive server restarts and user sessions
- **Object Data Structure**:
```javascript
worldState.objects.set(objectId, {
  name: 'Object Name',
  type: 'model|display', 
  objectId: 'unique-id',
  position: [x, y, z],
  rotation: [x, y, z],
  scale: [x, y, z],
  addedBy: 'user-id',
  addedAt: timestamp,
  movedAt: timestamp
});
```

### Current Limitations
- ❌ No file upload capability 
- ❌ No GLB file storage mechanism
- ❌ Objects only support local `/models/` directory files
- ❌ No blob/binary data handling in server state

## Recommended Solution: Cloudflare R2 + Railway Architecture

### Why Cloudflare R2?
1. **Cost Effectiveness**: 99% cheaper than AWS S3 in high-traffic scenarios
2. **Zero Egress Fees**: No charges for downloading GLB files to users
3. **S3 Compatibility**: Easy integration with existing tools
4. **Global CDN**: Fast delivery worldwide via Cloudflare's network
5. **1M Free Requests/Month**: Sufficient for medium-scale applications

### Architecture Overview

```
User Upload → Railway Server → Cloudflare R2 Storage → Global CDN
     ↓              ↓                    ↓              ↓
File Validation → Metadata Store → Persistent URL → Fast Delivery
     ↓              ↓                    ↓              ↓
 Scene Loading ← Object Sync ← Server State ← Multi-User Sync
```

## Implementation Plan

### Phase 1: Storage Infrastructure Setup

#### 1.1 Cloudflare R2 Configuration
```bash
# R2 Bucket Setup
Bucket Name: 3d-world-models
Region: Auto (global distribution)
Public Access: Read-only for GLB files
CORS Policy: Allow origin from Netlify domain
```

#### 1.2 Railway Server Extensions
```javascript
// Add to signaling-server.js
const AWS = require('aws-sdk');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// R2 Configuration (S3-compatible)
const r2 = new AWS.S3({
  endpoint: 'https://YOUR-ACCOUNT-ID.r2.cloudflarestorage.com',
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
```

### Phase 2: Upload API Implementation

#### 2.1 File Upload Endpoint
```javascript
// POST /api/upload-model
app.post('/api/upload-model', upload.single('glbFile'), async (req, res) => {
  try {
    const file = req.file;
    const userId = req.body.userId;
    const modelName = req.body.modelName || file.originalname;
    
    // Generate unique model ID
    const modelId = `model_${uuidv4()}`;
    const fileName = `${modelId}.glb`;
    
    // Upload to R2
    const uploadParams = {
      Bucket: '3d-world-models',
      Key: fileName,
      Body: file.buffer,
      ContentType: 'model/gltf-binary',
      Metadata: {
        'original-name': file.originalname,
        'uploaded-by': userId,
        'upload-timestamp': new Date().toISOString()
      }
    };
    
    const uploadResult = await r2.upload(uploadParams).promise();
    
    // Store model metadata in world state
    const modelMetadata = {
      modelId,
      name: modelName,
      fileName,
      originalName: file.originalname,
      fileSize: file.size,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      r2Url: uploadResult.Location,
      publicUrl: `https://your-r2-domain.com/${fileName}`
    };
    
    worldState.uploadedModels.set(modelId, modelMetadata);
    
    res.json({
      success: true,
      modelId,
      publicUrl: modelMetadata.publicUrl,
      metadata: modelMetadata
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 2.2 Enhanced Object System
```javascript
// Extended object data structure
socket.on('object-add', (data) => {
  const objectData = {
    ...data,
    // New fields for uploaded models
    isUploadedModel: data.modelId ? true : false,
    modelId: data.modelId || null,
    modelUrl: data.modelUrl || null,
    uploadedBy: data.uploadedBy || null
  };
  
  worldState.objects.set(data.objectId, objectData);
  
  // Broadcast to all users including model URL
  socket.broadcast.emit('object-added', objectData);
});
```

### Phase 3: Client-Side Implementation

#### 3.1 File Upload UI
```html
<!-- Add to index.html glass menu -->
<div class="menu-popup" id="upload-popup">
  <h3>Upload 3D Model</h3>
  <div class="upload-zone" id="model-upload-zone">
    <input type="file" id="model-file-input" accept=".glb" style="display: none;">
    <div class="upload-prompt">
      <span>📁</span>
      <p>Click or drag GLB file here</p>
      <small>Max 50MB</small>
    </div>
  </div>
  <div class="upload-progress" id="upload-progress" style="display: none;">
    <div class="progress-bar"></div>
    <span class="progress-text">Uploading...</span>
  </div>
</div>
```

#### 3.2 Upload Implementation
```javascript
// File upload handling
document.getElementById('model-upload-zone').addEventListener('click', () => {
  document.getElementById('model-file-input').click();
});

document.getElementById('model-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.name.toLowerCase().endsWith('.glb')) {
    showNotification('Only GLB files are supported', 'error');
    return;
  }
  
  if (file.size > 50 * 1024 * 1024) {
    showNotification('File too large. Max 50MB allowed.', 'error');
    return;
  }
  
  await uploadModel(file);
});

async function uploadModel(file) {
  const formData = new FormData();
  formData.append('glbFile', file);
  formData.append('userId', currentUserId);
  formData.append('modelName', file.name.replace('.glb', ''));
  
  try {
    showUploadProgress(true);
    
    const response = await fetch(`${SIGNALING_SERVER}/api/upload-model`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Load the uploaded model into the scene
      await loadUploadedModel(result.publicUrl, result.modelId, result.metadata);
      showNotification('Model uploaded successfully!', 'success');
    } else {
      showNotification(`Upload failed: ${result.error}`, 'error');
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    showNotification('Upload failed. Please try again.', 'error');
  } finally {
    showUploadProgress(false);
  }
}
```

#### 3.3 Dynamic Model Loading
```javascript
async function loadUploadedModel(modelUrl, modelId, metadata) {
  try {
    const loader = new GLTFLoader();
    
    // Load from R2 URL with caching
    const gltf = await loader.loadAsync(modelUrl);
    const model = gltf.scene;
    
    // Configure model
    model.userData = {
      name: metadata.name,
      type: 'uploaded-model',
      objectId: generateObjectId(model),
      modelId: modelId,
      modelUrl: modelUrl,
      uploadedBy: metadata.uploadedBy,
      originalPosition: model.position.clone(),
      originalScale: model.scale.clone(),
      originalRotation: model.rotation.clone()
    };
    
    // Add shadows and lighting
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    // Position model at user location
    model.position.copy(userObject.position);
    model.position.y = 0; // Place on ground
    
    // Add to scene
    scene.add(model);
    sceneObjects.push(model);
    
    // Emit to server for multi-user sync
    socket.emit('object-add', {
      objectId: model.userData.objectId,
      name: model.userData.name,
      type: 'uploaded-model',
      modelId: modelId,
      modelUrl: modelUrl,
      position: [model.position.x, model.position.y, model.position.z],
      rotation: [model.rotation.x, model.rotation.y, model.rotation.z],
      scale: [model.scale.x, model.scale.y, model.scale.z],
      addedBy: currentUserId,
      uploadedBy: metadata.uploadedBy
    });
    
  } catch (error) {
    console.error('Failed to load uploaded model:', error);
    showNotification('Failed to load model in scene', 'error');
  }
}
```

### Phase 4: Multi-User Synchronization

#### 4.1 Server-Side Model Distribution
```javascript
// Handle new user connections
socket.on('request-world-state', () => {
  // Send all uploaded models metadata
  const uploadedModels = Array.from(worldState.uploadedModels.entries());
  
  socket.emit('world-state', {
    users: Array.from(worldState.users.entries()),
    objects: Array.from(worldState.objects.entries()),
    uploadedModels: uploadedModels, // New field
    messages: Array.from(worldState.messages),
    sharedScreen: worldState.sharedScreen
  });
});
```

#### 4.2 Client-Side Model Sync
```javascript
socket.on('world-state', (data) => {
  // Load all existing uploaded models
  data.uploadedModels?.forEach(([modelId, metadata]) => {
    // Only load if not already in scene
    const existing = sceneObjects.find(obj => obj.userData.modelId === modelId);
    if (!existing) {
      // Load model from R2 URL - will be cached by browser
      loadUploadedModelFromWorldState(metadata);
    }
  });
  
  // Process existing objects that reference uploaded models
  data.objects?.forEach(([objectId, objectData]) => {
    if (objectData.isUploadedModel && objectData.modelUrl) {
      loadObjectWithUploadedModel(objectData);
    }
  });
});

socket.on('object-added', (data) => {
  if (data.isUploadedModel && data.modelUrl) {
    // Load the uploaded model from R2 for new users
    loadUploadedModelForNewObject(data);
  }
});
```

### Phase 5: Performance Optimizations

#### 5.1 Browser Caching Strategy
```javascript
// Implement IndexedDB caching for uploaded models
class ModelCache {
  constructor() {
    this.dbName = '3DWorldModelCache';
    this.version = 1;
    this.db = null;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('models')) {
          const store = db.createObjectStore('models', { keyPath: 'modelId' });
          store.createIndex('url', 'url', { unique: false });
        }
      };
    });
  }
  
  async cacheModel(modelId, url, blob) {
    const transaction = this.db.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');
    
    await store.put({
      modelId,
      url,
      blob,
      timestamp: Date.now()
    });
  }
  
  async getCachedModel(modelId) {
    const transaction = this.db.transaction(['models'], 'readonly');
    const store = transaction.objectStore('models');
    
    return new Promise((resolve) => {
      const request = store.get(modelId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
}
```

#### 5.2 Progressive Loading
```javascript
// Load low-poly version first, then high-quality
async function loadModelWithProgression(modelUrl, modelId) {
  // Check for cached version first
  const cached = await modelCache.getCachedModel(modelId);
  if (cached) {
    return loadModelFromBlob(cached.blob);
  }
  
  // Load and cache for future use
  const response = await fetch(modelUrl);
  const blob = await response.blob();
  
  // Cache for next time
  await modelCache.cacheModel(modelId, modelUrl, blob);
  
  return loadModelFromBlob(blob);
}
```

### 5.3 Memory Management & Cleanup
```javascript
// Model disposal system
class ModelManager {
  constructor() {
    this.loadedModels = new Map();
    this.maxModelsInMemory = 20;
  }
  
  async loadModel(modelId, url) {
    // Check if already loaded
    if (this.loadedModels.has(modelId)) {
      return this.loadedModels.get(modelId);
    }
    
    // Enforce memory limits
    if (this.loadedModels.size >= this.maxModelsInMemory) {
      this.evictOldestModel();
    }
    
    const model = await this.loadModelFromUrl(url);
    this.loadedModels.set(modelId, {
      model,
      lastUsed: Date.now(),
      memoryUsage: this.calculateMemoryUsage(model)
    });
    
    return model;
  }
  
  evictOldestModel() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, data] of this.loadedModels) {
      if (data.lastUsed < oldestTime) {
        oldestTime = data.lastUsed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.disposeModel(oldestKey);
    }
  }
  
  disposeModel(modelId) {
    const modelData = this.loadedModels.get(modelId);
    if (modelData) {
      // Dispose Three.js resources
      modelData.model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      });
      
      this.loadedModels.delete(modelId);
    }
  }
}
```

### 5.4 Level of Detail (LOD) System
```javascript
// Automatic LOD generation for performance
const generateLOD = (originalModel) => {
  const lodGroup = new THREE.LOD();
  
  // Original model for close viewing
  lodGroup.addLevel(originalModel, 0);
  
  // Simplified versions for distance viewing
  const simplified1 = createSimplifiedVersion(originalModel, 0.5); // 50% detail
  const simplified2 = createSimplifiedVersion(originalModel, 0.25); // 25% detail
  
  lodGroup.addLevel(simplified1, 50);  // Switch at 50 units
  lodGroup.addLevel(simplified2, 100); // Switch at 100 units
  
  return lodGroup;
};

const createSimplifiedVersion = (model, quality) => {
  const simplified = model.clone();
  
  simplified.traverse((child) => {
    if (child.isMesh && child.geometry) {
      // Simplify geometry (pseudo-code - would need actual decimation library)
      child.geometry = simplifyGeometry(child.geometry, quality);
      
      // Reduce texture resolution
      if (child.material && child.material.map) {
        child.material.map = resizeTexture(child.material.map, quality);
      }
    }
  });
  
  return simplified;
};
```

### 5.5 Bandwidth Optimization
```javascript
// Progressive model streaming
const loadModelProgressively = async (modelUrl) => {
  // Check for compressed version first
  const compressedUrl = modelUrl.replace('.glb', '_compressed.glb');
  
  try {
    // Try to load Draco-compressed version
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/libs/draco/');
    
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    
    return await gltfLoader.loadAsync(compressedUrl);
  } catch (error) {
    // Fallback to original
    console.warn('Compressed version not available, loading original');
    return await new GLTFLoader().loadAsync(modelUrl);
  }
};

// Texture streaming with WebP fallback
const optimizeTextures = (model) => {
  model.traverse((child) => {
    if (child.material && child.material.map) {
      // Check for WebP support
      if (supportsWebP()) {
        const webpUrl = child.material.map.image.src.replace(/\.(jpg|png)$/, '.webp');
        const loader = new THREE.TextureLoader();
        loader.load(webpUrl, (webpTexture) => {
          child.material.map = webpTexture;
          child.material.needsUpdate = true;
        });
      }
    }
  });
};
```

## Error Handling & Edge Cases

### Upload Error Recovery
```javascript
// Robust upload with retry logic
const uploadWithRetry = async (file, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadModel(file);
      
      // Verify upload success
      await verifyUploadIntegrity(result.modelId, result.publicUrl);
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
        console.warn(`Upload attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
};

// Upload integrity verification
const verifyUploadIntegrity = async (modelId, url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`Model not accessible: ${response.status}`);
    }
    
    // Quick GLB validation
    const partialResponse = await fetch(url, {
      headers: { 'Range': 'bytes=0-20' }
    });
    
    const buffer = await partialResponse.arrayBuffer();
    const magic = new TextDecoder().decode(buffer.slice(0, 4));
    
    if (magic !== 'glTF') {
      throw new Error('Uploaded file is corrupted');
    }
    
  } catch (error) {
    throw new Error(`Upload verification failed: ${error.message}`);
  }
};
```

### Network Failure Handling
```javascript
// Handle offline/network issues
const robustModelLoader = async (modelUrl, modelId) => {
  // Check if browser is offline
  if (!navigator.onLine) {
    // Try to load from IndexedDB cache
    const cached = await modelCache.getCachedModel(modelId);
    if (cached) {
      return loadModelFromBlob(cached.blob);
    }
    throw new Error('Model not available offline');
  }
  
  // Network retry logic
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(modelUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      
      // Cache for offline use
      await modelCache.cacheModel(modelId, modelUrl, blob);
      
      return loadModelFromBlob(blob);
      
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Graceful degradation for failed models
const loadModelWithFallback = async (modelData) => {
  try {
    return await robustModelLoader(modelData.modelUrl, modelData.modelId);
  } catch (error) {
    console.error(`Failed to load model ${modelData.name}:`, error);
    
    // Show placeholder object
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.7
    });
    
    const placeholder = new THREE.Mesh(geometry, material);
    placeholder.userData = {
      ...modelData,
      isPlaceholder: true,
      loadError: error.message
    };
    
    return { scene: placeholder };
  }
};
```

## Mobile Compatibility & GLB Processing

### Critical Mobile GLB Issues (Based on Project Solutions)
The project has already solved major mobile GLB rendering issues that **MUST** be applied to uploaded models:

#### 5.6 Mobile Texture Processing System
```javascript
// Mobile GLB processor based on existing project solutions
class MobileGLBProcessor {
  constructor() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.isRealIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  
  async processUploadedGLB(glbBuffer, modelId) {
    if (!this.shouldProcessForMobile()) {
      return glbBuffer; // Return original for desktop
    }
    
    try {
      // Convert GLB to GLTF with external textures for mobile
      const { gltfData, bufferData, textures } = await this.extractGLBComponents(glbBuffer);
      
      // Create mobile-optimized structure
      const mobileAssets = {
        gltf: this.optimizeGLTFForMobile(gltfData),
        bin: bufferData,
        textures: await this.optimizeTexturesForMobile(textures)
      };
      
      // Upload mobile assets to R2
      await this.uploadMobileAssets(modelId, mobileAssets);
      
      return mobileAssets;
      
    } catch (error) {
      console.warn('Mobile processing failed, using original:', error);
      return glbBuffer;
    }
  }
  
  shouldProcessForMobile() {
    return this.isMobile || this.isRealIOS;
  }
  
  async extractGLBComponents(glbBuffer) {
    // Parse GLB structure
    const dataView = new DataView(glbBuffer);
    const jsonChunkLength = dataView.getUint32(12, true);
    const jsonChunk = new Uint8Array(glbBuffer, 20, jsonChunkLength);
    const binaryChunk = new Uint8Array(glbBuffer, 20 + jsonChunkLength + 8);
    
    const gltfData = JSON.parse(new TextDecoder().decode(jsonChunk));
    
    // Extract textures from buffer views
    const textures = await this.extractTexturesFromBuffer(gltfData, binaryChunk);
    
    return {
      gltfData,
      bufferData: binaryChunk,
      textures
    };
  }
  
  optimizeGLTFForMobile(gltfData) {
    // Create external texture references
    const optimized = JSON.parse(JSON.stringify(gltfData));
    
    if (optimized.images) {
      optimized.images.forEach((image, index) => {
        // Replace buffer view references with external URIs
        delete image.bufferView;
        image.uri = `texture_${index}.jpg`;
      });
    }
    
    return optimized;
  }
  
  async optimizeTexturesForMobile(textures) {
    const optimized = [];
    
    for (let i = 0; i < textures.length; i++) {
      const texture = textures[i];
      
      // Convert to JPEG for mobile compatibility
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load original texture
      const img = new Image();
      img.src = URL.createObjectURL(new Blob([texture.data]));
      
      await new Promise(resolve => {
        img.onload = () => {
          // Resize for mobile if too large
          const maxSize = 1024;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            optimized.push({
              name: `texture_${i}.jpg`,
              data: blob
            });
            resolve();
          }, 'image/jpeg', 0.8);
        };
      });
    }
    
    return optimized;
  }
}
```

#### 5.7 Mobile Model Loading Implementation
```javascript
// Mobile-aware model loader
async function loadUploadedModelMobile(modelUrl, modelId, metadata) {
  const processor = new MobileGLBProcessor();
  
  if (processor.shouldProcessForMobile()) {
    return await loadMobileOptimizedModel(modelId, metadata);
  } else {
    return await loadStandardGLBModel(modelUrl, modelId, metadata);
  }
}

async function loadMobileOptimizedModel(modelId, metadata) {
  try {
    // Load GLTF with external textures (mobile path)
    const gltfUrl = `${metadata.publicUrl.replace('.glb', '')}/mobile.gltf`;
    
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(gltfUrl);
    const model = gltf.scene;
    
    // Apply manual texture loading for mobile (critical for iOS)
    await applyMobileTextures(model, modelId);
    
    // Mobile-specific positioning
    if (isMobileEarly || isRealIOS) {
      model.position.set(0, 0, 0); // Center positioning for mobile
    }
    
    return configureUploadedModel(model, modelId, metadata);
    
  } catch (error) {
    console.error('Mobile model loading failed:', error);
    return await loadStandardGLBModel(metadata.publicUrl, modelId, metadata);
  }
}

async function applyMobileTextures(model, modelId) {
  const textureLoader = new THREE.TextureLoader();
  const baseUrl = `${SIGNALING_SERVER}/api/models/${modelId}/mobile/`;
  
  // Map of texture files to mesh names (similar to existing room solution)
  const textureMap = await getMobileTextureMap(modelId);
  
  for (const [filename, meshNames] of Object.entries(textureMap)) {
    try {
      const texture = await new Promise((resolve, reject) => {
        textureLoader.load(
          `${baseUrl}${filename}`,
          resolve,
          undefined,
          reject
        );
      });
      
      // Configure texture for mobile
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false; // GLTF uses flipped Y
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false; // Disable mipmaps for mobile
      
      // Apply to matching meshes
      model.traverse((child) => {
        if (child.isMesh && child.name) {
          const meshNameLower = child.name.toLowerCase();
          if (meshNames.some(name => meshNameLower.includes(name.toLowerCase()))) {
            if (child.material) {
              child.material.map = texture;
              child.material.needsUpdate = true;
            }
          }
        }
      });
      
    } catch (error) {
      console.warn(`Failed to load mobile texture ${filename}:`, error);
    }
  }
}
```

#### 5.8 Mobile Upload Processing Pipeline
```javascript
// Enhanced upload endpoint with mobile processing
app.post('/api/upload-model', authenticateUser, uploadLimiter, upload.single('glbFile'), async (req, res) => {
  try {
    const file = req.file;
    const userId = req.body.userId;
    const modelName = req.body.modelName || file.originalname;
    
    // Validate GLB
    const validation = await validateGLBFile(file.buffer);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    
    const modelId = `model_${uuidv4()}`;
    
    // Process for mobile compatibility
    const mobileProcessor = new MobileGLBProcessor();
    const mobileAssets = await mobileProcessor.processUploadedGLB(file.buffer, modelId);
    
    // Upload original GLB
    const originalKey = `${modelId}.glb`;
    await r2.upload({
      Bucket: '3d-world-models',
      Key: originalKey,
      Body: file.buffer,
      ContentType: 'model/gltf-binary'
    }).promise();
    
    // Upload mobile assets if processed
    if (mobileAssets && mobileAssets.gltf) {
      await uploadMobileAssets(modelId, mobileAssets);
    }
    
    // Store comprehensive metadata
    const modelMetadata = {
      modelId,
      name: modelName,
      originalName: file.originalname,
      fileSize: file.size,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      publicUrl: `https://your-r2-domain.com/${originalKey}`,
      hasMobileVersion: !!mobileAssets.gltf,
      mobileUrl: mobileAssets.gltf ? `https://your-r2-domain.com/${modelId}/mobile.gltf` : null
    };
    
    worldState.uploadedModels.set(modelId, modelMetadata);
    
    res.json({
      success: true,
      modelId,
      publicUrl: modelMetadata.publicUrl,
      mobileUrl: modelMetadata.mobileUrl,
      metadata: modelMetadata
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function uploadMobileAssets(modelId, mobileAssets) {
  // Upload GLTF file
  await r2.upload({
    Bucket: '3d-world-models',
    Key: `${modelId}/mobile.gltf`,
    Body: JSON.stringify(mobileAssets.gltf),
    ContentType: 'model/gltf+json'
  }).promise();
  
  // Upload binary buffer
  await r2.upload({
    Bucket: '3d-world-models',
    Key: `${modelId}/mobile.bin`,
    Body: mobileAssets.bin,
    ContentType: 'application/octet-stream'
  }).promise();
  
  // Upload individual textures
  for (const texture of mobileAssets.textures) {
    await r2.upload({
      Bucket: '3d-world-models',
      Key: `${modelId}/${texture.name}`,
      Body: texture.data,
      ContentType: 'image/jpeg'
    }).promise();
  }
}
```

### Mobile Performance Considerations
- **Memory Limits**: iOS Safari has strict WebGL memory limits - enforce smaller texture sizes
- **Texture Formats**: Always convert to JPG for mobile compatibility
- **Mipmap Disabling**: Disable mipmaps on mobile to reduce memory usage
- **LOD Priority**: More aggressive LOD switching on mobile devices
- **Position Handling**: Account for different camera positioning on mobile

## Security Considerations

### Enhanced File Validation
```javascript
// Advanced GLB validation in upload endpoint
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
```

### Content Security & Rate Limiting
```javascript
// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per window
  message: 'Too many uploads, try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// User quota tracking
const userQuotas = new Map();
const MAX_USER_STORAGE = 500 * 1024 * 1024; // 500MB per user

const checkUserQuota = async (userId, fileSize) => {
  const currentUsage = await getUserStorageUsage(userId);
  if (currentUsage + fileSize > MAX_USER_STORAGE) {
    throw new Error('Storage quota exceeded');
  }
};
```

### Authentication System Integration
```javascript
// User authentication middleware
const authenticateUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const sessionToken = req.headers['authorization'];
  
  if (!userId || !sessionToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Validate session (integrate with existing auth system)
  if (!isValidSession(userId, sessionToken)) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  req.userId = userId;
  next();
};

// Apply to upload endpoint
app.post('/api/upload-model', authenticateUser, uploadLimiter, upload.single('glbFile'), async (req, res) => {
  // Implementation with authenticated user
});
```

### Malicious Content Protection
```javascript
// Texture and material scanning
const scanForMaliciousContent = (gltfData) => {
  const issues = [];
  
  // Check for excessive texture sizes
  if (gltfData.images) {
    gltfData.images.forEach((image, index) => {
      if (image.bufferView) {
        const size = gltfData.bufferViews[image.bufferView].byteLength;
        if (size > 10 * 1024 * 1024) { // 10MB texture limit
          issues.push(`Texture ${index} too large: ${size} bytes`);
        }
      }
    });
  }
  
  // Check for suspicious extensions
  const allowedExtensions = ['KHR_materials_common', 'KHR_draco_mesh_compression'];
  if (gltfData.extensionsUsed) {
    const suspicious = gltfData.extensionsUsed.filter(ext => 
      !allowedExtensions.includes(ext));
    if (suspicious.length > 0) {
      issues.push(`Suspicious extensions: ${suspicious.join(', ')}`);
    }
  }
  
  return issues;
};
```

## Cost Analysis

### Cloudflare R2 Pricing
- **Storage**: Based on actual usage
- **Class A Operations** (uploads): Per request pricing
- **Class B Operations** (downloads): Per request pricing
- **Egress**: Free (no charges for downloads)

### Cost Benefits
- **R2 advantage**: Zero egress fees unlike traditional cloud storage
- **Scalable pricing**: Pay only for actual storage and operations used
- **No minimum commitments**: Usage-based billing

## Comprehensive Testing Procedures

### Phase 1: Upload Flow Testing

#### 1.1 File Validation Testing
```bash
# Test file types and sizes
Test Cases:
✓ Valid GLB files (1MB, 10MB, 50MB)
✓ Invalid file types (.obj, .fbx, .txt renamed to .glb)
✓ Corrupted GLB files (truncated, modified headers)
✓ Empty files (0 bytes)
✓ Maximum size files (exactly 50MB)
✓ Oversized files (51MB+)

# Security validation
✓ GLB with excessive polygons (>1000 primitives)
✓ GLB with large textures (>10MB textures)
✓ GLB with suspicious extensions
✓ Malformed JSON chunks
✓ Missing required GLTF properties
```

#### 1.2 Authentication & Rate Limiting Testing
```bash
# Authentication tests
✓ Upload without authentication (should fail)
✓ Upload with invalid session token (should fail)
✓ Upload with expired session (should fail)
✓ Upload with valid authentication (should succeed)

# Rate limiting tests
✓ 5 uploads in 15 minutes (should succeed)
✓ 6th upload in same window (should fail)
✓ Upload after rate limit window expires (should succeed)

# Quota testing
✓ Upload within 500MB user quota (should succeed)
✓ Upload exceeding user quota (should fail)
✓ Multiple users uploading simultaneously
```

#### 1.3 Upload Reliability Testing
```bash
# Network interruption scenarios
✓ Network disconnection during upload
✓ Server restart during upload
✓ R2 service unavailable during upload
✓ Partial upload completion
✓ Upload retry mechanism (3 attempts with backoff)

# Concurrent upload testing
✓ Multiple users uploading different models simultaneously
✓ Same user uploading multiple models in parallel
✓ Server load testing with 10+ concurrent uploads
```

### Phase 2: Model Loading & Rendering Testing

#### 2.1 Cross-Platform Compatibility
```bash
# Desktop browsers
✓ Chrome (Windows, macOS, Linux)
✓ Firefox (Windows, macOS, Linux)  
✓ Safari (macOS)
✓ Edge (Windows)

# Mobile browsers
✓ iOS Safari (iPhone, iPad)
✓ Chrome Mobile (Android)
✓ Samsung Internet (Android)
✓ Firefox Mobile (Android)

# Performance testing per platform
✓ Model loading time (<5 seconds for 10MB files)
✓ Frame rate impact (<10% degradation)
✓ Memory usage monitoring
✓ Texture loading success rate on mobile
```

#### 2.2 Mobile-Specific Testing
```bash
# iOS WebKit texture issues
✓ GLB with embedded textures (should use mobile processing)
✓ External texture loading with manual application
✓ Texture format conversion (PNG → JPG)
✓ Texture size optimization (>1024px → 1024px)
✓ Camera positioning (center vs edge spawn)

# Android compatibility
✓ Various Android versions (8.0+)
✓ Different GPU capabilities
✓ Memory-constrained devices
✓ Performance on older devices
```

#### 2.3 Multi-User Synchronization Testing
```bash
# Real-time sync scenarios
✓ User A uploads while User B is connected
✓ User B sees new model appear in real-time
✓ Model position/rotation/scale sync across users
✓ Model deletion sync across users
✓ New user joins with existing uploaded models

# Edge cases
✓ User disconnects during model upload
✓ Server restart with uploaded models in scene
✓ Multiple users manipulating same uploaded model
✓ Model cache vs server state consistency
✓ WebRTC screen sharing with uploaded models visible
```

### Phase 3: Performance & Scalability Testing

#### 3.1 Memory Management Testing
```bash
# Memory leak detection
✓ Load/unload 50 models repeatedly
✓ Monitor WebGL context memory usage
✓ Texture disposal verification
✓ Geometry disposal verification
✓ Material disposal verification

# Memory limit enforcement
✓ 20 models loaded simultaneously (should trigger eviction)
✓ Oldest model eviction when limit reached
✓ LRU cache behavior verification
✓ Memory usage calculation accuracy
```

#### 3.2 Caching System Testing
```bash
# IndexedDB caching
✓ Model caches correctly after first load
✓ Cached model loads faster on subsequent requests
✓ Cache hit rate >80% for repeat loads
✓ Cache cleanup for old/unused models
✓ Cache storage quota management

# Browser cache integration
✓ R2 CDN caching headers respected
✓ Model reloading after cache invalidation
✓ Offline model availability from cache
✓ Cache performance across browser sessions
```

#### 3.3 Load Testing
```bash
# Server load scenarios
✓ 10 concurrent users uploading 50MB models
✓ 50 users downloading same popular model
✓ R2 bandwidth usage monitoring
✓ Railway server resource utilization
✓ Database performance with 1000+ models

# Stress testing
✓ 100+ models in world state
✓ Server memory usage with large world state
✓ Socket.IO event handling under load
✓ Model metadata retrieval performance
```

### Phase 4: Error Handling & Recovery Testing

#### 4.1 Upload Failure Scenarios
```bash
# R2 service issues
✓ R2 bucket unavailable (should retry)
✓ R2 authentication failure (should fail gracefully)
✓ R2 quota exceeded (should display clear error)
✓ Network timeout during R2 upload

# Server-side failures
✓ Railway server out of memory
✓ File processing failure (corrupted GLB)
✓ Metadata storage failure
✓ World state synchronization failure
```

#### 4.2 Model Loading Failures
```bash
# Network-related failures
✓ Model URL returns 404 (should show placeholder)
✓ Network disconnection during model load
✓ Slow network causing timeout
✓ CDN cache miss causing delay

# Model-specific failures
✓ Corrupted GLB file in R2 storage
✓ Missing mobile texture files
✓ GLB too large for device memory
✓ Three.js parsing errors
```

#### 4.3 Graceful Degradation Testing
```bash
# Progressive enhancement
✓ Core 3D world works without upload feature
✓ Existing models continue working if upload service fails
✓ Clear user feedback for all error conditions
✓ Fallback to placeholder objects when models fail
✓ Upload UI disabled when service unavailable
```

### Phase 5: Security & Content Moderation Testing

#### 5.1 Malicious Content Testing
```bash
# Security exploit attempts
✓ GLB with executable content embedded
✓ GLB with XSS attempts in metadata
✓ GLB with excessively large polygon counts
✓ GLB designed to crash Three.js parser
✓ SQLi attempts in model names/metadata

# Content validation
✓ Inappropriate texture content detection
✓ Model complexity analysis
✓ File size vs. content verification
✓ Suspicious file pattern detection
```

#### 5.2 Authentication Security Testing
```bash
# Session security
✓ Session token expiration enforcement
✓ Invalid token rejection
✓ Rate limiting effectiveness
✓ CSRF protection on upload endpoints
✓ User quota enforcement accuracy
```

### Testing Automation Scripts

#### Automated Test Suite
```javascript
// Example test automation framework
class GLBUploadTestSuite {
  async runFullTestSuite() {
    console.log('🧪 Starting GLB Upload Test Suite...');
    
    const results = {
      uploadTests: await this.runUploadTests(),
      loadingTests: await this.runLoadingTests(),
      syncTests: await this.runSyncTests(),
      performanceTests: await this.runPerformanceTests(),
      securityTests: await this.runSecurityTests()
    };
    
    this.generateTestReport(results);
    return results;
  }
  
  async runUploadTests() {
    const tests = [
      () => this.testValidGLBUpload(),
      () => this.testInvalidFileRejection(),
      () => this.testFileSizeLimits(),
      () => this.testRateLimiting(),
      () => this.testAuthenticationRequired()
    ];
    
    return await this.executeTests(tests, 'Upload Tests');
  }
  
  async testValidGLBUpload() {
    // Upload test GLB file and verify success
    const testFile = await this.loadTestGLB('valid-model-10mb.glb');
    const result = await this.uploadModel(testFile);
    
    assert(result.success, 'Valid GLB upload should succeed');
    assert(result.modelId, 'Should return model ID');
    assert(result.publicUrl, 'Should return public URL');
    
    // Verify model is accessible
    const response = await fetch(result.publicUrl);
    assert(response.ok, 'Uploaded model should be accessible');
  }
  
  // Additional test methods...
}
```

## System Monitoring & Maintenance

### Automated Cleanup System
```javascript
// Scheduled cleanup service
class ModelCleanupService {
  constructor() {
    this.maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    this.maxUnusedAge = 30 * 24 * 60 * 60 * 1000; // 30 days unused
  }
  
  async runDailyCleanup() {
    console.log('🧹 Starting daily model cleanup...');
    
    const results = {
      modelsScanned: 0,
      modelsDeleted: 0,
      storageReclaimed: 0,
      errors: []
    };
    
    try {
      // Clean up old unused models
      await this.cleanupUnusedModels(results);
      
      // Clean up orphaned mobile assets
      await this.cleanupOrphanedAssets(results);
      
      // Clean up failed uploads
      await this.cleanupFailedUploads(results);
      
      // Update user storage quotas
      await this.updateUserQuotas(results);
      
      this.logCleanupResults(results);
      
    } catch (error) {
      console.error('Cleanup service error:', error);
      results.errors.push(error.message);
    }
    
    return results;
  }
  
  async cleanupUnusedModels(results) {
    const now = Date.now();
    
    for (const [modelId, metadata] of worldState.uploadedModels) {
      results.modelsScanned++;
      
      const uploadedAt = new Date(metadata.uploadedAt).getTime();
      const lastUsed = metadata.lastUsed || uploadedAt;
      
      // Check if model is too old or unused
      const isOld = now - uploadedAt > this.maxAge;
      const isUnused = now - lastUsed > this.maxUnusedAge;
      
      if (isOld || isUnused) {
        try {
          await this.deleteModel(modelId, metadata);
          results.modelsDeleted++;
          results.storageReclaimed += metadata.fileSize;
        } catch (error) {
          results.errors.push(`Failed to delete ${modelId}: ${error.message}`);
        }
      }
    }
  }
  
  async deleteModel(modelId, metadata) {
    // Delete from R2 storage
    await r2.deleteObject({
      Bucket: '3d-world-models',
      Key: `${modelId}.glb`
    }).promise();
    
    // Delete mobile assets if they exist
    if (metadata.hasMobileVersion) {
      await this.deleteMobileAssets(modelId);
    }
    
    // Remove from world state
    worldState.uploadedModels.delete(modelId);
    
    // Remove any objects in scene using this model
    for (const [objectId, objectData] of worldState.objects) {
      if (objectData.modelId === modelId) {
        worldState.objects.delete(objectId);
        // Notify all connected users
        io.emit('object-deleted', { objectId });
      }
    }
    
    console.log(`🗑️ Deleted model ${modelId} (${metadata.name})`);
  }
}

// Schedule cleanup service
const cleanupService = new ModelCleanupService();
setInterval(async () => {
  await cleanupService.runDailyCleanup();
}, 24 * 60 * 60 * 1000); // Run daily
```

### Performance Monitoring
```javascript
// Performance monitoring system
class ModelPerformanceMonitor {
  constructor() {
    this.metrics = {
      uploads: new Map(),
      loads: new Map(),
      errors: new Map()
    };
  }
  
  recordUpload(modelId, fileSize, duration, success) {
    this.metrics.uploads.set(modelId, {
      fileSize,
      duration,
      success,
      timestamp: Date.now(),
      throughput: fileSize / duration // bytes per ms
    });
  }
  
  recordModelLoad(modelId, loadTime, success, platform) {
    this.metrics.loads.set(`${modelId}_${Date.now()}`, {
      modelId,
      loadTime,
      success,
      platform,
      timestamp: Date.now()
    });
  }
  
  generatePerformanceReport() {
    const report = {
      uploadStats: this.calculateUploadStats(),
      loadStats: this.calculateLoadStats(),
      errorRate: this.calculateErrorRate(),
      platformPerformance: this.calculatePlatformStats()
    };
    
    return report;
  }
  
  calculateUploadStats() {
    const uploads = Array.from(this.metrics.uploads.values());
    const successful = uploads.filter(u => u.success);
    
    return {
      totalUploads: uploads.length,
      successRate: successful.length / uploads.length,
      avgDuration: successful.reduce((sum, u) => sum + u.duration, 0) / successful.length,
      avgThroughput: successful.reduce((sum, u) => sum + u.throughput, 0) / successful.length
    };
  }
}
```

## Production Configuration & Deployment

### Cloudflare R2 Setup
```bash
# 1. Create R2 bucket
Bucket Name: 3d-world-models
Region: Auto (global distribution)
Storage Class: Standard

# 2. Configure bucket policies
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::3d-world-models/*"
    }
  ]
}

# 3. CORS Configuration
[
  {
    "AllowedOrigins": [
      "https://your-netlify-domain.netlify.app",
      "https://your-custom-domain.com"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]

# 4. Custom Domain Setup (Optional)
# Point CNAME: models.yourdomain.com → your-account-id.r2.cloudflarestorage.com
# Update publicUrl generation to use custom domain
```

### Railway Environment Variables
```bash
# Railway Production Environment
R2_ACCESS_KEY=your_r2_access_key_id
R2_SECRET_KEY=your_r2_secret_access_key
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_BUCKET_NAME=3d-world-models
R2_PUBLIC_DOMAIN=https://your-r2-domain.com  # or custom domain

# Security Settings
JWT_SECRET=your_jwt_secret_for_session_validation
UPLOAD_SECRET=your_upload_endpoint_secret
MAX_UPLOAD_SIZE=52428800  # 50MB in bytes
MAX_USER_STORAGE=524288000  # 500MB in bytes

# Performance Settings
MAX_MODELS_IN_MEMORY=20
CACHE_TTL=3600  # 1 hour
CLEANUP_INTERVAL=86400000  # 24 hours in ms

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
```

### Railway Deployment Configuration
```javascript
// Add to signaling-server.js startup
const requiredEnvVars = [
  'R2_ACCESS_KEY',
  'R2_SECRET_KEY', 
  'R2_ACCOUNT_ID',
  'R2_BUCKET_NAME'
];

// Validate environment on startup
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

console.log('✅ All required environment variables present');

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    features: {
      r2Storage: !!process.env.R2_ACCESS_KEY,
      uploadEnabled: true,
      mobileProcessing: true
    }
  });
});
```

### Netlify Frontend Configuration
```toml
# Update netlify.toml
[build]
  publish = "."
  
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    
[[headers]]
  for = "/models/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Environment variables for frontend
[context.production.environment]
  SIGNALING_SERVER = "https://3d-threejs-site-production.up.railway.app"
  ENABLE_MODEL_UPLOAD = "true"
  MAX_UPLOAD_SIZE = "50"
```

### Authentication Integration
```javascript
// Simple session-based authentication for MVP
class SimpleAuthSystem {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }
  
  generateSession(userId) {
    const sessionId = crypto.randomUUID();
    const session = {
      userId,
      sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    this.sessions.set(sessionId, session);
    return sessionId;
  }
  
  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check if session expired
    if (Date.now() - session.lastActivity > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    // Update last activity
    session.lastActivity = Date.now();
    return session;
  }
  
  // Auto-cleanup expired sessions
  cleanupSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Integrate with socket connection
socket.on('authenticate', (data) => {
  const session = authSystem.validateSession(data.sessionToken);
  if (session) {
    socket.userId = session.userId;
    socket.authenticated = true;
    socket.emit('auth-success', { userId: session.userId });
  } else {
    socket.emit('auth-failed', { error: 'Invalid session' });
  }
});
```

### CDN and Caching Strategy
```javascript
// R2 with Cloudflare CDN optimization
const r2Config = {
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto',
  // Cloudflare CDN caching headers
  uploadParams: {
    CacheControl: 'public, max-age=31536000, immutable', // 1 year
    ContentEncoding: 'gzip' // Enable compression
  }
};

// Client-side cache headers
app.use('/api/models', (req, res, next) => {
  // Set caching headers for model metadata
  res.set({
    'Cache-Control': 'public, max-age=300', // 5 minutes
    'ETag': `"${Date.now()}"`,
    'Vary': 'Accept-Encoding'
  });
  next();
});
```

### Database Migration (Future Enhancement)
```javascript
// Prepare for database integration (Phase 2)
class ModelDatabase {
  constructor() {
    // For MVP: Use Map with periodic JSON backup
    this.models = new Map();
    this.backupInterval = 60000; // 1 minute
    this.setupPeriodicBackup();
  }
  
  setupPeriodicBackup() {
    setInterval(() => {
      this.backupToFile();
    }, this.backupInterval);
  }
  
  async backupToFile() {
    const data = {
      models: Array.from(this.models.entries()),
      timestamp: new Date().toISOString()
    };
    
    // Save to Railway persistent storage
    await fs.writeFile('/app/data/models-backup.json', JSON.stringify(data));
  }
  
  async restoreFromFile() {
    try {
      const data = await fs.readFile('/app/data/models-backup.json', 'utf8');
      const backup = JSON.parse(data);
      this.models = new Map(backup.models);
      console.log(`✅ Restored ${this.models.size} models from backup`);
    } catch (error) {
      console.log('ℹ️ No backup file found, starting fresh');
    }
  }
}
```

### Monitoring and Logging
```javascript
// Production logging setup
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Upload tracking
app.use('/api/upload-model', (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Upload request completed', {
      userId: req.userId,
      fileSize: req.file?.size,
      duration,
      status: res.statusCode,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});
```

### Security Hardening
```javascript
// Production security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Apply security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://your-r2-domain.com"],
      connectSrc: ["'self'", "wss:", "https://your-r2-domain.com"]
    }
  }
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: 'Too many requests from this IP'
});

app.use(globalLimiter);

// Input validation middleware
const validateModelUpload = (req, res, next) => {
  const { modelName } = req.body;
  
  // Sanitize model name
  if (modelName && typeof modelName === 'string') {
    req.body.modelName = modelName
      .replace(/[<>]/g, '') // Remove potential XSS
      .substring(0, 100); // Limit length
  }
  
  next();
};
```

## Implementation Tasks
- [ ] Set up Cloudflare R2 bucket
- [ ] Configure Railway environment variables
- [ ] Test R2 upload/download flow
- [ ] Implement basic upload API

### Client Integration
- [ ] Add upload UI to glass menu
- [ ] Implement file upload handling
- [ ] Add progress indicators
- [ ] Test model loading from R2

### Multi-User Features
- [ ] Implement object synchronization
- [ ] Add uploaded model tracking
- [ ] Test cross-user visibility
- [ ] Handle edge cases

### Performance & Polish
- [ ] Implement caching strategy
- [ ] Add error handling
- [ ] Performance testing
- [ ] Documentation and deployment

## Migration from Current System

### Backward Compatibility
- ✅ Existing `/models/` directory models continue working
- ✅ Current object manipulation system unchanged
- ✅ No breaking changes to existing users

### Enhanced Object Types
```javascript
// Object type evolution
const objectTypes = {
  'display': 'Static display screen',
  'model': 'Local /models/ directory file', // Existing
  'uploaded-model': 'User-uploaded GLB from R2' // New
};
```

## Success Metrics

### Technical KPIs
- **Upload Success Rate**: >95%
- **Model Load Time**: <5 seconds for 10MB files
- **Cache Hit Rate**: >80% for repeat loads
- **Multi-User Sync Latency**: <500ms

### User Experience KPIs
- **Upload Completion Rate**: >90%
- **User Retention**: Track usage before/after feature
- **Error Rate**: <5% of upload attempts
- **Performance Impact**: <10% fps degradation

## Future Enhancements

### Phase 2 Features
- **Model Marketplace**: User-to-user model sharing
- **Version Control**: Upload new versions of models
- **Collaboration**: Real-time model editing
- **Analytics**: Usage tracking and model popularity

### Advanced Features
- **Model Optimization**: Automatic LOD generation
- **Format Support**: GLTF, OBJ, FBX conversion
- **Procedural Generation**: AI-assisted model creation
- **VR/AR Integration**: Optimized for immersive experiences

## Conclusion

The recommended Cloudflare R2 + Railway architecture provides:

1. **Cost-Effective Storage**: 99% cheaper than AWS S3
2. **Seamless Integration**: Builds on existing object system
3. **Global Performance**: Fast delivery via Cloudflare CDN
4. **Scalable Architecture**: Handles growth from 10 to 10,000 users
5. **Future-Proof Design**: Extensible for advanced features

This implementation transforms the 3D world from a static environment to a dynamic, user-generated metaverse where users can upload, share, and collaborate with their own 3D models while maintaining the high performance and multi-user experience that defines the platform.