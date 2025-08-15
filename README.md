# 🌐 Self-Hosted Multi-user 3D World Website

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/MCERQUA/3D-threejs-site)

A modern, real-time 3D virtual world that multiple users can join and interact with together. Built with Three.js, Node.js, and WebRTC for seamless multi-user experiences with persistent world state and visitor tracking.

## ✨ Features

### 🧑‍🤝‍🧑 **Multi-User Experience**
- **Real-time User Avatars**: See other users as colored 3D spheres with name labels
- **Live Position Tracking**: Watch users move around the 3D world in real-time
- **Persistent User Sessions**: Users maintain their presence across browser refreshes
- **Clickable Name Editing**: Users can change their display names by clicking on them
- **User List Display**: Live list of all connected users in the top-right corner

### 🎮 **3D World Interaction**
- **WASD + Mouse Controls**: First-person navigation through the 3D environment
- **Object Manipulation**: Add, move, scale, rotate, and delete 3D objects (GLB/GLTF models)
- **Room Model Replacement**: Upload custom GLB room models with automatic processing
- **Screen Sharing**: Share your screen on the large display for all users to see
- **Dynamic Lighting**: Professional lighting with shadows and bloom effects
- **Mobile Support**: Touch controls and mobile-optimized rendering

### 💬 **Social Features**
- **Persistent World Chat**: Real-time messaging with chat history that persists across sessions
- **System Notifications**: Automated messages for user joins, name changes, etc.
- **Chat Toggle Interface**: Collapsible chat window in the bottom-left corner
- **Message Timestamps**: All messages include time stamps for context

### 🖥️ **Screen Sharing System**
- **Hybrid Architecture**: Server coordination + WebRTC P2P for optimal performance
- **Real-time Video Streaming**: Direct peer-to-peer connections for low latency
- **Audio Support**: Full audio playback with volume controls
- **Multi-user Support**: All users see the shared screen simultaneously
- **Video File Loading**: Drag-and-drop or file picker for local video files

### 🔧 **Technical Features**
- **Server-Authoritative Architecture**: Hetzner VPS-hosted Node.js server maintains world state
- **Real-time Synchronization**: Socket.IO for instant updates across all users
- **Persistent Object State**: All 3D object manipulations saved server-side and restored on connect
- **Automatic GLB Processing**: Smart texture extraction and mobile optimization
- **Screen Object Detection**: Automatic identification of display surfaces in models
- **Dedicated VPS Backend**: Hetzner VPS with 4 vCPUs, 16GB RAM for optimal performance
- **CDN Frontend**: Netlify-hosted static site with global CDN distribution
- **Visitor Counter**: Persistent visitor tracking that survives server restarts (Cloudflare KV)
- **Multi-Space Support**: Deploy multiple independent 3D environments with different GLB models

## 🎯 **Live Demo**

Visit the live website: [**my-room.chat**](https://my-room.chat/) or [**3D Multi-user World**](https://3d-threejs-site.netlify.app)

## 🚀 Quick Start

### Option 1: Production Deployment

1. **Deploy Frontend**: [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/MCERQUA/3D-threejs-site)

2. **Backend Server**: Already deployed on Hetzner VPS at `http://178.156.181.117:3001`

3. **Connect Frontend to Backend**: The `SIGNALING_SERVER` URL in `index.html` is pre-configured for the Hetzner VPS

### Option 2: Manual Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/3D-threejs-site.git
cd 3D-threejs-site

# 2. Install dependencies
npm install

# 3. Start local development
npm start          # Frontend (http://localhost:8080)
npm run dev        # Backend (http://localhost:3001)
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Netlify CDN   │    │  Hetzner VPS    │    │   WebRTC P2P    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│  (Media Stream) │
│                 │    │                 │    │                 │
│ • Static Site   │    │ • World State   │    │ • Screen Share  │
│ • Three.js      │    │ • User Management│   │ • Video Stream  │
│ • WebRTC Client │    │ • Socket.IO Hub │    │ • Direct P2P    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **Frontend (Netlify)**: Static Three.js application with WebRTC capabilities
- **Backend (Hetzner VPS)**: Node.js server managing world state and real-time events
- **WebRTC Layer**: Direct peer-to-peer connections for screen sharing
- **Persistent Storage**: Server-side world state with object persistence

## 🛠️ **Tech Stack**

### Frontend
- **[Three.js](https://threejs.org/)**: 3D graphics and rendering
- **[WebRTC](https://webrtc.org/)**: Peer-to-peer media streaming
- **[Socket.IO Client](https://socket.io/)**: Real-time communication
- **Pure HTML/CSS/JS**: No build process required

### Backend
- **[Node.js](https://nodejs.org/)**: Server runtime
- **[Express.js](https://expressjs.com/)**: Web framework
- **[Socket.IO](https://socket.io/)**: Real-time bidirectional communication
- **PostgreSQL**: Persistent database storage
- **Redis**: High-performance caching

### Hosting
- **[Netlify](https://netlify.com/)**: Frontend CDN and deployment
- **[Hetzner VPS](https://hetzner.com/)**: Dedicated backend server (4 vCPUs, 16GB RAM)

## 📖 Documentation

### 📚 User Documentation
- **[Quick Start Guide](user-docs/quick-start.md)** - Get started in minutes
- **[Controls & Navigation](user-docs/controls.md)** - Complete control reference
- **[Screen Objects Guide](user-docs/screen-objects.md)** - Understanding display screens in 3D models
- **[GLB Processing Guide](user-docs/glb-processing.md)** - How models are optimized
- **[User Documentation Hub](user-docs/README.md)** - All user guides in one place

### Setup Guides
- **[Complete Setup Guide](docs/SETUP.md)** - Detailed deployment instructions
- **[Netlify Deployment](docs/netlify-deployment.md)** - Frontend hosting setup
- **[VPS Migration Guide](docs/VPS_MIGRATION_GUIDE.md)** - Complete VPS setup instructions

### Technical Documentation
- **[User Guide](docs/USER_GUIDE.md)** - Comprehensive feature reference
- **[GLB Processing System](docs/GLB_PROCESSING.md)** - Technical details of model processing
- **[Multi-Space Deployment](docs/MULTI_SPACE_DEPLOYMENT.md)** - Deploy multiple independent 3D environments
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Contributing](docs/CONTRIBUTING.md)** - Development setup and guidelines

## 🎮 **How to Use**

### **Multi-User Features**
1. **Join the World** - Open the website to automatically connect
2. **See Other Users** - Colored spheres represent other connected users
3. **Edit Your Name** - Click your green underlined name in the user list (top-right)
4. **Chat with Others** - Click the 💬 button to open the chat interface
5. **Watch User Movement** - See others navigate the 3D world in real-time

### **3D World Navigation**
- **Desktop**: WASD keys + mouse drag to look around
- **Mobile**: Touch and drag to move camera, double-tap to move forward
- **Movement**: Real-time position updates visible to all users

### **Screen Sharing (Multi-user)**
1. **Click "🖥️ Share Desktop Screen"** - Your screen appears for everyone
2. **Select screen/window** to share via browser dialog
3. **All users see your screen** on the large display simultaneously
4. **WebRTC P2P streaming** ensures low latency for all viewers
5. **Stop sharing** with the "⏹️ Stop Sharing" button

### **3D Object Interaction**
1. **Load Models**: Drag GLB/GLTF files or use the 📦 menu button
2. **Replace Room Model**: Upload custom room GLB with automatic mobile optimization
3. **Select Objects**: Click any object to select (cyan wireframe appears)
4. **Manipulate Objects**: Use control panel buttons or keyboard shortcuts
5. **Persistent Changes**: All object modifications sync to all users in real-time
6. **Server Storage**: Objects persist even after page refresh

### **Social Chat System**
- **Open Chat**: Click 💬 button in bottom-left corner
- **Send Messages**: Type message and press Enter or click Send
- **Message History**: Previous messages load when you join
- **System Notifications**: See when users join, leave, or change names
- **Timestamps**: All messages show time stamps

### **Keyboard Shortcuts**
```
WASD / Arrow Keys - Camera movement (synced to other users)
R - Reset selected object
Q - Rotate selected object  
E - Scale up selected object
C - Scale down selected object
DELETE/BACKSPACE - Delete selected object
ESCAPE - Deselect object
ENTER - Send chat message (when input focused)
```

## 🌐 **Browser Requirements**

### **For Full Multi-User Experience**
- **Chrome/Edge** 88+ (recommended for screen sharing)
- **Firefox** 87+ (full WebRTC support)
- **Safari** 14+ (limited screen sharing on macOS)

### **For 3D World Participation**
- Any **WebGL-compatible browser**
- **Mobile browsers** (iOS Safari, Chrome Mobile)
- **WebSocket support** (all modern browsers)

## 🔒 Privacy & Security

- **No Data Collection**: No analytics, tracking, or personal data storage
- **Temporary Sessions**: User data only exists during active sessions
- **WebRTC Encryption**: All P2P media streams are encrypted
- **Open Source**: Full transparency with public source code

## 🌍 Multi-Space Deployment

Deploy multiple independent 3D environments with different GLB room models:

### **Access Different Spaces**
- **Default Space**: `yourdomain.com`
- **White Room**: `yourdomain.com/?space=white` or `yourdomain.com/white`
- **Custom Spaces**: Add your own GLB models and configure in `spaces-config.js`

### **Quick Setup**
1. Add your GLB file to `models/` directory
2. Configure the space in `spaces-config.js`
3. Access via URL parameter: `?space=yourspace`

See the [Multi-Space Deployment Guide](docs/MULTI_SPACE_DEPLOYMENT.md) for complete instructions.

## 💡 Use Cases

- **Virtual Meetings**: Host 3D meetings with screen sharing
- **Educational Spaces**: Create interactive learning environments
- **Social Hangouts**: Casual virtual spaces for friends and communities
- **Collaborative Design**: Share and discuss 3D models in real-time
- **Event Hosting**: Virtual events, presentations, and exhibitions
- **Multiple Environments**: Deploy different spaces for different purposes

## 🛠️ **Development**

### **File Structure**
```
├── index.html              # Main application (5000+ lines)
├── signaling-server.js     # Hetzner VPS persistent world server (350+ lines)
├── glb-processor.js        # Node.js GLB processing tool
├── glb-processor-client.js # Browser-based GLB processor
├── package.json            # Dependencies and scripts
├── netlify.toml           # Static site deployment config
├── models/                # GLB models directory
│   ├── BAKE-WEBROOM1.glb  # Desktop room model
│   └── unpacked-mobile/   # Mobile-optimized assets
├── user-docs/             # User documentation
│   ├── README.md          # Documentation hub
│   ├── quick-start.md     # Getting started guide
│   ├── controls.md        # Control reference
│   ├── screen-objects.md  # Screen object guide
│   └── glb-processing.md  # Model processing guide
└── docs/                  # Technical documentation
    ├── SETUP.md           # Complete setup guide
    ├── USER_GUIDE.md      # Feature reference
    ├── GLB_PROCESSING.md  # Processing system details
    └── ...                # Additional documentation
```

### **Local Development Workflow**
```bash
# 1. Start backend server
npm run dev                 # Runs on http://localhost:3001

# 2. Start frontend (separate terminal)
npm start                   # Runs on http://localhost:8080

# 3. Test multi-user features
# Open multiple browser tabs to http://localhost:8080
```

## 📈 Roadmap

### Recently Completed ✅
- [x] Automatic GLB processing for mobile compatibility
- [x] Room model replacement feature
- [x] Screen object detection and handling
- [x] Comprehensive user documentation

### Coming Soon
- [ ] VR/AR Support (WebXR integration)
- [ ] Voice Chat (WebRTC audio)
- [ ] Custom Avatar Systems
- [ ] Persistent Object Storage (Database integration)
- [ ] Multiple independent screens
- [ ] Room/World Management
- [ ] Admin Controls and Moderation
- [ ] Mobile App (React Native)

## 📄 **License**

MIT License - Feel free to fork, modify, and use for your own projects!

## 🤝 **Contributing**

We welcome contributions! See our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Quick Contribution Steps
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🔗 Links

- **[Live Demo](https://3d-threejs-site.netlify.app/)**
- **[GitHub Repository](https://github.com/MCERQUA/3D-threejs-site)**
- **[Documentation](docs/)**
- **[Issues & Support](https://github.com/MCERQUA/3D-threejs-site/issues)**

---

**Built with ❤️ by the open-source community**

*Star ⭐ this repository if you find it useful!*