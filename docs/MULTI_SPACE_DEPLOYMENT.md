# Multi-Space Deployment Guide

This guide explains how to deploy multiple independent 3D spaces using different GLB room models from a single codebase.

## How It Works

The system uses a configuration file (`spaces-config.js`) to define different spaces, each with their own:
- Room GLB models (desktop and mobile versions)
- Welcome messages
- Theme colors
- Camera positions
- Server endpoints (can be shared or separate)

## Accessing Different Spaces

There are three ways to access different spaces:

### 1. URL Parameters (Easiest)
Add `?space=NAME` to your URL:
- `https://yourdomain.com/?space=white` - White room space
- `https://yourdomain.com/?space=custom` - Custom space
- `https://yourdomain.com/?space=default` - Original/default space

### 2. Path-Based URLs
Use clean URLs with path routing:
- `https://yourdomain.com/white` - White room space
- `https://yourdomain.com/custom` - Custom space
- `https://yourdomain.com/space/white` - Alternative path format

### 3. Subdomain Deployment (Advanced)
Deploy to different subdomains:
- `https://white.yourdomain.com` - White room space
- `https://custom.yourdomain.com` - Custom space
- `https://yourdomain.com` - Default space

## Adding a New Space

### Step 1: Add Your GLB Model
Place your GLB file in the `models/` directory:
```
models/
├── your-new-room.glb
├── BAKE-WEBROOM1.glb (default)
└── white-room1.glb
```

### Step 2: Configure the Space
Edit `spaces-config.js` and add your new space:

```javascript
'yourspace': {
  name: 'Your Space Name',
  roomModel: {
    desktop: './models/your-new-room.glb',
    mobile: './models/your-new-room.glb' // Or optimized mobile version
  },
  serverEndpoint: 'https://3d-threejs-site-production.up.railway.app',
  welcomeMessage: 'Welcome to Your Custom Space',
  themeColor: '#ff6600', // Your theme color
  cameraPosition: { x: 0, y: 2, z: -4 },
  mobileCameraPosition: { x: 0, y: 2, z: 0 }
}
```

### Step 3: Test Your Space
Access your new space using any of the methods above:
- `https://yourdomain.com/?space=yourspace`
- `https://yourdomain.com/yourspace`

## Deployment Options

### Option 1: Single Netlify Site (Recommended)
Deploy once to Netlify, and all spaces are accessible via URL parameters or paths:
1. Push to GitHub: `git push origin main`
2. Netlify auto-deploys
3. Access spaces via URLs listed above

### Option 2: Multiple Netlify Sites
Create separate Netlify sites for each space:

1. **Create a new branch for each space:**
   ```bash
   git checkout -b white-room
   # Edit spaces-config.js to set 'white' as default
   git commit -am "Set white room as default"
   git push origin white-room
   ```

2. **In Netlify:**
   - Create new site from Git
   - Choose the specific branch (e.g., `white-room`)
   - Deploy with custom domain (e.g., `white.yourdomain.com`)

### Option 3: Environment Variables
Use Netlify environment variables to control default space:

1. In Netlify Site Settings > Environment Variables:
   - Add `DEFAULT_SPACE=white`

2. Update `spaces-config.js`:
   ```javascript
   function detectSpace() {
     // Check for Netlify environment variable
     const defaultSpace = process.env.DEFAULT_SPACE || 'default';
     // ... rest of detection logic
   }
   ```

## Server Considerations

### Shared Server (Default)
All spaces share the same Railway backend server:
- Users from different spaces can't see each other
- Each space maintains its own room/world state
- Cost-effective for multiple spaces

### Separate Servers (Advanced)
Deploy separate Railway servers for complete isolation:
1. Fork the signaling-server code
2. Deploy new Railway instance
3. Update `serverEndpoint` in space config

## Mobile Optimization

For each space, you can provide:
- Separate mobile-optimized GLB models
- Different camera positions for mobile vs desktop
- Custom mobile detection and handling

### Creating Mobile-Optimized Models
```bash
# Extract textures from GLB for mobile
npm install -g gltf-pipeline
gltf-pipeline -i your-room.glb -o mobile/your-room.gltf --separate

# Reference in config
roomModel: {
  desktop: './models/your-room.glb',
  mobile: './models/mobile/your-room.gltf'
}
```

## Monitoring and Analytics

Track which spaces are being used:
- URL parameters are visible in analytics
- Can add custom tracking per space
- Server logs show space connections

## Examples

### Example 1: Art Gallery Spaces
```javascript
'modern-art': {
  name: 'Modern Art Gallery',
  roomModel: { desktop: './models/modern-gallery.glb' },
  welcomeMessage: 'Welcome to the Modern Art Gallery'
},
'classical-art': {
  name: 'Classical Art Gallery',
  roomModel: { desktop: './models/classical-gallery.glb' },
  welcomeMessage: 'Welcome to the Classical Art Gallery'
}
```

### Example 2: Corporate Meeting Rooms
```javascript
'boardroom': {
  name: 'Executive Boardroom',
  roomModel: { desktop: './models/boardroom.glb' },
  serverEndpoint: 'https://private-server.railway.app'
},
'training': {
  name: 'Training Room',
  roomModel: { desktop: './models/training-room.glb' },
  serverEndpoint: 'https://public-server.railway.app'
}
```

## Troubleshooting

### Space Not Loading
- Check browser console for errors
- Verify GLB file path in `spaces-config.js`
- Ensure GLB file is in correct location
- Check network tab for 404 errors

### Wrong Space Loading
- Clear browser cache
- Check URL parameters
- Verify `detectSpace()` function logic
- Look for console logs showing space detection

### Mobile Issues
- Ensure mobile GLB path is correct
- Check if textures are properly extracted
- Verify mobile camera position settings
- Test on actual devices, not just browser emulation

## Best Practices

1. **Name Consistency**: Use consistent naming for space IDs
2. **File Organization**: Keep GLB files organized in `models/` directory
3. **Testing**: Test each space on both desktop and mobile
4. **Documentation**: Document each space's purpose and settings
5. **Version Control**: Commit space configurations to Git
6. **Performance**: Optimize GLB files for web (< 10MB recommended)

## Future Enhancements

Potential improvements to the multi-space system:
- Dynamic space loading from database
- User-uploadable room models
- Space templates and presets
- Cross-space teleportation
- Space-specific features and controls
- Custom lighting per space
- Space access control and permissions