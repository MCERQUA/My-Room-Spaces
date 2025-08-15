# 🔧 Troubleshooting Guide

Common issues and solutions for the Self-Hosted Multi-user 3D World Website.

## 🚨 Quick Diagnostic Checklist

Before diving into specific issues, check these basics:

- [ ] **HTTPS enabled** (lock icon in address bar)
- [ ] **Modern browser** (Chrome 88+, Firefox 87+, Safari 14+)
- [ ] **JavaScript enabled** in browser settings
- [ ] **WebGL support** available (test at webglreport.com)
- [ ] **Internet connection** stable
- [ ] **Browser console** checked for errors (F12 → Console)

## 🔌 Connection Issues

### "Failed to connect to server" Error

**Symptoms:**
- Red error message on screen
- No user avatars appearing
- Chat not working
- User count shows 0

**Solutions:**

1. **Check backend server status:**
   ```bash
   # Test your Railway backend directly
   curl https://your-railway-app.up.railway.app/
   ```
   Should return JSON with server status.

2. **Verify backend URL in code:**
   - Open browser developer tools (F12)
   - Go to Sources tab
   - Find `index.html` and search for `SIGNALING_SERVER`
   - Ensure URL matches your Railway deployment

3. **Check Railway deployment:**
   - Go to Railway dashboard
   - Verify your backend is running (green status)
   - Check deployment logs for errors

4. **Network/Firewall issues:**
   - Try different network (mobile hotspot)
   - Disable VPN if active
   - Check corporate firewall settings

### WebSocket Connection Failed

**Symptoms:**
- Browser console shows WebSocket errors
- Connection drops frequently
- Real-time features not working

**Solutions:**

1. **Check WebSocket support:**
   ```javascript
   // Test in browser console
   const ws = new WebSocket('wss://your-railway-app.up.railway.app');
   ws.onopen = () => console.log('WebSocket connected');
   ws.onerror = (e) => console.error('WebSocket error:', e);
   ```

2. **Proxy/Firewall configuration:**
   - WebSockets require different firewall rules than HTTP
   - Check if your network blocks WebSocket connections
   - Try from a different network

3. **Railway WebSocket support:**
   - Railway supports WebSockets by default
   - Check Railway service logs for connection errors
   - Verify no custom load balancer blocking WebSockets

### Intermittent Disconnections

**Symptoms:**
- Connected initially but drops after few minutes
- User avatars disappear randomly
- Chat messages stop updating

**Solutions:**

1. **Railway sleep mode (free tier):**
   - Free tier apps sleep after 30 minutes inactivity
   - Upgrade to paid plan for 24/7 uptime
   - Or accept reconnection delay on free tier

2. **Browser power saving:**
   - Some browsers throttle inactive tabs
   - Keep the 3D world tab active
   - Disable browser sleep/power saving

3. **Network stability:**
   - Check internet connection stability
   - Try wired connection vs WiFi
   - Check for network congestion

## 🖥️ Screen Sharing Issues

### "Screen sharing not available" Message

**Symptoms:**
- Share button shows error message
- Browser doesn't prompt for screen selection
- Feature completely unavailable

**Solutions:**

1. **HTTPS requirement:**
   - Screen sharing requires HTTPS
   - Verify lock icon in address bar
   - Netlify provides HTTPS automatically

2. **Browser compatibility:**
   ```
   Chrome/Edge 88+  ✅ Full support
   Firefox 87+      ✅ Full support  
   Safari 14+       ⚠️ Limited support
   Mobile browsers  ❌ Not supported
   ```

3. **Browser permissions:**
   - Go to site settings (click lock icon)
   - Ensure "Screen capture" is allowed
   - Reset permissions if needed

4. **Local development:**
   - `http://localhost` works for testing
   - But deployment must use HTTPS

### Screen Share Starts But Others Can't See

**Symptoms:**
- "Remote screen share hosted by..." message appears
- But large screen stays black
- No error messages

**Solutions:**

1. **WebRTC P2P connection issues:**
   ```javascript
   // Check browser console for these messages:
   console.log('📨 WebRTC offer/answer/ice-candidate');
   ```

2. **Firewall blocking WebRTC:**
   - WebRTC uses random UDP ports
   - Corporate firewalls often block these
   - Try from home network

3. **Browser WebRTC support:**
   ```javascript
   // Test WebRTC support in console:
   navigator.mediaDevices.getDisplayMedia({video: true})
     .then(stream => console.log('Screen capture works'))
     .catch(err => console.error('Screen capture failed:', err));
   ```

### Audio Not Working with Screen Share

**Symptoms:**
- Video appears but no sound
- "Include system audio" option not working

**Solutions:**

1. **Browser audio permissions:**
   - Ensure "Include system audio" checked in share dialog
   - Some browsers don't support system audio capture
   - Try sharing browser tab instead of screen

2. **Audio source selection:**
   - When sharing, select "Chrome Tab" or "Firefox Tab"
   - Tab sharing includes audio automatically
   - System screen sharing may not include audio

3. **macOS/Windows differences:**
   - macOS: System audio sharing limited
   - Windows: Better system audio support
   - Linux: Varies by distribution

## 👥 Multi-User Issues

### Users Not Appearing

**Symptoms:**
- User count shows multiple users
- But no avatars visible in 3D world
- Chat messages from other users

**Solutions:**

1. **Avatar rendering issues:**
   - Check browser console for 3D rendering errors
   - Try refreshing the page
   - Check WebGL support

2. **Position synchronization:**
   ```javascript
   // Check console for these messages:
   console.log('🧑‍🤝‍🧑 Spawned avatar for UserXXXX');
   console.log('🔄 User moved:', data);
   ```

3. **Server-side user management:**
   ```bash
   # Check server API endpoint:
   curl https://your-railway-app.up.railway.app/api/users
   ```

### Name Editing Not Working

**Symptoms:**
- Clicking name doesn't show input field
- Name changes don't sync to other users
- Input field appears but doesn't save

**Solutions:**

1. **JavaScript errors:**
   - Check browser console for errors
   - Look for missing event listeners
   - Verify `editUserName` function exists

2. **Socket.IO connection:**
   - Name changes require active Socket.IO connection
   - Check connection status in console
   - Try refreshing page to reconnect

3. **Server event handling:**
   ```bash
   # Check Railway logs for:
   "📝 User changed name from X to Y"
   ```

### Chat Messages Not Syncing

**Symptoms:**
- Messages don't appear for other users
- Chat history not loading
- Send button not working

**Solutions:**

1. **Socket.IO chat events:**
   ```javascript
   // Check console for:
   console.log('💬 Chat message sent/received');
   ```

2. **Message validation:**
   - Check 200 character limit
   - Ensure no empty messages
   - Verify input sanitization

3. **Server chat storage:**
   ```bash
   # Test chat API:
   curl https://your-railway-app.up.railway.app/api/world-state
   # Should show chatHistory array
   ```

## 🎮 3D World Issues

### Black Screen or Loading Issues

**Symptoms:**
- Website loads but 3D world is black
- Spinning loading animation never stops
- JavaScript errors in console

**Solutions:**

1. **WebGL support:**
   - Visit webglreport.com to test WebGL
   - Update graphics drivers
   - Try different browser

2. **Three.js loading errors:**
   ```javascript
   // Check console for:
   "THREE.WebGLRenderer: Error creating WebGL context"
   ```

3. **CDN loading issues:**
   - Three.js loads from unpkg.com CDN
   - Check network connection
   - Try refreshing page

### Poor Performance or Lag

**Symptoms:**
- Choppy movement
- Low frame rate
- Browser becomes unresponsive
- High CPU usage

**Solutions:**

1. **Graphics optimization:**
   - Reduce browser window size
   - Close other tabs/applications
   - Disable browser extensions

2. **Device limitations:**
   - Mobile devices have limited 3D performance
   - Older computers may struggle
   - Consider using mobile-optimized settings

3. **Model complexity:**
   - Large GLB files impact performance
   - Keep models under 10MB
   - Reduce polygon count in 3D modeling software

### 3D Objects Not Loading

**Symptoms:**
- Drag-and-drop GLB files don't appear
- Models load but invisible
- Error messages about file format

**Solutions:**

1. **File format support:**
   ```
   ✅ GLB (recommended)
   ✅ GLTF  
   ❌ OBJ (not supported)
   ❌ FBX (not supported)
   ❌ STL (not supported)
   ```

2. **File size limits:**
   - Keep models under 50MB
   - Browser memory limitations
   - Consider compressing models

3. **Model validation:**
   - Test models in online GLTF viewers
   - Ensure models have proper materials
   - Check for embedded textures

## 📱 Mobile Issues

### Touch Controls Not Working

**Symptoms:**
- Can't move around on mobile
- Touch gestures don't work
- Interface elements too small

**Solutions:**

1. **Mobile browser compatibility:**
   ```
   iOS Safari     ✅ Good support
   Chrome Mobile  ✅ Good support
   Samsung Internet ✅ Good support
   Firefox Mobile ⚠️ Limited support
   ```

2. **Touch event handling:**
   - Ensure touch events aren't blocked
   - Check for JavaScript errors
   - Try different mobile browser

3. **Viewport configuration:**
   - Check meta viewport tag
   - Ensure proper mobile scaling
   - Verify responsive CSS

### Mobile Performance Issues

**Symptoms:**
- Very slow rendering on mobile
- App crashes on mobile
- Overheating device

**Solutions:**

1. **Mobile optimization settings:**
   - App automatically disables shadows on mobile
   - Reduces lighting complexity
   - Lowers model quality

2. **Device limitations:**
   - Older mobile devices struggle with 3D
   - Consider upgrading device
   - Use desktop for full experience

## 🚀 Deployment Issues

### Netlify Deployment Failed

**Symptoms:**
- Deploy shows failed status
- Site not accessible after deployment
- Build logs show errors

**Solutions:**

1. **Build configuration:**
   ```toml
   # netlify.toml should have:
   [build]
     publish = "."
   ```

2. **File structure:**
   ```
   ✅ index.html in root directory
   ✅ Static assets accessible
   ❌ index.html in subdirectory
   ```

3. **Repository access:**
   - Ensure repository is public or Netlify has access
   - Check GitHub integration
   - Verify correct branch selected

### Railway Deployment Failed

**Symptoms:**
- Railway shows "Deploy failed"
- Server not responding to requests
- Backend API endpoints return errors

**Solutions:**

1. **Package.json configuration:**
   ```json
   {
     "scripts": {
       "start": "node signaling-server.js"
     }
   }
   ```

2. **Node.js version:**
   - Ensure Node.js 18+ compatibility
   - Check Railway build logs
   - Verify dependencies install correctly

3. **Port configuration:**
   ```javascript
   const PORT = process.env.PORT || 3001;
   server.listen(PORT, '0.0.0.0');
   ```

### Frontend-Backend Connection Issues

**Symptoms:**
- Frontend loads but can't connect to backend
- CORS errors in browser console
- Inconsistent connection behavior

**Solutions:**

1. **Backend URL configuration:**
   ```javascript
   // In index.html, verify this points to your Railway URL:
   const SIGNALING_SERVER = 'https://your-app.up.railway.app';
   ```

2. **CORS configuration:**
   - Backend should allow your Netlify domain
   - Check Railway environment variables
   - Add CORS_ORIGIN if needed

3. **HTTPS requirements:**
   - Both frontend and backend must use HTTPS in production
   - Mixed content (HTTP/HTTPS) blocks connections
   - Netlify and Railway provide HTTPS automatically

## 🛠️ Debug Tools and Techniques

### Browser Developer Tools

**Essential tabs:**
1. **Console** - JavaScript errors and logs
2. **Network** - Failed requests and WebSocket connections
3. **Sources** - Code inspection and debugging
4. **Application** - Local storage and service workers

**Useful console commands:**
```javascript
// Check Socket.IO connection
socket.connected

// List all users
Array.from(userAvatars.entries())

// Check 3D scene objects
scene.children

// WebRTC peer connections
Object.keys(peers)
```

### Server-Side Debugging

**Railway logs:**
- Go to Railway dashboard
- Click your project
- View "Deployments" tab for logs

**Health check endpoints:**
```bash
# Basic health check
curl https://your-app.up.railway.app/

# World state
curl https://your-app.up.railway.app/api/world-state

# Connected users
curl https://your-app.up.railway.app/api/users
```

### Network Debugging

**Check WebSocket connection:**
```javascript
// In browser console
const socket = io('https://your-railway-app.up.railway.app');
socket.on('connect', () => console.log('✅ Connected'));
socket.on('disconnect', () => console.log('❌ Disconnected'));
socket.on('connect_error', (err) => console.error('Connection error:', err));
```

**Test WebRTC capabilities:**
```javascript
// Test media devices
navigator.mediaDevices.enumerateDevices()
  .then(devices => console.log('Available devices:', devices));

// Test screen capture
navigator.mediaDevices.getDisplayMedia({video: true})
  .then(stream => console.log('Screen capture works'))
  .catch(err => console.error('Screen capture failed:', err));
```

## 📞 Getting Help

### Before Asking for Help

1. **Check browser console** for error messages
2. **Test in different browser** to isolate issues
3. **Check server status** using health endpoints
4. **Review this troubleshooting guide** thoroughly
5. **Search existing issues** on GitHub

### How to Report Issues

**Include this information:**
- **Browser and version** (Chrome 96, Firefox 94, etc.)
- **Operating system** (Windows 11, macOS 12, etc.)
- **Console error messages** (copy exact text)
- **Steps to reproduce** the problem
- **Screenshots or screen recordings** if visual issue

**GitHub Issue Template:**
```markdown
**Bug Description**
Brief description of the issue

**Environment**
- Browser: Chrome 96
- OS: Windows 11  
- Frontend URL: https://my-site.netlify.app
- Backend URL: https://my-backend.up.railway.app

**Console Errors**
```
Paste any console error messages here
```

**Steps to Reproduce**
1. Open website
2. Click screen share
3. Error appears

**Expected Behavior**  
What should happen instead

**Additional Context**
Any other relevant information
```

### Community Resources

- **GitHub Issues**: [Report bugs and request features](https://github.com/MCERQUA/3D-threejs-site/issues)
- **Documentation**: Check other guides in `/docs` folder
- **Railway Support**: [Railway Discord](https://discord.gg/railway)
- **Netlify Support**: [Netlify Community](https://community.netlify.com)

---

**Remember**: Most issues are solved by refreshing the page and checking the browser console! 🔄