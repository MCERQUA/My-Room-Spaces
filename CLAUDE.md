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

#### Persistent World & Multi-User System (v2.0 - Railway Backend)
- **Server-Authoritative Architecture**: Railway-hosted Node.js server maintains world state
- **Real-time User Avatars**: 3D spheres with username labels track all connected users
- **Persistent Object State**: All 3D object manipulations saved server-side and restored on connect
- **Hybrid Screen Sharing**: Server coordination + WebRTC P2P for optimal performance
- **Auto-Join Main Room**: Users automatically connect to shared persistent world
- **Position Tracking**: Real-time user camera position/rotation synchronization (100ms throttled)

#### Object Manipulation System
- **Selection**: Click objects to select (shows cyan wireframe)
- **6-DOF Movement**: Up/down, left/right, forward/backward controls
- **Scaling**: Uniform scale up/down with + and - buttons
- **Rotation**: Y-axis rotation in 45-degree increments
- **Reset**: Return objects to original position/scale/rotation
- **Deletion**: Remove objects from scene

### File Structure
```
index.html              # Main application with social features (2400+ lines)
├── 3D Scene Components # Three.js setup, lighting, objects, cameras
├── User Avatar System  # Real-time multi-user presence with 3D spheres
├── Screen Sharing      # Hybrid server coordination + WebRTC P2P video
├── Social Features     # User list (top right) + persistent chat interface
├── Object Manipulation # Server-mediated 3D object interactions
└── Mobile Touch        # Touch controls and responsive design

signaling-server.js     # Railway persistent world server (350+ lines)
├── World State API     # /api/world-state, /api/users, /api/objects
├── Real-time Events    # Socket.IO user/object/chat/screen sharing
├── Avatar Management   # User spawning, position tracking, cleanup
└── Chat System         # Message persistence and broadcasting

models/                 # Optional GLB models directory
netlify.toml           # Static site deployment configuration
CLAUDE.md              # Complete v2.0 architecture documentation
```

## Important Implementation Details

### Railway Backend Server Configuration (v2.0)
The persistent world server is configured in `index.html` around line 826:
```javascript
const SIGNALING_SERVER = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001'  // Local development
  : 'https://3d-threejs-site-production.up.railway.app';  // Railway backend
```

**Server Features:**
- **Persistent World State**: `worldState` object maintains objects, users, screen sharing, chat
- **API Endpoints**: `/api/world-state`, `/api/users`, `/api/objects` for debugging
- **Auto-cleanup**: Removes stale chat messages and optionally old objects
- **Health Check**: Root endpoint shows server status and world statistics

### Screen Texture Updates
Video content is rendered to canvas and continuously updated via `requestAnimationFrame`:
```javascript
function updateScreenTexture() {
  const ctx = largeScreen.canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, largeScreen.canvas.width, largeScreen.canvas.height);
  largeScreen.texture.needsUpdate = true;
}
```

### Object Data Structure & Server Synchronization
All interactive objects store metadata in `userData` and sync with server:
```javascript
object.userData = {
  name: 'Object Name',
  type: 'model|display',
  objectId: 'unique-generated-id',  // For server tracking
  originalPosition: Vector3,
  originalScale: Vector3, 
  originalRotation: Euler
};
```

**Server-Mediated Object Events:**
- `object-add`: New objects saved permanently to server world state
- `object-move`: Position/rotation/scale changes broadcast to all users
- `object-delete`: Objects removed from server and all connected clients
- `world-state`: Complete world sync sent to new users on connection

### Hybrid Screen Sharing Architecture (v2.0)
**Two-Layer System for Optimal Performance:**

1. **Server Coordination Layer** (`signaling-server.js`):
   - Tracks who is currently sharing screen via `worldState.sharedScreen`
   - Broadcasts `screen-share-started` / `screen-share-stopped` events
   - Shows coordination indicators: "Remote screen share hosted by username"
   - Handles user join/leave during active screen sharing

2. **WebRTC P2P Video Layer** (`index.html` lines 1176-1196):
   - Screen sharer establishes direct P2P connections to all users
   - Uses existing `connectToPeer(userId, true)` function with `currentStream`
   - `displaySharedStream()` renders received video to 3D screen texture
   - Automatic connections for users who join during active sharing

**Key Functions:**
- `startScreenShare()`: Captures screen + initiates P2P to existing users
- `displaySharedStream(stream)`: Renders P2P video to large screen object
- `handleRemoteScreenShare()`: Shows server coordination indicators
- `connectToPeer()`: Handles WebRTC signaling via Socket.IO events

### User Avatar System (v2.0)
**Real-time Multi-User Presence:**
```javascript
function spawnUserAvatar(userId, avatar) {
  // Creates 3D sphere with random color
  // Adds canvas-based username label above avatar
  // Tracks position in userAvatars Map for efficient updates
}
```

**Position Synchronization:**
- `trackUserPosition()`: 100ms throttled camera position/rotation updates
- `user-move` events broadcast to all connected users via server
- Smooth avatar movement without performance impact

### Social Features & UI Components (v2.0)
**User List (Top Right Corner):**
```javascript
function updateUserList() {
  // Real-time user list with current user highlighted
  // Updates automatically on user join/leave events
  // Clean text styling with shadows for 3D background visibility
}
```

**Persistent World Chat Interface:**
- **Location**: Bottom left corner (350x200px) with toggle functionality
- **Features**: Scrollable messages, timestamps, usernames, server persistence
- **Input**: Enter key or Send button support with 200 character limit
- **Toggle**: 💬/❌ button to show/hide chat interface
- **Integration**: Uses Railway backend `chat-message` events for real-time sync
- **Performance**: Auto-scroll, 50 message limit, prevents 3D scene interference

**Key Functions:**
- `displayChatMessage(message)`: Renders chat messages with timestamps
- `sendChatMessage()`: Emits messages to server via Socket.IO
- `toggleChat()`: Show/hide chat interface
- `updateUserList()`: Syncs user list with active avatars

### Mobile Touch Controls
- **Single tap**: Object selection
- **Double tap**: Move forward
- **Drag**: Camera rotation (first-person view)
- **Touch-friendly UI**: Larger buttons and responsive design

## Debugging & Common Issues

### Screen Sharing Problems (v2.0 Updates)
- **Server Coordination Working But No Video**: Check WebRTC P2P connections in browser console
- **"Remote screen share hosted by..." Shows But No Video**: P2P video layer issue - check SimplePeer connections
- **Duplicate Function Errors**: Ensure no duplicate `handleRemoteScreenShare` declarations
- Requires HTTPS in production (Netlify provides this automatically)
- Check browser permissions for screen capture
- Some browsers (Safari) have limited screen sharing support

### WebRTC P2P Debugging
- **Check Console for WebRTC Events**: Look for `📨 WebRTC offer/answer/ice-candidate` messages
- **Verify Peer Connections**: `peers` object should contain active SimplePeer instances
- **Stream Validation**: `currentStream.active` should be true when sharing
- **Signaling Server**: Ensure Railway backend is accessible and Socket.IO connected

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

### Railway Backend Deployment (v2.0)
- **Production URL**: `https://3d-threejs-site-production.up.railway.app`
- **Features**: Persistent world state, user avatars, screen sharing coordination
- **API Endpoints**: Health check and world state debugging at root URL
- **Auto-scaling**: Railway handles traffic and server resources automatically

### Development Workflow (v2.0)
1. **Local Development**: 
   - Run `npm run dev` to start Railway server on port 3001
   - Open `http://localhost:8080` for frontend (served by `npm start` or live server)
   - Test multi-user features by opening multiple browser tabs

2. **Testing Screen Sharing**:
   - Start screen sharing in one tab
   - Verify "Remote screen share hosted by..." appears in other tabs
   - Check that actual video content streams via WebRTC P2P
   - Test user join/leave during active screen sharing

3. **Avatar & Object Testing**:
   - Move around in one tab, verify avatar moves in other tabs
   - Add/move/delete objects, verify persistence across sessions
   - Check user count updates properly

4. **Social Features Testing**:
   - **User List**: Open multiple tabs, verify all usernames appear in top right
   - **Chat Interface**: Type messages in one tab, see them in all other tabs
   - **Chat Toggle**: Click 💬 button to show/hide chat interface
   - **Message Persistence**: Refresh page, verify chat history is restored
   - **Real-time Updates**: Join/leave users, verify user list updates immediately

## Recent Major Changes (v2.0 Architecture Upgrade)

### Migration from Cloudflare Workers to Railway (August 2025)
- **Previous**: Pure P2P with Cloudflare Workers signaling
- **Current**: Hybrid server-authoritative + P2P architecture
- **Benefits**: Persistent world state, reliable user management, better scalability

### Key Files Modified:
- `signaling-server.js`: Comprehensive persistent world server (300+ lines)
- `index.html`: Added server-mediated events, avatar system, hybrid screen sharing, social features
- `CLAUDE.md`: Complete documentation of v2.0 architecture

### Recent Feature Additions (August 2025):
- **Social Features**: User list (top right) and persistent world chat interface
- **Real-time Communication**: Chat messages with timestamps and server persistence
- **UI Components**: Toggleable chat interface with mobile responsive design
- **WebRTC P2P Video Streaming**: Fixed actual video sharing between users

### Breaking Changes:
- Object manipulation now server-mediated (not pure P2P)
- User avatars require server connection
- Screen sharing uses hybrid approach (coordination + P2P video)
- Chat interface adds new UI elements and Socket.IO events