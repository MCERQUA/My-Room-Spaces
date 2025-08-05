# 🚀 Complete Setup Guide

This guide will walk you through setting up your own instance of the Self-Hosted Multi-user 3D World Website.

## Overview

The application consists of two main components:
- **Frontend**: Static website hosted on Netlify (HTML/CSS/JS + Three.js)
- **Backend**: Node.js server hosted on Railway (Socket.IO + Express)

## Prerequisites

- GitHub account
- Netlify account (free tier available)
- Railway account (free tier available)
- Basic familiarity with git

## Method 1: One-Click Deploy (Recommended)

### Step 1: Deploy Backend (Railway)

1. **Click the Railway Deploy Button**:
   [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/MCERQUA/3D-threejs-site)

2. **Sign in to Railway** if you haven't already

3. **Configure the deployment**:
   - Repository name: `3d-world-backend` (or your preferred name)
   - Make it public or private (your choice)
   - Click "Deploy"

4. **Wait for deployment** (usually takes 2-3 minutes)

5. **Get your backend URL**:
   - Once deployed, go to your Railway dashboard
   - Click on your project
   - Go to the "Deployments" tab
   - Copy the domain URL (e.g., `https://your-app-name.up.railway.app`)

### Step 2: Deploy Frontend (Netlify)

1. **Fork the repository first**:
   - Go to https://github.com/MCERQUA/3D-threejs-site
   - Click "Fork" in the top-right
   - This creates your own copy

2. **Click the Netlify Deploy Button**:
   [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR-USERNAME/3D-threejs-site)
   
   (Replace YOUR-USERNAME with your GitHub username)

3. **Sign in to Netlify** and authorize GitHub access

4. **Configure the deployment**:
   - Repository: Select your forked repository
   - Branch: `main`
   - Site name: Choose a unique name (e.g., `my-3d-world`)
   - Click "Deploy site"

### Step 3: Connect Frontend to Backend

1. **Edit the configuration**:
   - In your forked repository, edit `index.html`
   - Find line ~826 (search for `SIGNALING_SERVER`)
   - Replace the Railway URL:

   ```javascript
   const SIGNALING_SERVER = window.location.hostname === 'localhost' 
     ? 'http://localhost:3001'  // Local development
     : 'https://YOUR-RAILWAY-URL-HERE.up.railway.app';  // Your Railway backend
   ```

2. **Commit the changes**:
   ```bash
   git add index.html
   git commit -m "Update backend URL for deployment"
   git push origin main
   ```

3. **Netlify will auto-deploy** your changes within 1-2 minutes

### Step 4: Test Your Deployment

1. **Visit your Netlify site** (e.g., `https://my-3d-world.netlify.app`)
2. **Open multiple browser tabs** to test multi-user features
3. **Try the features**:
   - Move around (WASD keys)
   - Change your name (click the green underlined name)
   - Use the chat system
   - Share your screen
   - Add 3D objects

## Method 2: Manual Setup

### Prerequisites for Manual Setup

- Node.js 18+ installed
- Git installed
- Code editor (VS Code recommended)

### Step 1: Clone and Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/3D-threejs-site.git
cd 3D-threejs-site

# 2. Install dependencies
npm install

# 3. Start development servers
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend  
npm start
```

### Step 2: Local Development Testing

1. **Backend** runs on `http://localhost:3001`
2. **Frontend** runs on `http://localhost:8080`
3. **Open multiple browser tabs** to `http://localhost:8080` to test multi-user features

### Step 3: Deploy Backend to Railway

1. **Create Railway project**:
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your forked repository

2. **Configure build settings**:
   - Railway should auto-detect Node.js
   - It will run `npm start` by default (which runs `signaling-server.js`)
   - No additional configuration needed

3. **Set environment variables** (if needed):
   - Go to your Railway project
   - Click "Variables" tab
   - Add any environment variables (currently none required)

4. **Deploy and get URL**:
   - Railway deploys automatically
   - Copy the generated domain URL

### Step 4: Deploy Frontend to Netlify

1. **Build settings**:
   - Build command: (leave empty - it's a static site)
   - Publish directory: `/` (root directory)
   - Base directory: (leave empty)

2. **Connect your repository**:
   - Go to Netlify dashboard
   - Click "New site from Git"
   - Choose GitHub and your forked repository
   - Set the build settings above
   - Click "Deploy"

3. **Configure custom domain** (optional):
   - Go to Site settings > Domain management
   - Add your custom domain if you have one

### Step 5: Update Configuration

1. **Edit `index.html`** to point to your Railway backend (see Step 3 from Method 1)
2. **Commit and push** changes
3. **Netlify auto-deploys** your updates

## Environment Configuration

### Backend Environment Variables

The backend server doesn't require any environment variables by default, but you can add:

```bash
# Optional: Set port (Railway sets this automatically)
PORT=3001

# Optional: Set CORS origins (defaults to allow all)
CORS_ORIGIN=https://your-frontend-domain.netlify.app
```

### Frontend Configuration

The frontend automatically detects the environment:
- **Local development**: Connects to `http://localhost:3001`
- **Production**: Connects to your Railway backend URL

## Verification Checklist

After deployment, verify these features work:

- [ ] **Multi-user connection**: Open multiple browser tabs, see user avatars
- [ ] **Real-time movement**: Move in one tab, see avatar move in others
- [ ] **Name editing**: Click your name in user list, edit it
- [ ] **Chat system**: Send messages, see them in other tabs
- [ ] **Screen sharing**: Share screen, see it in other tabs
- [ ] **3D object manipulation**: Add, move, delete objects
- [ ] **Persistent state**: Refresh page, see objects still there

## Troubleshooting

### Common Issues

1. **"Connection failed" error**:
   - Check that your Railway backend is running
   - Verify the `SIGNALING_SERVER` URL in `index.html` is correct
   - Check browser console for WebSocket errors

2. **Screen sharing not working**:
   - Ensure you're using HTTPS (Netlify provides this automatically)
   - Check browser permissions for screen capture
   - Try a different browser (Chrome/Edge recommended)

3. **Objects not syncing between users**:
   - Check browser console for Socket.IO connection errors
   - Verify Railway backend logs for errors
   - Ensure both users are connected to the same backend

4. **Chat messages not appearing**:
   - Check browser console for JavaScript errors
   - Verify WebSocket connection in browser DevTools > Network tab
   - Test with a fresh browser session

### Getting Help

- **Check the [Troubleshooting Guide](TROUBLESHOOTING.md)**
- **Review browser console** for error messages
- **Check Railway logs** in your Railway dashboard
- **Open an issue** on GitHub with detailed error information

## Security Considerations

- **No sensitive data**: The application doesn't store personal information
- **Temporary sessions**: User data only exists during active sessions
- **WebRTC encryption**: P2P media streams are encrypted
- **HTTPS required**: For screen sharing and security

## Next Steps

- **Customize the 3D world**: Add your own models and environments
- **Modify the UI**: Change colors, layouts, and controls
- **Add features**: Voice chat, VR support, custom avatars
- **Scale up**: Move to production-grade database for persistence

## Support

Need help? Check out:
- [User Guide](USER_GUIDE.md) - How to use all features  
- [Architecture Overview](ARCHITECTURE.md) - Technical details
- [API Reference](API.md) - Server endpoints and events
- [GitHub Issues](https://github.com/MCERQUA/3D-threejs-site/issues) - Report bugs or request features