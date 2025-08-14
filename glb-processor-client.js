/**
 * Client-side GLB Processor
 * Processes GLB files directly in the browser for mobile compatibility
 * Uses Three.js to extract and convert textures
 */

class ClientGLBProcessor {
  constructor(THREE, GLTFLoader) {
    this.THREE = THREE;
    this.GLTFLoader = GLTFLoader;
    this.processedModels = new Map();
  }

  /**
   * Process a GLB file from a File object or URL
   * @param {File|string} input - File object from input or URL string
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} Processing result with desktop and mobile versions
   */
  async processGLB(input, onProgress = null) {
    const loader = new this.GLTFLoader();
    
    // Create URL from File if needed
    const url = input instanceof File ? URL.createObjectURL(input) : input;
    const modelName = input instanceof File ? input.name.replace('.glb', '') : 'model';
    
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        async (gltf) => {
          try {
            if (onProgress) onProgress({ stage: 'loaded', progress: 25 });
            
            // Process the model for desktop and mobile
            const result = await this.createVersions(gltf, modelName, onProgress);
            
            // Clean up object URL if we created one
            if (input instanceof File) {
              URL.revokeObjectURL(url);
            }
            
            // Store in cache
            this.processedModels.set(modelName, result);
            
            if (onProgress) onProgress({ stage: 'complete', progress: 100 });
            resolve(result);
            
          } catch (error) {
            reject(error);
          }
        },
        (progress) => {
          if (onProgress && progress.total) {
            const percent = (progress.loaded / progress.total) * 25;
            onProgress({ stage: 'loading', progress: percent });
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Create desktop and mobile versions of the model
   */
  async createVersions(gltf, modelName, onProgress) {
    const THREE = this.THREE;
    const scene = gltf.scene;
    
    // Desktop version - keep original with embedded textures
    const desktopVersion = {
      scene: scene.clone(),
      format: 'glb',
      textures: 'embedded',
      originalGltf: gltf
    };
    
    if (onProgress) onProgress({ stage: 'processing', progress: 50 });
    
    // Mobile version - extract and optimize textures
    const mobileVersion = await this.createMobileVersion(scene.clone(), onProgress);
    
    // Detect which objects are screens for special handling
    const screenObjects = this.detectScreenObjects(scene);
    
    return {
      name: modelName,
      desktop: desktopVersion,
      mobile: mobileVersion,
      screenObjects: screenObjects,
      metadata: {
        processedAt: new Date().toISOString(),
        vertexCount: this.countVertices(scene),
        textureCount: this.countTextures(scene),
        hasSHARESCREEN: screenObjects.length > 0
      }
    };
  }

  /**
   * Create mobile-optimized version with extracted textures
   */
  async createMobileVersion(scene, onProgress) {
    const THREE = this.THREE;
    const extractedTextures = new Map();
    const textureUrls = new Map();
    
    // Process all meshes
    scene.traverse((node) => {
      if (node.isMesh && node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        
        materials.forEach(material => {
          // Extract and convert textures
          const textureTypes = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
          
          textureTypes.forEach(textureType => {
            if (material[textureType]) {
              const texture = material[textureType];
              
              // Skip if this is a screen object
              if (node.name && node.name.toLowerCase().includes('screen')) {
                return;
              }
              
              // Convert texture to mobile-friendly format
              if (!extractedTextures.has(texture.uuid)) {
                const mobileTexture = this.optimizeTextureForMobile(texture);
                extractedTextures.set(texture.uuid, mobileTexture);
                
                // Create data URL for the texture
                const dataUrl = this.textureToDataURL(mobileTexture);
                textureUrls.set(texture.uuid, dataUrl);
              }
              
              // Replace with mobile-optimized texture
              material[textureType] = extractedTextures.get(texture.uuid);
            }
          });
          
          // Optimize material settings for mobile
          material.side = THREE.FrontSide; // Reduce draw calls
          material.transparent = false; // Unless needed
          material.alphaTest = 0; // Disable if not needed
        });
      }
    });
    
    if (onProgress) onProgress({ stage: 'optimizing', progress: 75 });
    
    return {
      scene: scene,
      format: 'gltf',
      textures: 'extracted',
      textureUrls: textureUrls,
      textureCount: extractedTextures.size
    };
  }

  /**
   * Optimize texture for mobile devices
   */
  optimizeTextureForMobile(texture) {
    const THREE = this.THREE;
    const mobileTexture = texture.clone();
    
    // Set mobile-friendly parameters
    mobileTexture.wrapS = THREE.ClampToEdgeWrapping;
    mobileTexture.wrapT = THREE.ClampToEdgeWrapping;
    mobileTexture.minFilter = THREE.LinearFilter;
    mobileTexture.magFilter = THREE.LinearFilter;
    mobileTexture.generateMipmaps = false;
    
    // Ensure power-of-two dimensions
    if (texture.image) {
      const canvas = document.createElement('canvas');
      const size = this.getNearestPowerOfTwo(Math.max(texture.image.width, texture.image.height));
      
      // Cap at 2048 for mobile
      const maxSize = Math.min(size, 2048);
      canvas.width = maxSize;
      canvas.height = maxSize;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(texture.image, 0, 0, maxSize, maxSize);
      
      mobileTexture.image = canvas;
      mobileTexture.needsUpdate = true;
    }
    
    return mobileTexture;
  }

  /**
   * Convert texture to data URL for storage/transfer
   */
  textureToDataURL(texture, quality = 0.85) {
    if (!texture.image) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0);
    
    // Use JPEG for better compression
    return canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Detect screen objects that need special handling
   */
  detectScreenObjects(scene) {
    const screenObjects = [];
    
    scene.traverse((node) => {
      if (node.isMesh) {
        const name = node.name ? node.name.toLowerCase() : '';
        if (name.includes('screen') || name.includes('sharescreen') || name.includes('display')) {
          screenObjects.push({
            name: node.name,
            uuid: node.uuid,
            position: node.position.clone(),
            scale: node.scale.clone(),
            geometry: {
              width: node.geometry.parameters?.width,
              height: node.geometry.parameters?.height
            }
          });
        }
      }
    });
    
    return screenObjects;
  }

  /**
   * Helper function to get nearest power of two
   */
  getNearestPowerOfTwo(value) {
    return Math.pow(2, Math.ceil(Math.log2(value)));
  }

  /**
   * Count vertices in the scene
   */
  countVertices(scene) {
    let count = 0;
    scene.traverse((node) => {
      if (node.isMesh && node.geometry) {
        count += node.geometry.attributes.position ? node.geometry.attributes.position.count : 0;
      }
    });
    return count;
  }

  /**
   * Count unique textures in the scene
   */
  countTextures(scene) {
    const textures = new Set();
    scene.traverse((node) => {
      if (node.isMesh && node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach(material => {
          ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach(type => {
            if (material[type]) {
              textures.add(material[type].uuid);
            }
          });
        });
      }
    });
    return textures.size;
  }

  /**
   * Apply processed model to the scene
   */
  applyProcessedModel(scene, processedModel, isMobile) {
    const version = isMobile ? processedModel.mobile : processedModel.desktop;
    
    // Clear existing room model if present
    const existingRoom = scene.getObjectByName('RoomModel');
    if (existingRoom) {
      scene.remove(existingRoom);
    }
    
    // Add the appropriate version
    const model = version.scene.clone();
    model.name = 'RoomModel';
    scene.add(model);
    
    // Apply mobile texture fixes if needed
    if (isMobile && version.textureUrls) {
      this.applyMobileTextures(model, version.textureUrls);
    }
    
    return model;
  }

  /**
   * Apply mobile textures from data URLs
   */
  applyMobileTextures(model, textureUrls) {
    const THREE = this.THREE;
    const textureLoader = new THREE.TextureLoader();
    
    textureUrls.forEach((dataUrl, uuid) => {
      textureLoader.load(dataUrl, (texture) => {
        // Apply mobile-friendly settings
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        
        // Find and update materials using this texture
        model.traverse((node) => {
          if (node.isMesh && node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(material => {
              ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach(type => {
                if (material[type] && material[type].uuid === uuid) {
                  material[type] = texture;
                  material.needsUpdate = true;
                }
              });
            });
          }
        });
      });
    });
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.ClientGLBProcessor = ClientGLBProcessor;
}