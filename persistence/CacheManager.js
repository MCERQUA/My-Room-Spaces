const Redis = require('ioredis');

class CacheManager {
    constructor(config = {}) {
        // Initialize Redis connection
        this.redis = config.cluster ? 
            new Redis.Cluster(config.nodes || [
                { host: 'localhost', port: 6379 }
            ], {
                redisOptions: {
                    password: config.password || process.env.REDIS_PASSWORD
                }
            }) :
            new Redis({
                host: config.host || 'localhost',
                port: config.port || 6379,
                password: config.password || process.env.REDIS_PASSWORD,
                db: config.db || 0,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });

        // Configure TTLs for different data types
        this.ttls = {
            object: config.ttls?.object || 3600,        // 1 hour
            user: config.ttls?.user || 1800,            // 30 minutes
            model: config.ttls?.model || 86400,         // 24 hours
            session: config.ttls?.session || 300,       // 5 minutes
            worldState: config.ttls?.worldState || 600, // 10 minutes
            chatHistory: config.ttls?.chatHistory || 1800, // 30 minutes
            statistics: config.ttls?.statistics || 300  // 5 minutes
        };

        // Pub/Sub channels
        this.channels = {
            objectUpdates: 'world:objects:updates',
            userPresence: 'world:users:presence',
            chatMessages: 'world:chat:messages',
            screenShare: 'world:screen:share'
        };

        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.redis.on('connect', () => {
            console.log('✅ Redis cache connected');
        });

        this.redis.on('error', (error) => {
            console.error('❌ Redis error:', error);
        });

        this.redis.on('close', () => {
            console.log('Redis connection closed');
        });
    }

    // ==================== BASIC CACHE OPERATIONS ====================

    async get(type, id) {
        const key = this.makeKey(type, id);
        
        try {
            const cached = await this.redis.get(key);
            
            if (cached) {
                this.stats.hits++;
                // Refresh TTL on access
                await this.redis.expire(key, this.ttls[type] || 3600);
                return JSON.parse(cached);
            }
            
            this.stats.misses++;
            return null;
        } catch (error) {
            console.error(`Cache get error for ${key}:`, error);
            return null;
        }
    }

    async set(type, id, data, ttl = null) {
        const key = this.makeKey(type, id);
        const ttlSeconds = ttl || this.ttls[type] || 3600;
        
        try {
            await this.redis.setex(
                key,
                ttlSeconds,
                JSON.stringify(data)
            );
            this.stats.sets++;
            return true;
        } catch (error) {
            console.error(`Cache set error for ${key}:`, error);
            return false;
        }
    }

    async delete(type, id) {
        const key = this.makeKey(type, id);
        
        try {
            await this.redis.del(key);
            this.stats.deletes++;
            return true;
        } catch (error) {
            console.error(`Cache delete error for ${key}:`, error);
            return false;
        }
    }

    async invalidate(pattern) {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                this.stats.deletes += keys.length;
            }
            return keys.length;
        } catch (error) {
            console.error(`Cache invalidate error for ${pattern}:`, error);
            return 0;
        }
    }

    // ==================== HASH OPERATIONS ====================

    async hget(type, id, field) {
        const key = this.makeKey(type, id);
        
        try {
            const value = await this.redis.hget(key, field);
            if (value) {
                this.stats.hits++;
                return JSON.parse(value);
            }
            this.stats.misses++;
            return null;
        } catch (error) {
            console.error(`Hash get error for ${key}:${field}:`, error);
            return null;
        }
    }

    async hset(type, id, field, value, ttl = null) {
        const key = this.makeKey(type, id);
        
        try {
            await this.redis.hset(key, field, JSON.stringify(value));
            if (ttl || this.ttls[type]) {
                await this.redis.expire(key, ttl || this.ttls[type]);
            }
            this.stats.sets++;
            return true;
        } catch (error) {
            console.error(`Hash set error for ${key}:${field}:`, error);
            return false;
        }
    }

    async hgetall(type, id) {
        const key = this.makeKey(type, id);
        
        try {
            const hash = await this.redis.hgetall(key);
            if (Object.keys(hash).length > 0) {
                this.stats.hits++;
                // Parse all values
                const parsed = {};
                for (const [field, value] of Object.entries(hash)) {
                    try {
                        parsed[field] = JSON.parse(value);
                    } catch {
                        parsed[field] = value;
                    }
                }
                return parsed;
            }
            this.stats.misses++;
            return null;
        } catch (error) {
            console.error(`Hash getall error for ${key}:`, error);
            return null;
        }
    }

    // ==================== WORLD STATE CACHING ====================

    async cacheWorldState(spaceId, worldState) {
        const multi = this.redis.multi();
        const prefix = `space:${spaceId}`;
        
        try {
            // Cache objects
            if (worldState.objects) {
                for (const [objectId, objectData] of Object.entries(worldState.objects)) {
                    multi.hset(
                        `${prefix}:objects`,
                        objectId,
                        JSON.stringify(objectData)
                    );
                }
            }
            
            // Cache models
            if (worldState.uploadedModels) {
                for (const [modelId, modelData] of Object.entries(worldState.uploadedModels)) {
                    multi.hset(
                        `${prefix}:models`,
                        modelId,
                        JSON.stringify(modelData)
                    );
                }
            }
            
            // Cache chat history
            if (worldState.chatHistory) {
                multi.set(
                    `${prefix}:chat`,
                    JSON.stringify(worldState.chatHistory),
                    'EX',
                    this.ttls.chatHistory
                );
            }
            
            // Cache active users
            if (worldState.users) {
                multi.set(
                    `${prefix}:users`,
                    JSON.stringify(worldState.users),
                    'EX',
                    this.ttls.user
                );
            }
            
            // Cache screen share state
            if (worldState.sharedScreen) {
                multi.set(
                    `${prefix}:screen`,
                    JSON.stringify(worldState.sharedScreen),
                    'EX',
                    300 // 5 minutes
                );
            }
            
            // Set expiry for hash keys
            multi.expire(`${prefix}:objects`, this.ttls.worldState);
            multi.expire(`${prefix}:models`, this.ttls.model);
            
            await multi.exec();
            console.log(`✅ World state cached for space ${spaceId}`);
            return true;
            
        } catch (error) {
            console.error('Failed to cache world state:', error);
            return false;
        }
    }

    async getCachedWorldState(spaceId) {
        const prefix = `space:${spaceId}`;
        
        try {
            const [objects, models, chatJson, usersJson, screenJson] = await Promise.all([
                this.redis.hgetall(`${prefix}:objects`),
                this.redis.hgetall(`${prefix}:models`),
                this.redis.get(`${prefix}:chat`),
                this.redis.get(`${prefix}:users`),
                this.redis.get(`${prefix}:screen`)
            ]);
            
            // Check if we have any cached data
            if (!objects || Object.keys(objects).length === 0) {
                this.stats.misses++;
                return null;
            }
            
            this.stats.hits++;
            
            // Parse objects
            const parsedObjects = {};
            for (const [id, data] of Object.entries(objects)) {
                parsedObjects[id] = JSON.parse(data);
            }
            
            // Parse models
            const parsedModels = {};
            for (const [id, data] of Object.entries(models)) {
                parsedModels[id] = JSON.parse(data);
            }
            
            return {
                objects: parsedObjects,
                uploadedModels: parsedModels,
                chatHistory: chatJson ? JSON.parse(chatJson) : [],
                users: usersJson ? JSON.parse(usersJson) : [],
                sharedScreen: screenJson ? JSON.parse(screenJson) : null
            };
            
        } catch (error) {
            console.error('Failed to get cached world state:', error);
            return null;
        }
    }

    // ==================== SESSION MANAGEMENT ====================

    async setUserSession(userId, sessionData) {
        const key = `session:${userId}`;
        
        try {
            await this.redis.setex(
                key,
                this.ttls.session,
                JSON.stringify(sessionData)
            );
            
            // Add to active users set
            await this.redis.sadd('active:users', userId);
            
            return true;
        } catch (error) {
            console.error('Failed to set user session:', error);
            return false;
        }
    }

    async getUserSession(userId) {
        const key = `session:${userId}`;
        
        try {
            const session = await this.redis.get(key);
            if (session) {
                // Refresh TTL
                await this.redis.expire(key, this.ttls.session);
                return JSON.parse(session);
            }
            return null;
        } catch (error) {
            console.error('Failed to get user session:', error);
            return null;
        }
    }

    async removeUserSession(userId) {
        try {
            await this.redis.del(`session:${userId}`);
            await this.redis.srem('active:users', userId);
            return true;
        } catch (error) {
            console.error('Failed to remove user session:', error);
            return false;
        }
    }

    async getActiveUsers() {
        try {
            const userIds = await this.redis.smembers('active:users');
            return userIds;
        } catch (error) {
            console.error('Failed to get active users:', error);
            return [];
        }
    }

    // ==================== PUB/SUB OPERATIONS ====================

    async publish(channel, data) {
        try {
            const message = JSON.stringify({
                timestamp: Date.now(),
                data
            });
            
            await this.redis.publish(channel, message);
            return true;
        } catch (error) {
            console.error(`Failed to publish to ${channel}:`, error);
            return false;
        }
    }

    createSubscriber() {
        // Create a separate Redis connection for subscriptions
        const subscriber = this.redis.duplicate();
        
        subscriber.on('message', (channel, message) => {
            try {
                const parsed = JSON.parse(message);
                this.handleMessage(channel, parsed);
            } catch (error) {
                console.error('Failed to parse pub/sub message:', error);
            }
        });
        
        return subscriber;
    }

    handleMessage(channel, message) {
        // Override this method in implementations
        console.log(`Received message on ${channel}:`, message);
    }

    // ==================== RATE LIMITING ====================

    async checkRateLimit(userId, action, limit = 10, window = 60) {
        const key = `ratelimit:${action}:${userId}`;
        
        try {
            const current = await this.redis.incr(key);
            
            if (current === 1) {
                await this.redis.expire(key, window);
            }
            
            return {
                allowed: current <= limit,
                remaining: Math.max(0, limit - current),
                resetIn: await this.redis.ttl(key)
            };
        } catch (error) {
            console.error('Rate limit check failed:', error);
            return { allowed: true, remaining: limit, resetIn: 0 };
        }
    }

    // ==================== LEADERBOARDS ====================

    async updateLeaderboard(type, userId, score) {
        const key = `leaderboard:${type}`;
        
        try {
            await this.redis.zadd(key, score, userId);
            return true;
        } catch (error) {
            console.error('Failed to update leaderboard:', error);
            return false;
        }
    }

    async getLeaderboard(type, limit = 10) {
        const key = `leaderboard:${type}`;
        
        try {
            const results = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
            
            const leaderboard = [];
            for (let i = 0; i < results.length; i += 2) {
                leaderboard.push({
                    userId: results[i],
                    score: parseFloat(results[i + 1])
                });
            }
            
            return leaderboard;
        } catch (error) {
            console.error('Failed to get leaderboard:', error);
            return [];
        }
    }

    // ==================== UTILITY METHODS ====================

    makeKey(type, id) {
        return `${type}:${id}`;
    }

    async flush() {
        try {
            await this.redis.flushdb();
            console.log('Cache flushed');
            return true;
        } catch (error) {
            console.error('Failed to flush cache:', error);
            return false;
        }
    }

    async getStats() {
        const info = await this.redis.info('memory');
        const dbSize = await this.redis.dbsize();
        
        return {
            ...this.stats,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
            memoryUsage: info,
            keyCount: dbSize
        };
    }

    async ping() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        } catch (error) {
            console.error('Redis ping failed:', error);
            return false;
        }
    }

    async disconnect() {
        await this.redis.quit();
        console.log('Redis connection closed');
    }
}

module.exports = CacheManager;