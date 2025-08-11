# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the **Self-Hosted Multi-user 3D World Website**.

## Project Overview

This is a **real-time multi-user 3D virtual world** where users can:
- See each other as 3D avatars with name labels
- Share screens via WebRTC P2P streaming
- Chat in real-time with persistent message history
- Collaboratively manipulate 3D objects
- Edit their display names by clicking them

## Development Commands

### Local Development
```bash
# Start backend server (required for multi-user features)
npm run dev                 # Railway server on localhost:3001

# Start frontend (separate terminal)
npm start                   # Static site on localhost:8080

# Deploy to production
git push origin main        # Auto-deploys to Netlify + Railway
```

### Testing Multi-User Features
- Backend must be running (`npm run dev`) for multi-user functionality
- Open multiple browser tabs to `http://localhost:8080` to test multi-user
- Test real-time avatar movement, chat, screen sharing, object synchronization
- Check browser console for Socket.IO connection messages

## Architecture Overview

### Hybrid Multi-User Architecture
This is a **hybrid client-server application** with:
- **Frontend**: Single-file Three.js application (`index.html`) hosted on Netlify
- **Backend**: Node.js Socket.IO server (`signaling-server.js`) hosted on Railway
- **WebRTC Layer**: Direct P2P connections for screen sharing between users

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
index.html              # Main application with multi-user features (2400+ lines)
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

docs/                   # Comprehensive documentation
├── SETUP.md           # Complete deployment guide
├── USER_GUIDE.md      # All features and how to use them
├── netlify-deployment.md  # Frontend hosting setup
├── railway-deployment.md  # Backend server setup
├── TROUBLESHOOTING.md # Common issues and solutions
├── CONTRIBUTING.md    # Development and contribution guide
└── UI_STYLING_GUIDE.md # Glassmorphism UI design system & guidelines

models/                 # Optional GLB models directory
netlify.toml           # Static site deployment configuration
README.md              # Project overview and quick start
CLAUDE.md              # This documentation file
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

## ⚠️ CRITICAL: Screen Share Implementation Notes

### **DO NOT MODIFY SCREEN SHARE ASPECT RATIOS OR GEOMETRY**

The screen sharing system is **EXTREMELY SENSITIVE** to changes in:

1. **Screen Geometry Dimensions**: 
   - Large screen is **16:9 aspect ratio** (16 width × 9 height)
   - GLB model SHARESCREEN object must remain at original scale
   - Fallback screen PlaneGeometry must be (16, 9)

2. **Canvas Texture Dimensions**:
   - Can use square power-of-2 textures (512×512, 1024×1024, 2048×2048)
   - Texture will stretch to fit 16:9 screen geometry (this is correct behavior)
   - **DO NOT** add letterboxing or aspect ratio compensation

3. **Critical Functions That Must Not Be Changed**:
   - `updateScreenTexture()` in `startScreenShare()`
   - `displaySharedStream()` for P2P video
   - Canvas drawing: `ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)`

### **What Breaks Screen Share**:
- Changing screen geometry from 16:9 to square
- Adding letterboxing to canvas drawing operations  
- Modifying GLB SHARESCREEN object scale
- Changing canvas drawing coordinates (must use full canvas dimensions)
- Altering texture wrap modes on screen materials

### **Mobile Texture Fixes Applied**:
- Square power-of-2 canvas textures for mobile compatibility
- Mobile texture parameters: ClampToEdgeWrapping, LinearFilter, no mipmaps
- GLB model textures configured for mobile WebGL compatibility
- Screen functionality preserved during mobile optimization

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
**Modern Glassmorphism UI Design:**
- **Design System**: Consistent glass-effect panels with backdrop blur
- **Color Palette**: White text on transparent backgrounds with blue accents
- **Component Library**: Glass menu, user list, chat, dialogs, controls
- **Responsive**: Mobile-optimized with proper touch interactions
- **Guidelines**: See `docs/UI_STYLING_GUIDE.md` for complete design system

**Glass Menu (Top Left):**
- Icon-based navigation with hover tooltips
- Home, Screen Share, Objects, Help buttons
- Minimalist design to maximize 3D scene visibility

**User List (Top Right):**
- Glass panel showing online users with count badge
- Editable username with click-to-edit functionality
- Real-time updates on user join/leave

**Chat Interface (Bottom Right):**
- Glass panel with scrollable message history
- Persistent messages stored on server
- 200 character limit with timestamp display
- Toggle button for show/hide functionality

**Welcome Dialog:**
- Appears on first connection for name entry
- Glass-styled modal with overlay
- Mobile-friendly with button support
- Falls back to generated username if empty

**Key UI Functions:**
- `showWelcomeDialog()`: Initial name entry modal
- `displayChatMessage(message)`: Renders chat messages
- `updateUserList()`: Syncs user list display
- `editUserName()`: Inline username editing

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

## Documentation Structure

### Comprehensive Documentation Suite
The project now includes extensive documentation for users and developers:

**Setup and Deployment:**
- `README.md`: Project overview with one-click deploy buttons
- `docs/SETUP.md`: Complete setup guide with troubleshooting
- `docs/netlify-deployment.md`: Detailed Netlify frontend deployment
- `docs/railway-deployment.md`: Detailed Railway backend deployment

**User Documentation:**
- `docs/USER_GUIDE.md`: Complete feature reference with screenshots and examples
- `docs/TROUBLESHOOTING.md`: Common issues, solutions, and debugging techniques

**Developer Documentation:**
- `docs/CONTRIBUTING.md`: Development setup, coding standards, and contribution process
- `CLAUDE.md`: This file - technical architecture and development guidance

### Documentation Maintenance
- **Keep docs updated** when adding new features
- **Test all examples** in documentation to ensure accuracy
- **Include screenshots** for visual features when possible
- **Provide troubleshooting** for common issues with new features

## UI Styling Guidelines

### Glassmorphism Design System
The UI uses a modern glassmorphism design with:
- **Backdrop blur** for frosted glass effect
- **Semi-transparent backgrounds** (rgba white 0.1-0.2)
- **Rounded corners** (16px for panels, 10-12px for buttons)
- **Consistent shadows** for depth perception
- **Smooth transitions** (0.3s ease) on all interactions

### Maintaining UI Consistency
When adding new UI elements:
1. **Reference the style guide**: `docs/UI_STYLING_GUIDE.md`
2. **Use existing components** as templates
3. **Follow the color palette**:
   - White text: `#ffffff`
   - Muted text: `rgba(255, 255, 255, 0.7)`
   - Accent blue: `#4a90e2` / `rgba(74, 144, 226, 0.3)`
4. **Apply glass panel base styles**:
   ```css
   background: rgba(255, 255, 255, 0.1);
   backdrop-filter: blur(10px);
   border: 1px solid rgba(255, 255, 255, 0.2);
   border-radius: 16px;
   box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
   ```
5. **Test on mobile** for responsive behavior

## Recent Major Changes (v2.0 Architecture Upgrade)

### Migration from Cloudflare Workers to Railway (August 2025)
- **Previous**: Pure P2P with Cloudflare Workers signaling
- **Current**: Hybrid server-authoritative + P2P architecture with comprehensive documentation
- **Benefits**: Persistent world state, reliable user management, better scalability, easy deployment

### Key Files Added/Modified:
- `signaling-server.js`: Comprehensive persistent world server (350+ lines)
- `index.html`: Added server-mediated events, avatar system, hybrid screen sharing, social features
- `docs/`: Complete documentation suite for setup, usage, and development
- `README.md`: Updated for multi-user architecture with deployment guides

### Recent Feature Additions (August 2025):
- **Social Features**: User list (top right) and persistent world chat interface
- **Real-time Name Editing**: Click to edit usernames with real-time sync
- **Comprehensive Documentation**: Full setup, user, and developer guides
- **One-Click Deployment**: Netlify and Railway deploy buttons
- **WebRTC P2P Video Streaming**: Fixed actual video sharing between users

### Breaking Changes:
- Object manipulation now server-mediated (not pure P2P)
- User avatars require server connection
- Screen sharing uses hybrid approach (coordination + P2P video)
- Chat interface adds new UI elements and Socket.IO events