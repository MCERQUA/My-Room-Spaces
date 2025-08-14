# Quick Reference Card - 3D Three.js Site

## 🚀 Everything is Working!
*As of August 12, 2025 - All systems operational*

## Key Fixes That Solved Everything

### ✅ Mobile Textures Fixed
```javascript
// Problem: WebP textures showed white on mobile
// Solution: Separate GLB with JPG textures
const modelPath = isMobile ? './models/WEBROOM1-mob.glb' : './models/BAKE-WEBROOM1.glb';
```

### ✅ Login Dialog Fixed
```javascript
// Problem: isMobile used before definition (line 1522)
// Solution: Use isMobileEarly instead
if (!isMobileEarly) {  // NOT if (!isMobile)
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}
```

### ✅ Variable Scope Fixed
```javascript
// Problem: Variables in try/catch not accessible
// Solution: Define at function scope, no try/catch needed
function showWelcomeDialog() {
  const welcomeDialog = document.getElementById('welcome-dialog');
  // Simple, works perfectly
}
```

## Working Features Checklist

| Feature | Status | Mobile | Desktop |
|---------|--------|--------|---------|
| Login Dialog | ✅ | ✅ | ✅ |
| 3D Room Textures | ✅ | ✅ JPG | ✅ WebP |
| Multi-User Avatars | ✅ | ✅ | ✅ |
| Screen Sharing | ✅ | ✅ View | ✅ Full |
| Chat System | ✅ | ✅ | ✅ |
| Object Manipulation | ✅ | ✅ | ✅ |
| Touch Controls | ✅ | ✅ | N/A |
| Vertical Menu | ✅ | ✅ | ✅ |
| Multi-Space Support | ✅ | ✅ | ✅ |

## Critical Files & Lines

### Models (./models/)
- `BAKE-WEBROOM1.glb` - Desktop (WebP textures)
- `WEBROOM1-mob.glb` - Mobile (JPG textures) 

### index.html Key Sections
- **Mobile Detection**: Line 1383 (`isMobileEarly`)
- **Renderer Setup**: Lines 1499-1544
- **Room Loading**: Lines 1713-1820
- **Login Dialog**: Lines 2175-2250
- **Socket.IO**: Lines 2255-2300

### What NOT to Change
1. **Don't use `isMobile` before line 1566**
2. **Don't wrap showWelcomeDialog in try/catch**
3. **Don't change screen aspect ratio from 16:9**
4. **Don't set outputColorSpace on mobile**
5. **Don't modify texture settings - they work as-is**

## Emergency Fixes

### If Login Breaks
```bash
# Restore working version
git show 4e55f9b:index.html > index.html
```

### If Textures Break on Mobile
1. Check if mobile GLB exists: `ls models/WEBROOM1-mob.glb`
2. Verify it has JPG textures, not WebP
3. Ensure NO texture manipulation code is running

### If Socket Disconnects
```javascript
// Check connection
console.log('Socket connected:', socket.connected);
// Reconnect
socket.connect();
```

## Multi-Space Quick Access

```bash
# Access different spaces via URL
?space=default      # Main space
?space=white        # White room
?space=custom       # Custom space

# Or use path-based URLs
/white              # White room space
/custom             # Custom space
/space/white        # Alternative format
```

### Add New Space
1. Add GLB to `models/` directory
2. Edit `spaces-config.js`:
```javascript
'newspace': {
  name: 'New Space',
  roomModel: { desktop: './models/new.glb' },
  welcomeMessage: 'Welcome!'
}
```
3. Access: `yourdomain.com/?space=newspace`

## Development Commands

```bash
# Local Development
npm run dev          # Start backend (:3001)
npm start           # Start frontend (:8080)

# Deploy
git push origin main # Auto-deploys both frontend & backend

# Test Multi-User
# Open multiple browser tabs to localhost:8080
```

## Live URLs
- **Site**: https://threejs-site.netlify.app
- **Backend**: https://3d-threejs-site-production.up.railway.app
- **GitHub**: https://github.com/MCERQUA/3D-threejs-site

## The Golden Rules

### ✅ DO
- Use `isMobileEarly` for early detection
- Test on real mobile devices
- Keep menus vertical
- Use separate GLBs for mobile/desktop

### ❌ DON'T  
- Add unnecessary error handling
- Modify working texture code
- Change the 16:9 screen ratio
- Use WebP on mobile

---
**Remember**: Everything works right now. When in doubt, check this reference!