# 🌍 Netlify Frontend Deployment Guide

This guide covers deploying the frontend static site to Netlify with global CDN distribution.

## Why Netlify?

- **Global CDN**: Fast loading worldwide
- **Automatic HTTPS**: Required for screen sharing
- **GitHub Integration**: Auto-deploy on code changes
- **Free Tier**: Generous limits for personal projects
- **Custom Domains**: Easy domain setup

## Prerequisites

- GitHub account with forked repository
- Netlify account (free signup at [netlify.com](https://netlify.com))
- Railway backend already deployed (see [Railway Deployment Guide](railway-deployment.md))

## Deployment Methods

### Method 1: One-Click Deploy (Fastest)

1. **Fork the repository first**:
   - Go to https://github.com/MCERQUA/3D-threejs-site
   - Click "Fork" (top-right corner)
   - This creates your own copy to customize

2. **Deploy to Netlify**:
   [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR-USERNAME/3D-threejs-site)
   
   *Replace YOUR-USERNAME with your GitHub username*

3. **Authorize and configure**:
   - Sign in to Netlify
   - Authorize GitHub access
   - Choose your forked repository
   - Click "Deploy site"

### Method 2: Manual Netlify Setup

1. **Log into Netlify**:
   - Go to [app.netlify.com](https://app.netlify.com)
   - Sign in or create account

2. **Create new site**:
   - Click "New site from Git"
   - Choose "GitHub"
   - Authorize Netlify to access your repositories

3. **Select repository**:
   - Find and select your forked `3D-threejs-site` repository
   - Click to select it

4. **Configure build settings**:
   ```
   Branch to deploy: main
   Base directory: (leave empty)
   Build command: (leave empty - it's a static site)
   Publish directory: / (root directory)
   ```

5. **Deploy**:
   - Click "Deploy site"
   - Wait for deployment (usually 30-60 seconds)

## Configuration

### Step 1: Get Your Site URL

After deployment, Netlify assigns a random URL like:
```
https://amazing-koala-123456.netlify.app
```

You can customize this in **Site settings > Domain management**.

### Step 2: Connect to Your Backend

1. **Edit your repository**:
   - Go to your GitHub repository
   - Edit `index.html` directly on GitHub (click the file, then edit pencil icon)

2. **Find the backend configuration** (around line 826):
   ```javascript
   const SIGNALING_SERVER = window.location.hostname === 'localhost' 
     ? 'http://localhost:3001'  // Local development
     : 'https://3d-threejs-site-production.up.railway.app';  // Railway backend
   ```

3. **Update with your Railway URL**:
   ```javascript
   const SIGNALING_SERVER = window.location.hostname === 'localhost' 
     ? 'http://localhost:3001'
     : 'https://YOUR-RAILWAY-APP-NAME.up.railway.app';  // Your Railway URL
   ```

4. **Commit the changes**:
   - Scroll down and add commit message: "Connect to Railway backend"
   - Click "Commit changes"

5. **Auto-deploy**:
   - Netlify automatically detects the change
   - New deployment starts within 30 seconds
   - Check deploy progress in Netlify dashboard

### Step 3: Verify Deployment

1. **Visit your site**: Go to your Netlify URL
2. **Check browser console**: Should see connection messages
3. **Test multi-user**: Open multiple tabs, verify avatars appear
4. **Test features**: Name editing, chat, screen sharing

## Advanced Configuration

### Custom Domain Setup

1. **Purchase domain** (optional): From any domain registrar
2. **Add domain to Netlify**:
   - Go to Site settings > Domain management
   - Click "Add custom domain"
   - Enter your domain name
   - Follow DNS configuration instructions

3. **HTTPS Certificate**:
   - Netlify automatically provisions SSL certificates
   - Usually ready within 24 hours

### Environment Variables

Netlify supports environment variables, though the current app doesn't need any:

1. **Go to Site settings > Environment variables**
2. **Add variables** if needed for future features:
   ```
   REACT_APP_API_URL=https://your-backend.up.railway.app
   REACT_APP_FEATURE_FLAG=enabled
   ```

### Build Settings

For the current static site, build settings should be:

```
Base directory: (empty)
Build command: (empty)
Publish directory: /
```

### Redirects and Headers

Create `netlify.toml` in your repository root for advanced configuration:

```toml
# netlify.toml
[build]
  publish = "."
  
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

# SPA fallback (if you add routing later)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Monitoring and Analytics

### Netlify Analytics

1. **Enable analytics**:
   - Go to Site settings > Analytics
   - Enable server-side analytics
   - View traffic, page views, and performance

### Performance Monitoring

1. **Lighthouse scores**: Check in browser DevTools
2. **Core Web Vitals**: Monitor in Google Search Console
3. **Real User Monitoring**: Consider tools like Sentry or LogRocket

## Troubleshooting

### Common Deployment Issues

1. **Deploy failed**:
   - Check the deploy log in Netlify dashboard
   - Ensure your repository is public or Netlify has access
   - Verify file structure (index.html in root)

2. **Site loads but features don't work**:
   - Check browser console for errors
   - Verify backend URL is correct in `index.html`
   - Confirm Railway backend is running

3. **HTTPS certificate issues**:
   - Wait 24 hours for automatic provisioning
   - Check DNS settings if using custom domain
   - Contact Netlify support if issues persist

### Connection Issues

1. **"Failed to connect" errors**:
   ```javascript
   // Check this configuration in index.html
   const SIGNALING_SERVER = window.location.hostname === 'localhost' 
     ? 'http://localhost:3001'
     : 'https://YOUR-ACTUAL-RAILWAY-URL.up.railway.app';
   ```

2. **CORS errors**:
   - Ensure Railway backend allows your Netlify domain
   - Check Railway logs for CORS-related errors

3. **WebSocket connection failed**:
   - Verify HTTPS is working (should show lock icon in browser)
   - Test backend URL directly in browser
   - Check for firewall/network restrictions

## Performance Optimization

### Asset Optimization

The current setup loads Three.js from CDN, which is optimal. For further optimization:

1. **Bundle assets** (future enhancement):
   ```bash
   npm install webpack webpack-cli
   # Configure webpack for production builds
   ```

2. **Image optimization**:
   - Use WebP format for images
   - Compress GLB/GLTF models
   - Implement lazy loading

3. **Code splitting**:
   - Load Three.js modules on demand
   - Split WebRTC functionality

### Caching Strategy

Netlify automatically handles caching, but you can optimize:

1. **Static assets**: Long cache times (1 year)
2. **HTML files**: Short cache times (5 minutes)
3. **API responses**: No caching for real-time data

## Security Considerations

### HTTPS Requirements

- **Screen sharing**: Requires HTTPS in production
- **WebRTC**: Better performance over HTTPS
- **Security headers**: Enabled via netlify.toml

### Content Security Policy

Consider adding CSP headers for enhanced security:

```toml
# In netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' unpkg.com; style-src 'self' 'unsafe-inline'; connect-src 'self' wss: ws: https:;"
```

## Next Steps

1. **Test thoroughly**: All features across multiple browsers
2. **Set up monitoring**: Analytics and error tracking
3. **Customize**: Modify the UI, add your branding
4. **Scale**: Consider CDN optimizations for global users
5. **Add features**: Voice chat, VR support, custom avatars

## Support

- **Netlify Documentation**: [docs.netlify.com](https://docs.netlify.com)
- **Netlify Community**: [community.netlify.com](https://community.netlify.com)
- **Project Issues**: [GitHub Issues](https://github.com/MCERQUA/3D-threejs-site/issues)
- **General Setup**: [Complete Setup Guide](SETUP.md)