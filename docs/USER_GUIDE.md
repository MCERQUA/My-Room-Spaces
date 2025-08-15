# 📚 User Guide - Complete Feature Reference

Welcome to your Self-Hosted Multi-user 3D World! This guide covers all features and how to use them.

## 🚀 Getting Started

### First Visit

1. **Open the website** in your browser
2. **Automatic connection** - You'll connect to the world server automatically
3. **Your avatar appears** - A colored sphere represents you in the 3D world
4. **See other users** - Other connected users appear as colored spheres with name labels

### Interface Overview

```
┌─────────────────────────────────────────────────────┐
│  🖥️ Share Screen    [Object Controls]     👥 Users │  ← Top Bar
├─────────────────────────────────────────────────────┤
│                                                     │
│              3D World View                          │  ← Main View
│          (WASD to move around)                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 💬 Chat                                             │  ← Bottom Left
└─────────────────────────────────────────────────────┘
```

## 🧑‍🤝‍🧑 Multi-User Features

### User Avatars

**What you see:**
- **Colored spheres** represent other users
- **Name labels** appear above each avatar
- **Real-time movement** as users navigate the world

**Your avatar:**
- **Automatically created** when you join
- **Moves with your camera** position
- **Visible to all other users**

### User List (Top Right)

**Features:**
- **Live user count** - Shows total connected users
- **Your name** - Displayed in green and underlined
- **Other users** - Listed below your name
- **Real-time updates** - List updates as users join/leave

**Edit your name:**
1. **Click your green underlined name** in the user list
2. **Type new name** (max 20 characters)
3. **Press Enter** to save or **Escape** to cancel
4. **Name updates everywhere** - Avatar label, chat, user list

### Real-Time Synchronization

**Position tracking:**
- **Your movement** is visible to all users
- **100ms update rate** for smooth movement
- **Camera rotation** synced to avatar orientation

**State persistence:**
- **Objects remain** after you leave and return
- **Chat history** preserved across sessions
- **World state** maintained on the server

## 🎮 3D World Navigation

### Desktop Controls

**Movement:**
- **W** - Move forward
- **S** - Move backward  
- **A** - Move left
- **D** - Move right
- **Mouse drag** - Look around (first-person view)

**Alternative:**
- **Arrow keys** work the same as WASD
- **Mouse wheel** - Zoom in/out (if available)

### Mobile Controls

**Touch navigation:**
- **Single tap** - Select objects
- **Drag** - Rotate camera view
- **Double tap** - Move forward
- **Two-finger drag** - Pan camera

**Responsive design:**
- **Larger touch targets** for mobile
- **Optimized rendering** for mobile devices
- **Touch-friendly UI** elements

### Camera System

**First-person view:**
- **Eye-level perspective** for natural navigation
- **Smooth movement** with momentum
- **Look sensitivity** adjustable via movement speed

## 🖥️ Screen Sharing System

### Starting Screen Share

1. **Click "🖥️ Share Desktop Screen"** (top-left button)
2. **Browser prompts** for screen/window selection:
   - **Entire screen** - Share everything
   - **Application window** - Share specific app
   - **Browser tab** - Share just one tab
3. **Select and click "Share"**
4. **Your screen appears** on the large display for all users

### What Others See

**Large 3D screen display:**
- **16:9 aspect ratio** cinema-style screen
- **Real-time video** with full audio
- **Low latency** WebRTC P2P streaming
- **Automatic scaling** to fit screen

**Coordination messages:**
- **"Remote screen share hosted by [Username]"** notification
- **System chat messages** when sharing starts/stops

### Stopping Screen Share

- **Click "⏹️ Stop Sharing"** button
- **Screen goes black** for all users
- **System notification** in chat

### Technical Details

**Hybrid architecture:**
- **Server coordination** - Manages who's sharing
- **WebRTC P2P** - Direct video streaming between users
- **Automatic connections** - New users automatically connect to active streams

**Requirements:**
- **HTTPS required** (automatically provided by Netlify)
- **Modern browser** (Chrome/Edge recommended)
- **WebRTC support** (all modern browsers)

## 📦 3D Object System

### Loading 3D Models

**Drag and drop:**
1. **Find GLB or GLTF file** on your computer
2. **Drag file onto browser window**
3. **Model loads automatically** with proper lighting and shadows
4. **Appears for all users** in real-time

**Supported formats:**
- **GLB** (recommended) - Binary GLTF format
- **GLTF** - Text-based 3D format

### Object Selection

**How to select:**
- **Click any object** in the 3D world
- **Cyan wireframe outline** appears around selected object
- **Control panel** becomes active

**What you can select:**
- **User-loaded models** (GLB/GLTF files)
- **Built-in objects** (cubes, spheres)
- **Screen object** (the large display)

### Object Manipulation

**Control panel buttons** (appear when object selected):

**Movement (6 directions):**
- **↑** - Move up
- **↓** - Move down
- **←** - Move left
- **→** - Move right
- **▲** - Move forward
- **▼** - Move backward

**Scaling:**
- **+** - Scale up (make larger)
- **-** - Scale down (make smaller)

**Rotation:**
- **↻** - Rotate 45 degrees around Y-axis

**Reset and Delete:**
- **⟲** - Reset to original position/scale/rotation
- **🗑** - Delete object from scene

### Keyboard Shortcuts

```
R - Reset selected object
Q - Rotate selected object  
E - Scale up selected object
C - Scale down selected object
DELETE/BACKSPACE - Delete selected object
ESCAPE - Deselect object
```

### Multi-User Synchronization

**Real-time updates:**
- **All object changes** sync to all users instantly
- **Server authoritative** - Changes saved on server
- **Persistent state** - Objects remain after browser refresh

**Collaborative features:**
- **Anyone can manipulate** any object
- **No ownership system** (everyone can edit everything)
- **Immediate feedback** - See changes as they happen

## 💬 Chat System

### Opening Chat

**Toggle chat interface:**
- **Click 💬 button** (bottom-left corner)
- **Chat window slides up** (350x200px)
- **Click ❌ button** to close

### Sending Messages

**Methods:**
1. **Type message** in input field
2. **Press Enter** or **click Send button**
3. **Message appears** for all users immediately

**Message limits:**
- **200 characters maximum** per message
- **No spam protection** (trust-based system)

### Message Features

**Timestamps:**
- **All messages** show time in HH:MM format
- **24-hour format** (13:45 instead of 1:45 PM)
- **Local timezone** based on your system

**Message types:**
- **Regular messages** - White text
- **System notifications** - Orange text with 🔔 icon
- **Your messages** - Same format as others (no special styling)

### Chat History

**Persistence:**
- **Last 100 messages** stored on server
- **Messages load** when you join the world
- **History preserved** across browser sessions

**System messages include:**
- **User joined/left** notifications
- **Name changes** - "Alice changed their name to Bob"
- **Screen sharing** start/stop notifications

### Chat Interface

**Scrolling:**
- **Auto-scroll** to bottom when new messages arrive
- **Manual scroll** up to see message history
- **50 message limit** in display (older messages hidden)

**Responsive design:**
- **Mobile-friendly** touch scrolling
- **Doesn't interfere** with 3D scene interaction
- **Toggleable** to save screen space

## 🎨 Visual Features

### Lighting System

**Professional lighting:**
- **Ambient light** - Soft overall illumination
- **Directional light** - Sharp shadows and highlights
- **Dynamic shadows** - Objects cast realistic shadows

**Post-processing effects (desktop only):**
- **Bloom effect** - Subtle glow on bright objects
- **Anti-aliasing** - Smooth edges
- **Color correction** - Enhanced visual quality

### Mobile Optimization

**Performance features:**
- **Simplified lighting** - Reduced shadow complexity
- **Disabled bloom** - Better mobile compatibility
- **Lower polygon counts** - Automatic quality scaling

## ⌨️ Complete Keyboard Reference

```
=== Navigation ===
WASD            - Move camera (synced to other users)
Arrow Keys      - Alternative movement
Mouse Drag      - Look around (first-person)

=== Object Manipulation ===
Click           - Select object
R               - Reset selected object
Q               - Rotate selected object  
E               - Scale up selected object
C               - Scale down selected object
DELETE/BACKSPACE - Delete selected object
ESCAPE          - Deselect object

=== Chat ===
ENTER           - Send chat message (when input focused)

=== General ===
F12             - Open browser developer tools (for debugging)
CTRL+R          - Refresh page (reconnects to server)
```

## 🌐 Browser Compatibility

### Recommended Browsers

**Desktop (Full features):**
- **Chrome 88+** - Best screen sharing support
- **Edge 88+** - Full WebRTC support
- **Firefox 87+** - Good compatibility
- **Safari 14+** - Limited screen sharing

**Mobile (3D world only):**
- **Chrome Mobile** - Full 3D support
- **Safari iOS** - Good 3D support
- **Samsung Internet** - Good 3D support

### Feature Support by Browser

| Feature | Chrome | Firefox | Safari | Mobile |
|---------|--------|---------|--------|--------|
| 3D World | ✅ | ✅ | ✅ | ✅ |
| Multi-user | ✅ | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ | ✅ |
| Screen Share | ✅ | ✅ | ⚠️ | ❌ |
| WebRTC P2P | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ Full support
- ⚠️ Limited support  
- ❌ Not supported

## 🔧 Troubleshooting

### Connection Issues

**"Failed to connect" error:**
1. **Refresh the page** (CTRL+R)
2. **Check internet connection**
3. **Try different browser**
4. **Check browser console** (F12) for errors

**Users not appearing:**
1. **Wait 5-10 seconds** for connection
2. **Check user list** (top-right) for count
3. **Ask others to refresh** their browsers

### Screen Sharing Issues

**"Screen sharing not available":**
1. **Ensure HTTPS** (should see lock icon in address bar)
2. **Use Chrome or Edge** browser
3. **Check browser permissions** for screen capture

**Others can't see your screen:**
1. **Check "Remote screen share" message** appears for others
2. **Try stopping and restarting** screen share
3. **Check WebRTC connections** in browser console

### 3D World Issues

**Performance problems:**
1. **Close other browser tabs** to free memory
2. **Reduce browser window size**
3. **Use mobile-optimized version** on older devices

**Objects not loading:**
1. **Check GLB file format** (GLB recommended over GLTF)
2. **Try smaller file sizes** (< 10MB recommended)
3. **Check browser console** for loading errors

### Chat Issues

**Messages not sending:**
1. **Check character limit** (200 max)
2. **Verify connection** (user list should show others)
3. **Try refreshing** the page

**Chat window not opening:**
1. **Click 💬 button** in bottom-left corner
2. **Check for JavaScript errors** in console
3. **Try different browser**

## 💡 Tips and Best Practices

### For Best Performance

1. **Use Chrome or Edge** for full feature support
2. **Close unnecessary browser tabs** to free memory
3. **Use wired internet** for screen sharing
4. **Keep GLB models under 10MB** for fast loading

### For Better Collaboration

1. **Use descriptive names** when editing your username
2. **Announce in chat** before sharing screen
3. **Take turns** manipulating objects to avoid conflicts
4. **Use chat** to coordinate activities

### For Privacy

1. **Be mindful** of what you share on screen
2. **Remember** chat messages are visible to all users
3. **Names and messages** are temporary (not permanently stored)

## 🔮 Future Features

Features planned for future releases:

- **Voice chat** - WebRTC audio streaming
- **VR/AR support** - WebXR integration
- **Custom avatars** - Upload your own 3D avatar
- **Room management** - Create private 3D worlds
- **Persistent storage** - Database-backed object persistence
- **Admin controls** - Moderation tools
- **File sharing** - Share documents in 3D space

## 🆘 Getting Help

- **Browser console** (F12) - Check for error messages
- **GitHub Issues** - Report bugs or request features
- **Documentation** - Check other guides in /docs folder
- **Community** - Share your experience and get help

---

**Enjoy exploring your 3D world! 🌟**