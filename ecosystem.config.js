// PM2 Ecosystem Configuration File
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name: '3d-world',
    script: './signaling-server-persistent.js',
    
    // Process management
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    combine_logs: true,
    merge_logs: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 5000,
    
    // Monitoring
    min_uptime: '10s',
    max_restarts: 10,
    
    // Node.js arguments
    node_args: '--max-old-space-size=4096',
    
    // Working directory
    cwd: '/home/mikecerqua/projects/3D-threejs-site',
    
    // Post-start actions
    post_update: ['npm install'],
    
    // Environment-specific settings
    env_development: {
      NODE_ENV: 'development',
      DEBUG: true,
      VERBOSE_LOGGING: true
    }
  }]
};