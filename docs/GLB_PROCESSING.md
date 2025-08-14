# GLB Model Processing System

## Overview

This project includes a comprehensive GLB model processing system that automatically handles texture extraction and mobile optimization. The system works both in development (Node.js) and in production (browser-based).

## Why GLB Processing?

Mobile devices, especially iOS, often have issues with:
- Embedded WebP textures in GLB files
- Large texture sizes causing memory issues
- Power-of-two texture requirements for WebGL

The processing system solves these by:
- Extracting textures from GLB files
- Converting to mobile-friendly formats (JPG)
- Creating separate desktop and mobile versions
- Ensuring power-of-two dimensions
- Optimizing texture parameters

## Components

### 1. Node.js Processor (`glb-processor.js`)

For development and batch processing:

```bash
# Install dependencies
npm run install-glb-tools

# Process a single GLB file
node glb-processor.js models/room.glb

# Process all GLB files in a directory
node glb-processor.js --batch ./models ./models/processed

# With verbose output
node glb-processor.js models/room.glb --verbose
```

Output structure:
```
models/processed/
├── room/
│   ├── desktop/
│   │   └── room.glb          # Original GLB for desktop
│   ├── mobile/
│   │   ├── room.gltf         # GLTF with external textures
│   │   ├── room.bin          # Binary geometry data
│   │   └── *.jpg             # Extracted textures
│   └── metadata.json         # Processing information
```

### 2. Client-Side Processor (`glb-processor-client.js`)

For real-time processing in the browser:

```javascript
// Initialize processor
const glbProcessor = new ClientGLBProcessor(THREE, GLTFLoader);

// Process a file
const processed = await glbProcessor.processGLB(file, (progress) => {
  console.log(`Processing: ${progress.stage} (${progress.progress}%)`);
});

// Apply to scene
const model = glbProcessor.applyProcessedModel(scene, processed, isMobile);
```

### 3. UI Integration

Users can:
- **Load GLB Models**: Standard model loading with automatic processing
- **Replace Room Model**: Upload a new room GLB that replaces the current environment

Both options automatically:
- Detect mobile vs desktop
- Apply appropriate texture optimizations
- Handle screen objects separately
- Maintain proper aspect ratios

## Processing Pipeline

1. **Load GLB**: File is loaded via File API or URL
2. **Analyze**: Detect meshes, textures, and special objects (screens)
3. **Extract**: Separate textures from embedded GLB
4. **Optimize**: 
   - Convert to power-of-two dimensions
   - Apply mobile-friendly parameters
   - Convert to JPG for better compression
5. **Version**: Create desktop and mobile versions
6. **Apply**: Use appropriate version based on device

## Mobile Optimizations

For mobile devices, textures are:
- Resized to power-of-two (max 2048x2048)
- Converted to JPG format
- Set to ClampToEdgeWrapping
- Use LinearFilter (no mipmaps)
- Front-side only rendering

## Special Handling

### Screen Objects
Objects named "SHARESCREEN" or containing "screen" are handled separately:
- Maintain 16:9 aspect ratio
- Use dynamic canvas textures
- Support video streaming

### Room Models
When replacing the room model:
- Previous room is completely removed
- New room is processed and cached
- Screen objects are re-initialized
- All users are notified (if connected)

## Usage Examples

### Development Workflow
```bash
# Process room model for production
node glb-processor.js models/WEBROOM1.glb

# This creates:
# - models/processed/WEBROOM1/desktop/WEBROOM1.glb
# - models/processed/WEBROOM1/mobile/WEBROOM1.gltf
# - models/processed/WEBROOM1/mobile/*.jpg (textures)
```

### Production Usage
Users can:
1. Click the 📦 button in the glass menu
2. Select "Replace Room Model"
3. Choose a GLB file
4. Wait for processing (progress shown)
5. Room is automatically replaced

## Troubleshooting

### Common Issues

**Textures not showing on mobile:**
- Ensure GLB is processed (check console for processing messages)
- Verify texture files are JPG format
- Check texture dimensions are power-of-two

**Processing fails:**
- File might be too large (>50MB)
- GLB might have unsupported features
- Check browser console for detailed errors

**Screen share breaks after room replacement:**
- Screen objects must be named "SHARESCREEN"
- Maintain 16:9 aspect ratio geometry
- Check setupScreenObject() is called

### Debug Mode

Enable verbose logging:
```javascript
glbProcessor.verbose = true;
```

Check processing results:
```javascript
console.log(glbProcessor.processedModels);
```

## Best Practices

1. **Keep GLB files under 20MB** for optimal processing speed
2. **Use descriptive names** for screen objects
3. **Test on both desktop and mobile** after processing
4. **Batch process** models in development for consistency
5. **Cache processed models** to avoid re-processing

## Future Enhancements

Planned improvements:
- Automatic texture compression levels
- Support for Draco geometry compression
- Progressive loading for large models
- Server-side processing API
- Texture atlas generation
- LOD (Level of Detail) generation