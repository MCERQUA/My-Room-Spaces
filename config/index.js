// Configuration loader with environment variables and defaults
require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3001,
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production'
  },
  
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/3dworld',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE) || 20,
    ssl: process.env.DATABASE_SSL !== 'false',
    options: {
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 30000,
      max: parseInt(process.env.DATABASE_POOL_SIZE) || 20
    }
  },
  
  // Redis Cache Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    cluster: process.env.REDIS_CLUSTER === 'true',
    nodes: process.env.REDIS_CLUSTER_NODES ? 
      process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) || 6379 };
      }) : []
  },
  
  // Cloudflare R2 Storage
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKey: process.env.R2_ACCESS_KEY,
    secretKey: process.env.R2_SECRET_KEY,
    bucket: process.env.R2_BUCKET || '3d-world-models',
    publicUrl: process.env.R2_PUBLIC_URL || 'assets.3dworld.com',
    endpoint: process.env.R2_ENDPOINT || 
      `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  },
  
  // Feature Flags
  features: {
    persistence: process.env.PERSISTENCE_ENABLED !== 'false',
    cache: process.env.CACHE_ENABLED !== 'false',
    batchProcessing: process.env.BATCH_PROCESSING_ENABLED !== 'false',
    analytics: process.env.ANALYTICS_ENABLED !== 'false',
    backup: process.env.BACKUP_ENABLED !== 'false',
    debug: process.env.DEBUG === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true'
  },
  
  // Batch Processing
  batch: {
    size: parseInt(process.env.BATCH_SIZE) || 100,
    flushInterval: parseInt(process.env.BATCH_FLUSH_INTERVAL) || 100,
    maxQueueSize: parseInt(process.env.BATCH_MAX_QUEUE_SIZE) || 10000,
    retryAttempts: parseInt(process.env.BATCH_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.BATCH_RETRY_DELAY) || 1000
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    uploadMax: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX) || 5,
    disabled: process.env.DISABLE_RATE_LIMITING === 'true'
  },
  
  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
    sessionSecret: process.env.SESSION_SECRET || 'change-this-secret',
    providers: (process.env.AUTH_PROVIDERS || 'local').split(','),
    tokenExpiry: process.env.TOKEN_EXPIRY || '7d'
  },
  
  // Monitoring
  monitoring: {
    datadogApiKey: process.env.DATADOG_API_KEY,
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  
  // Backup Configuration
  backup: {
    s3Bucket: process.env.BACKUP_S3_BUCKET || '3dworld-backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *' // 2 AM daily
  },
  
  // Cache TTLs (in seconds)
  cacheTTL: {
    object: parseInt(process.env.CACHE_TTL_OBJECT) || 3600,      // 1 hour
    user: parseInt(process.env.CACHE_TTL_USER) || 1800,         // 30 minutes
    model: parseInt(process.env.CACHE_TTL_MODEL) || 86400,      // 24 hours
    session: parseInt(process.env.CACHE_TTL_SESSION) || 300,    // 5 minutes
    worldState: parseInt(process.env.CACHE_TTL_WORLD) || 600,   // 10 minutes
    chatHistory: parseInt(process.env.CACHE_TTL_CHAT) || 1800,  // 30 minutes
    statistics: parseInt(process.env.CACHE_TTL_STATS) || 300    // 5 minutes
  },
  
  // Limits
  limits: {
    maxObjects: parseInt(process.env.MAX_OBJECTS) || 10000,
    maxUsers: parseInt(process.env.MAX_USERS) || 100,
    maxChatHistory: parseInt(process.env.MAX_CHAT_HISTORY) || 100,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    maxModelsPerUser: parseInt(process.env.MAX_MODELS_PER_USER) || 100
  },
  
  // Cleanup Settings
  cleanup: {
    oldSessionsHours: parseInt(process.env.CLEANUP_OLD_SESSIONS_HOURS) || 24,
    oldMessagesdays: parseInt(process.env.CLEANUP_OLD_MESSAGES_DAYS) || 7,
    oldEventsDays: parseInt(process.env.CLEANUP_OLD_EVENTS_DAYS) || 30
  }
};

// Validate required configuration
function validateConfig() {
  const errors = [];
  
  if (config.features.persistence && !config.database.url) {
    errors.push('DATABASE_URL is required when persistence is enabled');
  }
  
  if (config.features.cache && !config.redis.host) {
    errors.push('Redis configuration is required when cache is enabled');
  }
  
  if (config.r2.accountId && (!config.r2.accessKey || !config.r2.secretKey)) {
    errors.push('R2 access credentials are required');
  }
  
  if (config.server.isProduction && config.auth.jwtSecret === 'change-this-secret') {
    errors.push('JWT_SECRET must be changed in production');
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    if (config.server.isProduction) {
      process.exit(1);
    }
  }
}

// Log configuration in development
function logConfig() {
  if (config.features.debug || config.features.verboseLogging) {
    console.log('📋 Configuration loaded:');
    console.log('  Server:', {
      port: config.server.port,
      env: config.server.env
    });
    console.log('  Features:', config.features);
    console.log('  Database:', config.database.url ? '✅ Configured' : '❌ Not configured');
    console.log('  Redis:', config.redis.host ? '✅ Configured' : '❌ Not configured');
    console.log('  R2:', config.r2.accountId ? '✅ Configured' : '❌ Not configured');
  }
}

// Initialize configuration
validateConfig();
logConfig();

module.exports = config;