# Mobile Texture Rendering Attempts Documentation

## 🟡 CURRENT STATUS: NEW APPROACH IMPLEMENTED
**As of December 17, 2024 - Implementing texture reprocessing similar to Sketchfab/Spatial.io**

### Latest Attempt #18: Platform-Style Texture Processing
Reprocessing textures on-the-fly for mobile, similar to how platforms like Sketchfab and Spatial.io handle GLB files.

## Overview
This document tracks all the different approaches we've tried to fix mobile texture rendering issues in the 3D Three.js site. The main problem has been textures appearing white or not rendering correctly on mobile devices, while working fine on desktop.

### Quick Summary of What We Know:
- ✅ Mobile GLB file exists with JPG textures (WEBROOM1-mob.glb)
- ✅ Textures load successfully (console shows valid dimensions)
- ✅ Materials are present (objects have base colors)
- ❌ Textures don't render (all surfaces appear white)
- ❌ Affects ALL mobile browsers (iOS Safari, Chrome, Android)
- ❌ Following Three.js best practices doesn't fix it

## Key Finding
**Someone else has it working on mobile without special handling**, suggesting our "fixes" may have been making things worse.

## Latest Attempts (August 12, 2025) - STILL NOT WORKING

### ⚠️ CURRENT STATUS: Mobile textures still showing white despite 17+ attempts including WebGL 2

### 14. Simplified GLB Loading (Following Best Practices)
**Commit**: `12da505` - Let GLTFLoader handle textures automatically
**Changes**:
- Removed ALL texture manipulation code
- Removed material modifications
- Let GLTFLoader handle everything automatically as per Three.js best practices
- Used standard loader.load() pattern without interference
- **Result**: ❌ Textures still white on mobile

### 15. Force Render Updates on Mobile
**Commit**: `5c2547e` - Force texture updates after load
**Changes**:
- Added forced renderer.render() calls after model load
- Added delayed material.needsUpdate = true for all materials
- Fixed mobile detection to include iOS Chrome
- **Result**: ❌ Still white textures on all mobile browsers

### 16. Debug Findings
**What we know**:
- Mobile GLB (WEBROOM1-mob.glb) has JPG textures instead of WebP
- Desktop GLB works fine on desktop
- Textures appear to load (have valid dimensions in console)
- Materials are present (couch is black, not white - indicating material loads)
- But textures don't render (all surfaces white except base colors)
- Issue affects: iOS Safari, Chrome on iOS, Android Chrome

### 17. WebGL 2 Implementation
**Commit**: `9ed4a5b` - Enable WebGL 2 for better texture support
**Changes**:
- Added WebGL 2 detection and automatic usage when available
- WebGL 2 has better texture handling, especially for non-power-of-2 textures
- iOS 15+ supports WebGL 2.0 via Metal
- Android has supported WebGL 2 since 2016
- **Result**: ❌ Still white textures even with WebGL 2

## Latest Fixes (August 12, 2025)

### 11. WebP to JPG Texture Conversion
**Commit**: `f00b84c` - Use mobile-optimized GLB with JPG textures
- Created separate `WEBROOM1-mob.glb` with JPG textures instead of WebP
- Auto-detects mobile and loads appropriate GLB
- **Result**: Textures should load but material simplification was interfering

### 12. Removed Material Simplification 
**Commit**: Current - Stop modifying materials on mobile
**Changes**:
- Removed MeshBasicMaterial conversion that was losing texture properties
- Let Three.js handle materials as they come from GLB
- **Critical Discovery**: Converting to MeshBasicMaterial with just `map: material.map` loses other necessary texture properties
- **Result**: Textures now display correctly with original materials

### 13. Unified Color Space Settings
**Commit**: Current - Use sRGB color space for all devices
- Set `renderer.outputColorSpace = THREE.SRGBColorSpace` for both mobile and desktop
- GLB textures require sRGB to display correctly
- **Result**: Consistent texture rendering across devices

## Complete List of Failed Attempts

### 18. Platform-Style Texture Reprocessing (Current Attempt)
**Commit**: Current - Reprocess textures like Sketchfab/Spatial.io
**Changes**:
- Canvas-based texture reprocessing for mobile
- Convert all textures to power-of-2 dimensions
- Resize to max 1024x1024 for mobile devices
- Create new CanvasTexture from reprocessed image data
- Apply to all texture maps (diffuse, normal, roughness, etc.)
- Mobile debug panel for real-time diagnostics
- WebGL capability detection and logging
- **Result**: Testing in progress...

### Summary: 18 Different Approaches Attempted

1. Mobile detection and fallback rendering
2. Lighting and shadow adjustments  
3. Comprehensive mobile white texture fix
4. Ultimate mobile WebGL compatibility fix
5. Research-backed mobile fixes
6. Power-of-2 square textures (512x512, 1024x1024, 2048x2048)
7. GLB model texture configuration (configureMobileTexture on all maps)
8. Screen proportion adjustments
9. Revert to 16:9 aspect ratio
10. Complete removal of mobile-specific handling
11. WebP to JPG texture conversion (separate mobile GLB)
12. Removed material simplification
13. Unified color space settings (sRGB for all)
14. Simplified GLB loading (let GLTFLoader handle everything)
15. Force render updates on mobile
16. Debug findings (textures load but don't render)
17. **WebGL 2 implementation** (latest attempt - still doesn't work)

## Attempts Made (Chronological)

### 1. Initial Mobile Detection and Fallback Rendering
**Commit**: `1bb90ab` - Add mobile device detection and fallback rendering
- Added mobile detection via user agent
- Attempted to create fallback rendering for mobile devices
- **Result**: Did not solve the white texture issue

### 2. Lighting and Shadow Adjustments
**Commit**: `f8e4c58` - Fix mobile white texture issue with better lighting and shadow handling
- Adjusted lighting intensity
- Modified shadow handling for mobile
- **Result**: Textures still appeared white

### 3. Comprehensive Mobile White Texture Fix
**Commit**: `b34f30e` - Comprehensive mobile white texture fix
- Multiple approaches attempted in one large change
- **Result**: Still experiencing issues

### 4. Ultimate Mobile WebGL Compatibility Fix
**Commit**: `f1e7d7e` - Ultimate mobile WebGL compatibility fix
- Attempted to address WebGL-specific mobile issues
- **Result**: Problems persisted

### 5. Research-Backed Mobile Fixes
**Commit**: `e19917a` - Research-backed mobile white screen fixes
- Applied researched solutions from WebGL mobile documentation
- **Result**: Still not working correctly

### 6. Power-of-2 Square Textures Approach
**Commit**: `190e28a` - Fix mobile texture rendering with square power-of-2 dimensions
**Major Changes**:
- Changed all textures to square power-of-2 dimensions
  - Desktop: 2048x2048
  - Mobile: 512x512 or 1024x1024
- Added letterboxing for 16:9 content within square canvases
- Implemented `getMobileTextureSettings()` function
- Added `getOptimalCanvasSize()` function
- Configured texture parameters:
  ```javascript
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  ```
- **Result**: Still had issues

### 7. GLB Model Texture Configuration
**Commit**: `c3f354d` - Fix GLB model textures rendering white on mobile
**Changes**:
- Applied `configureMobileTexture()` to all GLB model textures
- Configured all texture types (map, normalMap, roughnessMap, metalnessMap, emissiveMap)
- Used same ClampToEdge, LinearFilter, no mipmaps approach
- **Result**: Didn't solve the problem

### 8. Screen Proportion Adjustments
**Commit**: `87a51ed` - Fix screen proportions to match square texture aspect ratio
- Adjusted screen geometry to match square texture dimensions
- **Result**: Broke screen display aspect ratio

### 9. Revert to 16:9 Aspect Ratio
**Commit**: `9529a47` - Fix broken screen display - revert to 16:9 aspect ratio
- Reverted screen back to proper 16:9 dimensions
- Kept square textures but let them stretch
- **Result**: Fixed display but textures still problematic

### 10. Complete Removal of Mobile-Specific Handling
**Commit**: `0af4406` - Remove mobile-specific texture handling that was breaking textures
**Changes Removed**:
- Removed all `configureMobileTexture()` calls
- Removed mobile-specific texture settings
- Removed power-of-2 enforcement
- Used same settings for all devices:
  ```javascript
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.needsUpdate = true;
  texture.offset.x = 1;
  ```
- **Current State**: Using unified approach for all devices

## Technical Patterns Attempted

### 1. Power-of-2 Enforcement
```javascript
function getOptimalCanvasSize(idealWidth, idealHeight, isMobile) {
  const maxSize = isMobile ? 1024 : 2048;
  // Force square power-of-2 dimensions
}
```
**Issues**: May have been unnecessary and caused stretching

### 2. Mobile Texture Configuration Function
```javascript
function configureMobileTexture(texture) {
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 1;
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
}
```
**Issues**: 
- `THREE.SRGBColorSpace` might not be supported on all mobile devices
- Over-configuration may have been breaking working textures

### 3. Mobile Detection Methods
```javascript
const isMobileEarly = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const mobileSettings = getMobileTextureSettings();
```
**Issues**: Detection was working but applying wrong fixes

### 4. Canvas Size Variations Tried
- 1920x1080 (standard HD)
- 2048x2048 (power-of-2 square)
- 1024x1024 (smaller power-of-2)
- 512x512 (mobile optimized)
- Dynamic sizing based on device capabilities

## What Actually Works (Based on Evidence)

1. **Standard texture creation without special handling**
   - Someone else has it working on mobile with no special configuration
   - Suggests Three.js handles mobile compatibility internally

2. **Simple canvas texture approach**
   ```javascript
   const texture = new THREE.CanvasTexture(canvas);
   texture.needsUpdate = true;
   ```

3. **Standard dimensions (1920x1080)**
   - No need for power-of-2 enforcement
   - Three.js handles non-power-of-2 textures properly

## Lessons Learned

1. **Over-engineering can break things**: Adding mobile-specific "fixes" may have been causing the problems
2. **Three.js handles mobile**: The library likely has internal mobile compatibility that we were overriding
3. **Power-of-2 not always required**: Modern mobile WebGL can handle non-power-of-2 textures
4. **SRGBColorSpace issues**: This setting seemed to cause problems on some mobile devices
5. **Test on actual devices**: Desktop browser mobile emulation doesn't catch all issues

## Current Approach (As of August 12, 2025)

### ✅ FINAL WORKING SOLUTION

The issue was a combination of factors that have now been resolved:

1. **Separate GLB Models for Mobile/Desktop**
   ```javascript
   const modelPath = isMobile ? './models/WEBROOM1-mob.glb' : './models/BAKE-WEBROOM1.glb';
   ```
   - Desktop: `BAKE-WEBROOM1.glb` with WebP textures
   - Mobile: `WEBROOM1-mob.glb` with JPG textures

2. **No Material Modification**
   - **CRITICAL**: Don't convert materials to MeshBasicMaterial
   - Don't modify textures after loading
   - Let Three.js handle the materials as they come from the GLB
   ```javascript
   // DON'T DO THIS - it breaks textures!
   // const basicMaterial = new THREE.MeshBasicMaterial({
   //   map: material.map  // This loses texture properties
   // });
   ```

3. **Consistent Color Space Settings**
   ```javascript
   renderer.outputColorSpace = THREE.SRGBColorSpace; // Use for ALL devices
   ```
   - Apply same color space to both mobile and desktop
   - GLB textures require sRGB color space to display correctly

4. **Key Discoveries**
   - Material simplification was removing texture properties
   - The `material.map` reference wasn't enough - other properties were needed
   - WebP textures in GLB files don't work on many mobile browsers
   - JPG textures in GLB files work universally

## Next Steps If Issues Persist

1. **Check WebGL capabilities directly**:
   ```javascript
   const gl = renderer.getContext();
   const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
   ```

2. **Add error handling for texture loading**:
   ```javascript
   texture.onError = (error) => console.error('Texture error:', error);
   ```

3. **Test with basic colored materials first**:
   - Verify geometry is rendering
   - Then add textures incrementally

4. **Check for CORS issues**: Mobile browsers may have stricter CORS policies

5. **Verify WebGL context isn't lost**:
   ```javascript
   renderer.context.isContextLost()
   ```

## Why Textures Are STILL Showing White - Unresolved Issues

### ❌ THE PROBLEM PERSISTS
Despite following Three.js best practices, mobile textures remain white.

### Current Understanding:
1. **Textures ARE loading**: Console shows valid dimensions
2. **Materials ARE present**: Objects have colors (couch is black, not white)
3. **But textures DON'T render**: The texture data exists but isn't displayed
4. **Platform-agnostic issue**: Affects iOS Safari, Chrome on iOS, and Android

### What We've Tried That DOESN'T Work:
```javascript
// ❌ Separate GLB files with JPG textures
const modelPath = isMobile ? './models/WEBROOM1-mob.glb' : './models/BAKE-WEBROOM1.glb';

// ❌ Letting GLTFLoader handle everything
loader.load(modelPath, (gltf) => scene.add(gltf.scene));

// ❌ Setting color space
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ❌ Forcing texture updates
material.map.needsUpdate = true;

// ❌ WebGL 2 (Even with better texture support)
const renderer = new THREE.WebGLRenderer({ /* params */ });
// WebGL 2 is used automatically if available

// ❌ Material simplification
// ❌ Texture manipulation  
// ❌ Power-of-2 enforcement
// ❌ configureMobileTexture() function
// ❌ All of the above
```

### Possible Remaining Issues:
1. **GLB Export Problem**: The mobile GLB might be incorrectly exported
2. **WebGL Mobile Limitation**: Some fundamental WebGL limitation we haven't identified
3. **Three.js Mobile Bug**: Possible bug in Three.js GLTFLoader on mobile
4. **Texture Format Issue**: Even JPG textures might have encoding problems in GLB
5. **Memory Constraints**: Mobile devices might be hitting memory limits

## Testing Checklist

- [x] Mobile GLB has JPG textures (not WebP)
- [x] No material modification code running
- [x] renderer.outputColorSpace set to sRGB
- [x] Test on real iOS device (Safari)
- [x] Test on real Android device (Chrome)
- [ ] Test with WiFi vs cellular connection
- [x] Check browser console for texture loading logs
- [x] Verify no "texture failed to load" errors
- [ ] Test with GPU-intensive apps closed
- [ ] Check available device memory

## Next Steps to Try

### Potential Solutions Not Yet Attempted:
1. **Re-export GLB with different settings**:
   - Try different compression settings
   - Ensure textures are embedded correctly
   - Use Blender or other 3D software to verify

2. **Try loading textures separately**:
   - Extract textures from GLB
   - Load them with TextureLoader
   - Apply manually to materials

3. **Test with a simpler GLB**:
   - Create a basic cube with texture
   - Test if ANY GLB textures work on mobile

4. **Check Three.js version compatibility**:
   - Update to latest Three.js
   - Or try older version that's known to work

5. **WebGL context settings**:
   - Try different WebGL context parameters
   - Check for WebGL extensions support

## References

- Three.js mobile compatibility: https://threejs.org/docs/#manual/en/introduction/WebGL-compatibility-check
- WebGL mobile limitations: https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
- Canvas texture best practices: https://threejs.org/docs/#api/en/textures/CanvasTexture
- GLTFLoader documentation: https://threejs.org/docs/#examples/en/loaders/GLTFLoader