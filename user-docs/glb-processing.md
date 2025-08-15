# GLB Model Processing Guide

## Overview

When you upload a GLB model (either as a room or object), the system automatically processes it to ensure compatibility across all devices. This happens seamlessly in the background.

## Why Processing is Needed

Different devices have different capabilities:
- **Desktop**: Can handle large textures, WebP format, embedded materials
- **Mobile**: Needs smaller textures, JPG format, optimized materials
- **iOS**: Has specific texture requirements and WebGL limitations

The processing system creates optimized versions for each platform automatically.

## How to Upload Models

### Method 1: Replace Room Model
1. Click the 📦 button in the glass menu
2. Select "🏠 Replace Room Model"
3. Choose your GLB file
4. Wait for processing (progress shown on screen)
5. Room automatically updates for all users

### Method 2: Add 3D Objects
1. Click the 📦 button in the glass menu
2. Select "📦 Load GLB Model"
3. Choose your GLB file
4. Object appears in the scene
5. Use controls to position/scale/rotate

### Method 3: Drag and Drop
1. Simply drag a GLB file onto the webpage
2. Model loads and appears in the scene
3. Automatically processed for your device

## Processing Stages

When you upload a model, you'll see these stages:

1. **Loading (0-25%)**: File being read and parsed
2. **Processing (25-50%)**: Analyzing meshes and materials
3. **Optimizing (50-75%)**: Creating device-specific versions
4. **Complete (100%)**: Model ready and displayed

## What Gets Processed

### Textures
- **Extracted**: Textures are separated from the GLB file
- **Resized**: Scaled to power-of-two dimensions (512, 1024, 2048)
- **Converted**: Changed to JPG format for mobile compatibility
- **Optimized**: Compression applied for faster loading

### Materials
- **Simplified**: Complex materials reduced for mobile
- **Cached**: Materials stored for quick reuse
- **Adjusted**: Settings optimized per platform

### Geometry
- **Preserved**: Mesh geometry remains unchanged
- **Indexed**: Optimized for rendering performance
- **Shadows**: Configured based on device capabilities

## File Size Recommendations

For best performance:
- **Room Models**: Keep under 20MB
- **Objects**: Keep under 10MB
- **Textures**: 2048×2048 maximum
- **Total Scene**: Under 50MB combined

## Supported Features

✅ **Fully Supported**:
- Standard materials (PBR)
- Multiple textures per model
- Animated models (basic)
- Multiple meshes
- Transparency
- Normal maps
- Metalness/Roughness

⚠️ **Partially Supported**:
- Emissive materials (simplified on mobile)
- Very large textures (automatically downsized)
- Complex shaders (converted to standard)

❌ **Not Supported**:
- Point clouds
- Volumetric effects
- Custom shaders
- Procedural textures

## Tips for Model Creators

### Optimizing Your Models

1. **Use Power-of-Two Textures**:
   - Good: 512×512, 1024×1024, 2048×2048
   - Bad: 900×900, 1920×1080

2. **Minimize Texture Count**:
   - Combine textures where possible
   - Use texture atlases
   - Share materials between meshes

3. **Name Screen Objects Correctly**:
   - Use "SHARESCREEN" for display surfaces
   - Include "screen" in mesh names for detection

4. **Keep Geometry Simple**:
   - Under 100k vertices for room models
   - Under 50k vertices for objects
   - Use LODs if available

### Testing Your Models

1. **Test on Multiple Devices**:
   - Desktop browser
   - Mobile phone
   - Tablet (if available)

2. **Check the Console**:
   - Press F12 to open developer tools
   - Look for processing messages
   - Check for any errors

3. **Verify Screen Objects**:
   - Look for "Found screen object" message
   - Ensure screens display video correctly

## Troubleshooting

### Model Not Loading

**Large file size?**
- Compress textures before embedding
- Reduce polygon count
- Split into multiple smaller models

**Unsupported features?**
- Check console for specific errors
- Remove custom shaders
- Convert to standard materials

### Textures Missing on Mobile

**Wrong format?**
- Processing automatically converts to JPG
- Wait for processing to complete
- Check console for texture loading messages

**Too large?**
- System auto-resizes to 2048×2048 max
- Consider using smaller textures initially

### Processing Takes Too Long

**Very complex model?**
- Simplify geometry in modeling software
- Reduce texture resolution
- Remove unnecessary meshes

**Slow connection?**
- Processing happens locally in browser
- Large files take longer to read
- Be patient with 10MB+ files

## Advanced Features

### Batch Processing (Development)

For developers with multiple models:

```bash
# Install tools
npm run install-glb-tools

# Process all models
node glb-processor.js --batch ./models ./models/processed
```

### Manual Processing Control

The system exposes the processor for advanced users:

```javascript
// Access in browser console
glbProcessor.verbose = true;  // Enable detailed logging
glbProcessor.processedModels; // View cached models
```

### Custom Processing Options

Future updates will allow:
- Custom texture compression levels
- Selective processing (geometry only, textures only)
- Server-side processing for large files
- Progressive loading for huge models

## Best Practices Summary

1. **Keep It Light**: Smaller files load and process faster
2. **Test Everything**: Verify on both desktop and mobile
3. **Name Correctly**: Especially important for screen objects
4. **Be Patient**: Processing ensures compatibility
5. **Check Console**: Valuable debugging information

## Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Verify your model in a 3D viewer first
3. Try a smaller test model
4. Report issues on [GitHub](https://github.com/MCERQUA/3D-threejs-site/issues)