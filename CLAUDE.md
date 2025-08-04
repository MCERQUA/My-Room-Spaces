# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
```bash
# Start local development server (preferred)
npm run dev

# Alternative local server
npm start

# Deploy to production
npm run deploy
```

### Testing the Application
- Open browser to `http://localhost:8080` after running dev server
- Test screen sharing requires HTTPS (works on deployed version)
- Drag GLB/GLTF files onto browser window to test model loading
- Use WASD keys + mouse to navigate 3D scene

## Architecture Overview

### Single-File Application Structure
This is a **single-file Three.js application** (`index.html`) containing:
- Complete HTML structure with embedded CSS styling
- All JavaScript code in a single `<script type="module">` block
- Three.js imported via ES6 modules from unpkg CDN
- No build process required - runs directly in browser

### Key Components

#### 3D Scene Architecture
- **Scene Management**: Three.js scene with camera, renderer, lighting
- **Floor**: Ground plane with shadow receiving
- **Large Display Screen**: 16:9 screen for video/screen sharing content
- **Dynamic Objects**: User-loaded GLB models with manipulation controls
- **Selection System**: Raycasting for object selection with cyan wireframe outlines

#### Screen Sharing & Media System
- **WebRTC Screen Capture**: `navigator.mediaDevices.getDisplayMedia()` 
- **Canvas Texture Pipeline**: Video streams rendered to canvas then mapped to 3D screen
- **Audio Support**: Full audio playback with volume controls
- **Video File Loading**: Drag-and-drop or file picker for local video files

#### P2P Room Sharing System  
- **WebRTC P2P**: SimplePeer library for peer-to-peer connections
- **Socket.IO Signaling**: External signaling server for initial handshake
- **Main Room Auto-Join**: Users automatically join shared space (2-4 users max)
- **Stream Broadcasting**: Host's screen/video shared to all room members
- **Fallback Mode**: Works locally without signaling server

#### Object Manipulation System
- **Selection**: Click objects to select (shows cyan wireframe)
- **6-DOF Movement**: Up/down, left/right, forward/backward controls
- **Scaling**: Uniform scale up/down with + and - buttons
- **Rotation**: Y-axis rotation in 45-degree increments
- **Reset**: Return objects to original position/scale/rotation
- **Deletion**: Remove objects from scene

### File Structure
```
index.html              # Main application (entire app in one file)
models/                 # Optional GLB models directory
signaling-server.js     # P2P signaling server (deploy separately)
server-package.json     # Signaling server dependencies
netlify.toml           # Deployment configuration
ROOM-SHARING-SETUP.md  # P2P setup instructions
```

## Important Implementation Details

### P2P Signaling Server Configuration
The signaling server URLs are hardcoded in `index.html` around line 515:
```javascript
const signalingUrls = [
  'https://threejs-signaling.herokuapp.com',
  'https://threejs-signaling.railway.app', 
  'https://your-signaling-server.netlify.app'
];
```
Update these URLs when deploying the signaling server to enable cross-device room sharing.

### Screen Texture Updates
Video content is rendered to canvas and continuously updated via `requestAnimationFrame`:
```javascript
function updateScreenTexture() {
  const ctx = largeScreen.canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, largeScreen.canvas.width, largeScreen.canvas.height);
  largeScreen.texture.needsUpdate = true;
}
```

### Object Data Structure
All interactive objects store metadata in `userData`:
```javascript
object.userData = {
  name: 'Object Name',
  type: 'model|display',
  originalPosition: Vector3,
  originalScale: Vector3, 
  originalRotation: Euler
};
```

### Mobile Touch Controls
- **Single tap**: Object selection
- **Double tap**: Move forward
- **Drag**: Camera rotation (first-person view)
- **Touch-friendly UI**: Larger buttons and responsive design

## Debugging & Common Issues

### Screen Sharing Problems
- Requires HTTPS in production (Netlify provides this automatically)
- Check browser permissions for screen capture
- Some browsers (Safari) have limited screen sharing support

### Model Loading Issues
- Only GLB and GLTF formats supported
- Large models may cause performance issues
- Models automatically receive shadows and lighting

### P2P Connection Issues
- Signaling server must be deployed and accessible
- Check browser console for WebRTC connection errors
- Firewall/NAT may block peer connections (rare)

### Performance Considerations
- Shadow mapping enabled (may impact older devices)
- Real-time texture updates for video content
- Canvas size is 1920x1080 for screen texture

## Deployment Notes

### Static Site Deployment
- No build process required
- Deploy `index.html` and `models/` directory
- Netlify configuration in `netlify.toml` handles caching and security headers

### Signaling Server Deployment
- Deploy `signaling-server.js` to Node.js hosting (Railway, Heroku, Render)
- Uses Express + Socket.IO
- Supports auto-join to main shared room
- Handles up to 4 concurrent users per room