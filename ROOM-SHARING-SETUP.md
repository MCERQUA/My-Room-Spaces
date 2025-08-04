# 🚀 Room Sharing Setup Guide

Your 3D Interactive Website now supports **P2P room sharing** where 2-4 users can see the same screen sharing or video! Here's how to set it up:

## 🎯 **What You Get**

- **2-4 users** can join the same room
- **Screen sharing** visible to all room members
- **Video playback** synchronized across users  
- **Real-time P2P** streaming with WebRTC
- **Room codes** for easy joining

## 📋 **Quick Setup Options**

### **Option 1: Deploy with Built-in Server (Recommended)**

The website works **immediately** with local room creation, but for full P2P functionality you need a signaling server.

### **Option 2: Deploy Signaling Server**

For full cross-device room sharing, deploy the signaling server:

## 🔧 **Signaling Server Deployment**

### **Deploy to Railway (Free & Easy)**

1. **Go to [railway.app](https://railway.app)**
2. **Connect your GitHub** account
3. **Create new project** from GitHub repo
4. **Add these files to a new folder** `server/`:
   - `signaling-server.js` 
   - `server-package.json` (rename to `package.json`)
5. **Deploy automatically** - Railway detects Node.js
6. **Get your URL** like `https://your-app.railway.app`

### **Deploy to Heroku**

1. **Install Heroku CLI**
2. **Create new Heroku app**:
   ```bash
   heroku create your-signaling-server
   ```
3. **Add server files** to separate folder
4. **Deploy**:
   ```bash
   git subtree push --prefix server heroku main
   ```

### **Deploy to Render (Free)**

1. **Go to [render.com](https://render.com)**
2. **Connect GitHub** repo
3. **Create Web Service**
4. **Set build/start commands**:
   - Build: `npm install`
   - Start: `npm start`

## ⚙️ **Update Client Configuration**

After deploying your signaling server:

1. **Edit `index.html`** line ~586:
   ```javascript
   const signalingUrls = [
     'https://YOUR-ACTUAL-SERVER.herokuapp.com',  // Your deployed server
     'https://threejs-signaling.railway.app', 
     'https://your-signaling-server.netlify.app'
   ];
   ```

2. **Commit and redeploy** to Netlify

## 🎮 **How to Use Room Sharing**

### **For Room Host:**
1. **Open your 3D website**
2. **Click "🆕 Create Room"** in orange panel
3. **Get room code** (e.g., "ABC123")
4. **Share screen or load video**
5. **Give room code to friends**

### **For Room Members:**
1. **Open the same website**
2. **Enter room code** in text box
3. **Click "🚪 Join Room"**
4. **See host's screen sharing automatically!**

## 🔥 **Features in Action**

### **Screen Sharing**
```
Host: Shares desktop → All room members see it on 3D screen
User2: Joins room → Instantly sees host's screen
User3: Joins room → Also sees the shared screen
User4: Joins room → Everyone watching together!
```

### **Video Playback**
```
Host: Loads video file → Video plays on 3D screen for everyone
Members: See synchronized playback in real-time
```

## 🛠️ **Technical Details**

### **How It Works**
1. **WebRTC P2P** - Direct browser-to-browser streaming
2. **Socket.IO signaling** - Initial connection setup
3. **SimplePeer** - Easy WebRTC peer management
4. **Canvas texture** - Video renders on 3D screen

### **Browser Support**
- **Chrome/Edge** 88+ (full functionality)
- **Firefox** 87+ (full functionality)  
- **Safari** 14+ (limited screen sharing)

### **Network Requirements**
- **HTTPS required** for screen sharing (Netlify provides this)
- **WebRTC support** in browser
- **Reasonable internet** for P2P streaming

## 🐛 **Troubleshooting**

### **"Server unavailable - local mode only"**
- Signaling server is not deployed or URL is wrong
- Check server URL in `index.html`
- Server might be sleeping (Heroku free tier)

### **"Cannot join - no server connection"**
- Same as above - need working signaling server
- Try creating local room instead

### **Screen sharing not working**
- Ensure HTTPS (works on Netlify)
- Allow screen access in browser
- Try different browser

### **Peers not connecting**
- Firewall/NAT issues (rare)
- Try different network
- Check browser console for errors

## 📊 **Current Status**

Your website currently:
- ✅ **Works locally** - single user screen sharing
- ✅ **Room UI ready** - orange control panel
- ✅ **P2P code complete** - WebRTC implementation
- ⏳ **Needs signaling server** - for cross-device rooms

## 🚀 **Next Steps**

1. **Deploy signaling server** (15 minutes)
2. **Update client URL** (2 minutes)  
3. **Test with friends** (fun!)
4. **Share room codes** and enjoy synchronized viewing!

## 💡 **Pro Tips**

- **Room codes expire** when empty
- **Host can share screen/video** to all members
- **Anyone can manipulate 3D objects** (independent)
- **Screen sharing is one-way** (host → members)
- **Works great for presentations**, movie nights, demos!

---

**Your 3D collaborative space is ready! Deploy the signaling server and start sharing! 🎉**