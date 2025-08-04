# 3D Interactive Website

A fully interactive 3D web application built with Three.js featuring screen sharing, GLB model loading, and real-time object manipulation.

## 🚀 Features

### 🖥️ **Large Screen Sharing**
- **Desktop screen sharing** in real-time within 3D environment
- **Video file playback** on massive 16x9 display screen
- **Live streaming** with audio support
- **Cinema-sized experience** in virtual space

### 📦 **3D Model Loading**
- **Drag & drop GLB/GLTF** model loading
- **Real-time model manipulation** (move, scale, rotate, delete)
- **Visual selection system** with cyan wireframe outlines
- **Auto-positioning** and shadow casting

### 🎮 **Interactive Controls**
- **6-axis movement** (up/down, left/right, forward/backward)
- **Object selection** via mouse/touch clicking
- **Complete manipulation tools** via on-screen controls
- **Keyboard shortcuts** for power users

### 📱 **Cross-Platform**
- **Desktop controls**: Mouse + WASD navigation
- **Mobile optimized**: Touch controls and responsive UI
- **Screen sharing**: Works on desktop browsers with WebRTC support
- **WebGL compatibility** across modern browsers

## 🎯 **Live Demo**

Visit the live website: [**3D Interactive Website**](https://3d-threejs-site.netlify.app)

## 🛠️ **Tech Stack**

- **Three.js** - 3D graphics and rendering
- **WebRTC** - Screen sharing and media capture
- **Canvas API** - Dynamic texture generation
- **Modern JavaScript** - ES6 modules and async/await
- **CSS3** - Responsive design and animations

## 🎮 **How to Use**

### **Getting Started**
1. **Enter the 3D world** - Click the welcome screen or press ENTER
2. **Look around** - Mouse drag (desktop) or touch drag (mobile)
3. **Move** - WASD keys or double-tap on mobile

### **Screen Sharing**
1. **Click "🖥️ Share Desktop Screen"** in the top-left controls
2. **Select screen/window** to share
3. **Your desktop appears** on the massive screen in 3D space!
4. **Stop sharing** with the "⏹️ Stop Sharing" button

### **Load 3D Models**
1. **Drag GLB files** onto the browser window
2. **Models load automatically** with shadows and lighting
3. **Click to select** any object (models, cubes, spheres)
4. **Use control panel** to move, scale, rotate, or delete

### **Object Manipulation**
- **Select objects** by clicking on them
- **Move in 6 directions**: ↑↓←→▲▼ (up/down, left/right, forward/backward)
- **Scale objects**: + and - buttons
- **Rotate**: ↻ button rotates 45 degrees
- **Reset**: ⟲ returns to original position
- **Delete**: 🗑 removes from scene

### **Keyboard Shortcuts**
```
WASD / Arrow Keys - Camera movement
R - Reset selected object
Q - Rotate selected object  
E - Scale up selected object
C - Scale down selected object
DELETE/BACKSPACE - Delete selected object
ESCAPE - Deselect object
ENTER - Hide welcome screen
```

## 🌐 **Browser Requirements**

### **For Full Experience**
- **Chrome/Edge** 88+ (screen sharing support)
- **Firefox** 87+ (screen sharing support)
- **Safari** 14+ (limited screen sharing)

### **For 3D Scene Only**
- Any **WebGL-compatible browser**
- **Mobile browsers** (iOS Safari, Chrome Mobile)

## ⚡ **Performance Notes**

- **Optimized for mobile** with efficient rendering
- **Shadow mapping** (may impact older devices)
- **Real-time texture updates** for screen sharing
- **Automatic quality scaling** based on device capabilities

## 🔧 **Development**

### **Local Development**
```bash
# Serve the files locally
python -m http.server 8080
# or
npx serve .
```

### **Project Structure**
```
├── index.html          # Main application file
├── README.md           # This file
└── models/             # Place GLB files here (optional)
```

## 🚀 **Deployment**

### **Netlify (Recommended)**
1. Fork this repository
2. Connect to Netlify
3. Deploy from main branch
4. Automatic HTTPS and global CDN

### **Other Platforms**
- **GitHub Pages**: Enable in repository settings
- **Vercel**: Import repository and deploy
- **Traditional hosting**: Upload `index.html` to web server

## 🎨 **Customization**

### **Colors & Theme**
Edit the CSS color variables in `index.html`:
```css
--primary-color: #00ff00;    /* Matrix green */
--background-color: #000011; /* Dark blue */
```

### **3D Scene**
Modify the JavaScript in `index.html`:
- **Screen size**: Change `screenWidth` and `screenHeight`
- **Object positions**: Adjust `position.set(x, y, z)`
- **Lighting**: Modify `ambientLight` and `directionalLight`

### **Controls**
- **Movement speed**: Adjust `moveAmount` and `moveSpeed`
- **Camera sensitivity**: Change multiplication factors in mouse controls

## 🐛 **Known Issues**

- **Screen sharing** requires HTTPS in production
- **Mobile screen sharing** not supported by most browsers
- **Large models** may impact performance on older devices

## 📄 **License**

MIT License - Feel free to use and modify for your projects!

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 **Support**

Having issues? Check these common solutions:
- **Screen sharing not working**: Ensure HTTPS and modern browser
- **Models not loading**: Check GLB file format and size
- **Performance issues**: Try reducing shadow quality or model complexity

---

**Built with ❤️ using Three.js and modern web technologies**