# Mobile Texture Rendering Attempts Documentation

## Overview
This document tracks all the different approaches we've tried to fix mobile texture rendering issues in the 3D Three.js site. The main problem has been textures appearing white or not rendering correctly on mobile devices, while working fine on desktop.

## Key Finding
**Someone else has it working on mobile without special handling**, suggesting our "fixes" may have been making things worse.

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

## Current Approach (As of Latest Commit)

- **No mobile-specific texture handling**
- **Same code path for all devices**
- **Standard HD canvas dimensions (1920x1080)**
- **Let Three.js handle compatibility internally**

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

## Testing Checklist

- [ ] Test on real iOS device (Safari)
- [ ] Test on real Android device (Chrome)
- [ ] Test with WiFi vs cellular connection
- [ ] Test with different texture sizes
- [ ] Check browser console for WebGL errors
- [ ] Verify textures load without CORS issues
- [ ] Test with GPU-intensive apps closed
- [ ] Check available device memory

## References

- Three.js mobile compatibility: https://threejs.org/docs/#manual/en/introduction/WebGL-compatibility-check
- WebGL mobile limitations: https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
- Canvas texture best practices: https://threejs.org/docs/#api/en/textures/CanvasTexture