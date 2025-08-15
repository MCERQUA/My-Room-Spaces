# Screen Sharing Implementation Guide

## Overview

This document provides comprehensive guidance on the screen sharing system implementation for the 3D Multi-user World Website. The system uses a hybrid architecture combining server coordination with WebRTC P2P streaming.

## ⚠️ CRITICAL WARNING ⚠️

**The screen sharing system is EXTREMELY SENSITIVE to modifications.** 

Changes to aspect ratios, geometry scaling, or canvas drawing operations can completely break functionality. Before making ANY changes related to the screen, read this entire document.

## Architecture Overview

### Two-Layer Hybrid System

1. **Server Coordination Layer** (Railway Backend)
   - Tracks active screen sharing sessions
   - Coordinates user presence and screen share states
   - Broadcasts screen share start/stop events
   - Maintains world state synchronization

2. **WebRTC P2P Video Layer** (Direct Browser-to-Browser)
   - Establishes peer-to-peer connections for video streaming
   - Handles screen capture and media stream transmission
   - Provides low-latency, high-quality video sharing

## Screen Geometry Requirements

### 🚨 DO NOT MODIFY THESE VALUES 🚨

```javascript
// Fallback screen geometry (MUST be 16:9)
const screenWidth = 16;
const screenHeight = 9;  // NOT 16! Must be 9 for 16:9 aspect ratio
const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);

// Screen position
displayScreen.position.set(0, 4.5, -10); // Y = 4.5, NOT 6
```

### GLB Model SHARESCREEN Object

- **NEVER** scale the Y-axis of the SHARESCREEN object
- **NEVER** change the aspect ratio from 16:9
- The GLB model's screen dimensions are pre-designed for 16:9 content

```javascript
// ❌ WRONG - This breaks screen sharing
shareScreenObject.scale.y = currentScale.y * (16/9);

// ✅ CORRECT - Leave scale unchanged
// shareScreenObject.scale remains at original GLB model values
```

## Canvas Texture Implementation

### Mobile-Compatible Square Textures

The system uses **square power-of-2 textures** for mobile compatibility:

```javascript
// Desktop: 2048x2048
// Mobile: 1024x1024, 512x512, or 256x256 based on device capability

const canvasSize = getOptimalCanvasSize(1920, 1080, isMobile);
canvas.width = canvasSize.width;   // Square dimension
canvas.height = canvasSize.height; // Same as width
```

### Critical Drawing Operations

**NEVER add letterboxing or aspect ratio compensation:**

```javascript
// ✅ CORRECT - Use full canvas dimensions
ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

// ❌ WRONG - Letterboxing breaks functionality
// const contentHeight = canvas.width * 9 / 16;
// ctx.drawImage(videoEl, 0, contentY, canvas.width, contentHeight);
```

The square texture will stretch to fit the 16:9 screen geometry - this is the correct behavior.

## Key Functions

### Screen Share Initialization

```javascript
async function startScreenShare() {
  // 1. Capture screen using WebRTC
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: true
  });
  
  // 2. Apply to local video element
  const videoEl = document.getElementById('video-element');
  videoEl.srcObject = stream;
  
  // 3. Start texture updates
  videoEl.addEventListener('loadeddata', () => updateScreenTexture());
  
  // 4. Server coordination
  socket.emit('screen-share-start', {
    streamId: stream.id,
    hasVideo: stream.getVideoTracks().length > 0,
    hasAudio: stream.getAudioTracks().length > 0
  });
  
  // 5. WebRTC P2P to existing users
  Object.keys(peers).forEach(userId => {
    connectToPeer(userId, true);
  });
}
```

### Texture Update Loop

```javascript
function updateScreenTexture() {
  if (videoEl.readyState >= videoEl.HAVE_CURRENT_DATA && largeScreen && largeScreen.canvas) {
    const ctx = largeScreen.canvas.getContext('2d');
    // CRITICAL: Use full canvas dimensions
    ctx.drawImage(videoEl, 0, 0, largeScreen.canvas.width, largeScreen.canvas.height);
    largeScreen.texture.needsUpdate = true;
  }
  
  if (currentStream && currentStream.active) {
    requestAnimationFrame(updateScreenTexture);
  }
}
```

### P2P Video Display

```javascript
function displaySharedStream(stream) {
  // Create hidden video element for P2P stream
  const videoEl = document.createElement('video');
  videoEl.srcObject = stream;
  videoEl.autoplay = true;
  
  // Update screen texture with P2P video
  function updateScreenFromPeer() {
    if (videoEl.readyState >= videoEl.HAVE_CURRENT_DATA && largeScreen && largeScreen.canvas) {
      const ctx = largeScreen.canvas.getContext('2d');
      // CRITICAL: Full canvas drawing
      ctx.drawImage(videoEl, 0, 0, largeScreen.canvas.width, largeScreen.canvas.height);
      largeScreen.texture.needsUpdate = true;
    }
    requestAnimationFrame(updateScreenFromPeer);
  }
}
```

## Mobile Texture Optimization

### Applied Mobile Fixes

The system includes comprehensive mobile texture optimization without breaking screen sharing:

```javascript
function configureMobileTexture(texture) {
  // Mobile-specific texture parameters
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 1;
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.needsUpdate = true;
}
```

### GLB Model Texture Configuration

All loaded GLB models have their textures configured for mobile:

```javascript
model.traverse((child) => {
  if (child.isMesh && child.material) {
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(material => {
      const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'];
      textureProps.forEach(prop => {
        if (material[prop] && (isMobileEarly || mobileSettings.isIOS || mobileSettings.isAndroid)) {
          configureMobileTexture(material[prop]);
        }
      });
    });
  }
});
```

## Server Events

### Server Coordination Events

```javascript
// Screen share started
socket.emit('screen-share-start', {
  streamId: stream.id,
  hasVideo: stream.getVideoTracks().length > 0,
  hasAudio: stream.getAudioTracks().length > 0,
  applyToObject: 'SHARESCREEN-HERE'
});

// Screen share stopped
socket.emit('screen-share-stop', {
  applyToObject: 'SHARESCREEN-HERE'
});

// Handle remote screen sharing
socket.on('screen-share-started', (data) => {
  // Show coordination indicator
  // Request P2P video stream
});
```

### WebRTC Signaling Events

```javascript
// WebRTC offer/answer/ice-candidate events
socket.on('webrtc-offer', (data) => {
  // Handle incoming peer connection
});

socket.on('webrtc-answer', (data) => {
  // Handle peer response
});

socket.on('webrtc-ice-candidate', (data) => {
  // Handle ICE candidate
});
```

## Common Issues and Solutions

### Screen Appears Squished or Distorted

**Cause**: Screen geometry was changed from 16:9 or letterboxing was added.

**Solution**: 
```javascript
// Ensure screen geometry is 16:9
const screenGeometry = new THREE.PlaneGeometry(16, 9); // NOT (16, 16)

// Ensure no letterboxing in canvas drawing
ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
```

### Screen Sharing Breaks After "Optimization"

**Cause**: Modifications to critical screen sharing functions.

**Solution**: Revert changes to:
- `startScreenShare()`
- `updateScreenTexture()`
- `displaySharedStream()`
- Screen geometry dimensions
- Canvas drawing operations

### Mobile Textures Appear White

**Cause**: Textures not configured for mobile WebGL limitations.

**Solution**: Apply mobile texture configuration:
```javascript
if (isMobileEarly || mobileSettings.isIOS || mobileSettings.isAndroid) {
  configureMobileTexture(texture);
}
```

## Testing Checklist

### Local Testing

1. **Single User Screen Share**:
   - Click "Share Desktop" button
   - Verify screen content appears on 3D display
   - Check aspect ratio is correct (not squished)
   - Verify audio playback works

2. **Multi-User Screen Share**:
   - Open multiple browser tabs
   - Share screen in one tab
   - Verify other tabs show "Remote screen share hosted by..." indicator
   - Verify actual video content streams via P2P

3. **Mobile Testing**:
   - Test on actual mobile devices (iOS Safari, Android Chrome)
   - Verify textures don't appear white
   - Check screen sharing works on mobile
   - Verify touch controls remain functional

### Production Testing

1. Deploy changes to staging environment
2. Test with multiple users from different networks
3. Verify WebRTC P2P connections establish successfully
4. Check Railway backend server coordination
5. Test on various devices and browsers

## Development Guidelines

### Before Making Changes

1. **Read this entire document**
2. **Understand the hybrid architecture**
3. **Identify if changes affect screen geometry or canvas drawing**
4. **Test thoroughly on both desktop and mobile**

### Safe Modification Areas

✅ **Safe to modify**:
- UI styling and positioning
- Chat and user avatar systems
- Object manipulation controls
- Non-screen related GLB model handling
- Server-side world state management

### Dangerous Modification Areas

🚨 **NEVER modify without extreme caution**:
- Screen geometry dimensions (16:9 aspect ratio)
- Canvas drawing operations (`ctx.drawImage` calls)
- `updateScreenTexture()` function
- WebRTC P2P connection setup
- GLB SHARESCREEN object scaling
- Screen material texture configuration

### Emergency Recovery

If screen sharing breaks after modifications:

1. **Immediate revert**: `git revert <commit-hash>`
2. **Check console errors** for WebRTC failures
3. **Verify screen geometry** is still 16:9
4. **Test canvas drawing** uses full dimensions
5. **Deploy quickly** to restore functionality

## Conclusion

The screen sharing system is a complex hybrid architecture that requires careful handling. The mobile texture optimizations have been successfully applied without disrupting functionality. Any future modifications must preserve the 16:9 screen geometry and avoid letterboxing operations to maintain compatibility.

Remember: **When in doubt, don't modify screen-related code.** The system is working correctly and is optimized for both desktop and mobile devices.