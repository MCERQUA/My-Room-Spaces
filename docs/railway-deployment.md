# 🚂 Railway Backend Deployment Guide

This guide covers deploying the Node.js backend server to Railway for persistent world state and real-time multi-user functionality.

## Why Railway?

- **Auto-scaling**: Handles traffic spikes automatically
- **Persistent hosting**: 24/7 uptime with health checks
- **GitHub integration**: Deploy directly from repository
- **Environment management**: Easy configuration
- **Free tier**: Generous compute hours for development

## Prerequisites

- GitHub account with forked repository
- Railway account (free signup at [railway.app](https://railway.app))
- Basic understanding of Node.js applications

## Deployment Methods

### Method 1: One-Click Deploy (Recommended)

1. **Deploy with Railway Button**:
   [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/MCERQUA/3D-threejs-site)

2. **Sign in to Railway**:
   - Create account or sign in with GitHub
   - Authorize Railway to access your repositories

3. **Configure deployment**:
   - **Template**: Auto-detected as Node.js
   - **Repository name**: Choose a name (e.g., `3d-world-backend`)
   - **Environment**: Production (default)
   - **Region**: Choose closest to your users

4. **Deploy**:
   - Click "Deploy"
   - Railway automatically detects `package.json` and runs `npm install`
   - Server starts with `npm start` (runs `signaling-server.js`)

5. **Get your URL**:
   - Once deployed, click on your project
   - Go to "Settings" tab
   - Copy the domain (e.g., `https://your-app.up.railway.app`)

### Method 2: Manual Railway Setup

1. **Create new project**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Connect repository**:
   - Choose your forked `3D-threejs-site` repository
   - Grant Railway access if prompted

3. **Configure build**:
   Railway auto-detects Node.js projects, but verify:
   ```json
   // package.json should have:
   {
     "scripts": {
       "start": "node signaling-server.js",
       "dev": "nodemon signaling-server.js"
     }
   }
   ```

4. **Set environment variables** (optional):
   - Click "Variables" tab
   - Add any needed variables (see configuration section)

5. **Deploy**:
   - Railway automatically starts deployment
   - Monitor progress in "Deployments" tab

## Server Configuration

### Core Files

The backend consists of:

```
signaling-server.js     # Main server file (350+ lines)
package.json           # Dependencies and scripts
```

### Key Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "cors": "^2.8.5"
  }
}
```

### Server Features

The Railway server handles:
- **World State Management**: Persistent object positions/rotations
- **User Avatar System**: Real-time user presence and movement
- **Screen Sharing Coordination**: WebRTC signaling for P2P connections
- **Chat System**: Message history and real-time chat
- **Health Monitoring**: Built-in health check endpoints

## Environment Variables

### Required Variables

None! The server works out-of-the-box with defaults.

### Optional Variables

Add these in Railway dashboard under "Variables":

```bash
# Port (Railway sets this automatically)
PORT=3001

# CORS configuration (defaults to allow all origins)
CORS_ORIGIN=https://your-frontend-domain.netlify.app

# Node environment
NODE_ENV=production

# Logging level
LOG_LEVEL=info
```

### Setting Variables in Railway

1. **Go to your project dashboard**
2. **Click "Variables" tab**
3. **Add variables**:
   - Key: `CORS_ORIGIN`
   - Value: `https://your-netlify-site.netlify.app`
4. **Save**: Railway auto-restarts with new variables

## Monitoring and Logs

### Viewing Logs

1. **Real-time logs**:
   - Go to your Railway project
   - Click "Deployments" tab
   - Click on a deployment to see logs

2. **Common log messages**:
   ```
   🚀 Persistent Metaverse Server running on port 3001
   🎯 User connected: ab1c2d3e
   💾 World state saved - Objects: 5 Users: 3
   🧑‍🤝‍🧑 Spawned avatar for User1234
   📝 User ab1c2d3e changed name from "User1234" to "Alice"
   ```

### Health Monitoring

The server includes health check endpoints:

- **`GET /`**: Basic health check with world statistics
- **`GET /api/world-state`**: Current world state (objects, users, chat)
- **`GET /api/users`**: List of connected users
- **`GET /api/objects`**: List of 3D objects in the world

Test health check:
```bash
curl https://your-app.up.railway.app/
```

Expected response:
```json
{
  "status": "Persistent Metaverse Server",
  "uptime": "2 hours",
  "connections": 3,
  "objects": 5,
  "chatMessages": 12
}
```

## Scaling and Performance

### Automatic Scaling

Railway automatically scales based on:
- **CPU usage**: Scales up when CPU > 80%
- **Memory usage**: Scales up when memory > 80%
- **Request volume**: Handles traffic spikes

### Performance Monitoring

Monitor these metrics in Railway dashboard:
- **Response time**: Should be < 100ms for Socket.IO events
- **Memory usage**: Node.js typically uses 50-200MB
- **CPU usage**: Should be < 50% under normal load
- **Active connections**: Number of concurrent users

### Optimization Tips

1. **Memory management**:
   ```javascript
   // Server automatically cleans up old chat messages
   if (worldState.chatHistory.length > 100) {
     worldState.chatHistory.shift();
   }
   ```

2. **Connection limits**:
   - Current server handles ~100 concurrent users
   - For more users, consider clustering or Redis

3. **Object persistence**:
   - Objects stored in memory (resets on server restart)
   - For production, consider PostgreSQL database

## Database Integration (Future)

### Railway PostgreSQL

For persistent storage across server restarts:

1. **Add PostgreSQL**:
   - In Railway project, click "Add Service"
   - Select "PostgreSQL"
   - Railway provisions database automatically

2. **Get connection URL**:
   - Database service provides `DATABASE_URL` automatically
   - Use in your application:
   ```javascript
   const { Pool } = require('pg');
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });
   ```

3. **Update server code**:
   ```javascript
   // Replace in-memory storage with database queries
   const saveWorldState = async () => {
     await pool.query('UPDATE world_state SET data = $1', [JSON.stringify(worldState)]);
   };
   ```

## Troubleshooting

### Common Issues

1. **Deployment failed**:
   - Check "Deployments" tab for error logs
   - Verify `package.json` has correct start script
   - Ensure Node.js version compatibility

2. **Server crashes on startup**:
   ```bash
   # Common fixes:
   npm install  # Ensure dependencies installed
   node --version  # Check Node.js version (need 18+)
   ```

3. **CORS errors from frontend**:
   - Add your Netlify domain to CORS_ORIGIN variable
   - Check Railway logs for CORS-related errors

4. **Socket.IO connection failed**:
   - Verify Railway URL is accessible: `curl https://your-app.up.railway.app/`
   - Check firewall/network restrictions
   - Ensure WebSocket support (Railway supports by default)

### Debug Mode

Enable debug logging:

1. **Add environment variable**:
   ```bash
   DEBUG=socket.io:*
   NODE_ENV=development
   ```

2. **View detailed logs** in Railway dashboard

3. **Test Socket.IO connection**:
   ```javascript
   // In browser console on your frontend:
   const socket = io('https://your-app.up.railway.app/');
   socket.on('connect', () => console.log('Connected!'));
   ```

### Health Check Failures

If health checks fail:

1. **Check server logs** for startup errors
2. **Verify port binding**:
   ```javascript
   const PORT = process.env.PORT || 3001;
   server.listen(PORT, '0.0.0.0', () => {
     console.log(`🚀 Server running on port ${PORT}`);
   });
   ```

3. **Test endpoints manually**:
   ```bash
   curl https://your-app.up.railway.app/api/world-state
   ```

## Security Considerations

### CORS Configuration

Configure allowed origins for production:

```javascript
const corsOptions = {
  origin: [
    'https://your-netlify-site.netlify.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
};
```

### Rate Limiting

Consider adding rate limiting for production:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### Input Validation

Validate all Socket.IO event data:

```javascript
socket.on('chat-message', (data) => {
  if (!data.message || data.message.length > 200) {
    return; // Reject invalid messages
  }
  // Process valid message
});
```

## Migration and Backup

### Data Export

Export world state for backup:

```bash
curl https://your-app.up.railway.app/api/world-state > backup.json
```

### Server Migration

To migrate to a new Railway project:

1. **Export environment variables** from old project
2. **Create new project** from same repository
3. **Import environment variables**
4. **Update frontend URL** to point to new backend
5. **Test all functionality**

## Next Steps

1. **Monitor performance** in Railway dashboard
2. **Set up alerts** for downtime or high usage
3. **Consider database** for persistent storage
4. **Implement authentication** for private worlds
5. **Add room management** for multiple 3D worlds

## Support

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Project Issues**: [GitHub Issues](https://github.com/MCERQUA/3D-threejs-site/issues)
- **General Setup**: [Complete Setup Guide](SETUP.md)