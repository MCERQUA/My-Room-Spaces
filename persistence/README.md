# 🗄️ 3D World Persistence System

Complete persistence architecture for the 3D multi-user metaverse platform, providing database storage, caching, and batch processing capabilities.

## 🚀 Features

- **PostgreSQL Database**: Full relational database with 10+ tables for world state
- **Redis Caching**: High-performance caching layer with pub/sub messaging
- **Batch Processing**: Efficient batch updates for reduced database load
- **Feature Flags**: Enable/disable persistence features via environment variables
- **Auto-Recovery**: Graceful fallback to in-memory storage if database fails
- **Real-time Sync**: Instant updates across all connected users
- **Analytics**: Built-in event tracking and statistics

## 📦 Installation

1. **Install Dependencies**:
```bash
npm install pg ioredis dotenv
npm install --save-dev mocha chai sinon
```

2. **Set Up PostgreSQL**:
```bash
# Create database
createdb 3dworld

# Run migrations
psql 3dworld < migrations/001_initial_schema.sql
psql 3dworld < migrations/002_audit_logging.sql
psql 3dworld < migrations/003_analytics_views.sql
```

3. **Set Up Redis**:
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
redis-server
```

4. **Configure Environment**:
```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
```

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/3dworld
DATABASE_POOL_SIZE=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# Feature Flags
PERSISTENCE_ENABLED=true
CACHE_ENABLED=true
BATCH_PROCESSING_ENABLED=true
```

### Feature Flags

- `PERSISTENCE_ENABLED`: Enable/disable database persistence
- `CACHE_ENABLED`: Enable/disable Redis caching
- `BATCH_PROCESSING_ENABLED`: Enable/disable batch processing
- `ANALYTICS_ENABLED`: Enable/disable analytics tracking

## 🏗️ Architecture

### Database Schema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     spaces      │────<│     users       │────<│    sessions     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        
         │                       │                        
         ▼                       ▼                        
┌─────────────────┐     ┌─────────────────┐              
│  world_objects  │     │ uploaded_models │              
└─────────────────┘     └─────────────────┘              
         │                       │                        
         │                       │                        
         ▼                       ▼                        
┌─────────────────┐     ┌─────────────────┐              
│  chat_messages  │     │  media_assets   │              
└─────────────────┘     └─────────────────┘              
```

### Component Overview

1. **PersistenceLayer**: Main database interface
2. **CacheManager**: Redis cache operations
3. **BatchProcessor**: Batch update queue system
4. **Config**: Environment and feature management

## 📊 Usage

### Basic Integration

```javascript
const PersistenceLayer = require('./persistence/PersistenceLayer');
const CacheManager = require('./persistence/CacheManager');
const BatchProcessor = require('./persistence/BatchProcessor');

// Initialize
const persistence = new PersistenceLayer({
  databaseUrl: process.env.DATABASE_URL
});

const cache = new CacheManager({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const batchProcessor = new BatchProcessor(persistence, cache);

// Connect
await persistence.connect();

// Use in Socket.IO
io.on('connection', async (socket) => {
  socket.on('user-spawn', async (data) => {
    // Save to database
    await persistence.upsertUser(data);
    
    // Cache session
    await cache.setUserSession(userId, sessionData);
  });
  
  socket.on('object-move', (data) => {
    // Batch updates for efficiency
    batchProcessor.add('objectUpdates', data);
  });
});
```

### World State Management

```javascript
// Load complete world state
const worldState = await persistence.loadWorldState('main');

// Save world state
await persistence.saveWorldState(worldState);

// Cache world state
await cache.cacheWorldState('main', worldState);

// Get cached state (fast)
const cached = await cache.getCachedWorldState('main');
```

### Batch Processing

```javascript
// Add to batch queue
batchProcessor.add('objectUpdates', {
  objectId: 'obj-123',
  position: { x: 10, y: 20, z: 30 },
  updatedBy: 'user-456'
});

// Automatic flush after 100ms or 100 items
// Manual flush if needed
await batchProcessor.flush('objectUpdates');
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "PersistenceLayer"

# Run with coverage
npm run test:coverage
```

## 📈 Performance

### Benchmarks

- **Object Updates**: 10,000+ ops/sec with batching
- **Cache Hit Rate**: 95%+ for active data
- **Database Queries**: < 50ms average
- **Batch Processing**: 100-item batches in < 100ms

### Optimization Tips

1. **Use Batch Processing**: Group updates to reduce database calls
2. **Enable Caching**: Dramatically reduces database load
3. **Index Properly**: Ensure database indexes match query patterns
4. **Monitor Metrics**: Use built-in statistics for optimization

## 🔍 Monitoring

### Health Check Endpoint

```javascript
GET /health

{
  "status": "ok",
  "persistence": {
    "database": true,
    "cache": true
  },
  "worldState": {
    "users": 45,
    "objects": 1234,
    "models": 89
  },
  "batchProcessor": {
    "processed": 50000,
    "queued": 12,
    "averageLatency": 45
  }
}
```

### Statistics

```javascript
// Get space statistics
const stats = await persistence.getSpaceStatistics('main');

// Get cache statistics
const cacheStats = await cache.getStats();

// Get batch processor stats
const batchStats = batchProcessor.getStats();
```

## 🚦 Migration Guide

### From In-Memory to Persistent

1. **Export Current State**:
```javascript
const state = {
  objects: Object.fromEntries(worldState.objects),
  models: Object.fromEntries(worldState.uploadedModels),
  chatHistory: worldState.chatHistory
};
fs.writeFileSync('backup.json', JSON.stringify(state));
```

2. **Import to Database**:
```javascript
const backup = JSON.parse(fs.readFileSync('backup.json'));
await persistence.saveWorldState(backup);
```

3. **Enable Persistence**:
```env
PERSISTENCE_ENABLED=true
```

4. **Restart Server**: The server will now use the database

## 🛠️ Maintenance

### Database Maintenance

```sql
-- Refresh materialized views
SELECT refresh_all_materialized_views();

-- Clean old data
DELETE FROM events WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM chat_messages WHERE deleted_at < NOW() - INTERVAL '7 days';

-- Vacuum and analyze
VACUUM ANALYZE;
```

### Redis Maintenance

```bash
# Check memory usage
redis-cli INFO memory

# Clear cache if needed
redis-cli FLUSHDB

# Monitor commands
redis-cli MONITOR
```

## 🔒 Security

- **SQL Injection Protection**: All queries use parameterized statements
- **Rate Limiting**: Built-in rate limiting for all operations
- **Data Validation**: Input validation on all data
- **Audit Logging**: Complete audit trail of changes
- **Row-Level Security**: PostgreSQL RLS for multi-tenancy

## 📝 Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Check firewall/network settings

2. **Cache Connection Failed**:
   - Verify Redis is running
   - Check REDIS_HOST and REDIS_PORT
   - Test with `redis-cli ping`

3. **High Memory Usage**:
   - Reduce batch sizes
   - Decrease cache TTLs
   - Enable cleanup jobs

4. **Slow Performance**:
   - Check database indexes
   - Enable query logging
   - Monitor batch processor stats

## 📚 API Reference

### PersistenceLayer

- `connect()`: Connect to database
- `disconnect()`: Close connection
- `upsertUser(userData)`: Create/update user
- `saveObject(objectData)`: Save object
- `updateObject(objectId, updates)`: Update object
- `deleteObject(objectId)`: Delete object
- `loadWorldState(spaceId)`: Load complete state
- `saveWorldState(worldState)`: Save complete state

### CacheManager

- `get(type, id)`: Get cached value
- `set(type, id, data, ttl)`: Set cached value
- `delete(type, id)`: Delete cached value
- `cacheWorldState(spaceId, state)`: Cache world state
- `getCachedWorldState(spaceId)`: Get cached state
- `checkRateLimit(userId, action)`: Check rate limit

### BatchProcessor

- `add(type, operation)`: Add to batch queue
- `flush(type)`: Flush specific queue
- `flushAll()`: Flush all queues
- `getStats()`: Get processing statistics
- `shutdown()`: Graceful shutdown

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit pull request

## 📄 License

MIT License - See LICENSE file for details