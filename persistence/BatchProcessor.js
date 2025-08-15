class BatchProcessor {
    constructor(persistenceLayer, cacheManager, options = {}) {
        this.persistence = persistenceLayer;
        this.cache = cacheManager;
        
        // Configuration
        this.config = {
            batchSize: options.batchSize || 100,
            flushInterval: options.flushInterval || 100, // ms
            maxQueueSize: options.maxQueueSize || 10000,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000 // ms
        };
        
        // Queues for different operation types
        this.queues = {
            objectUpdates: [],
            userPositions: [],
            chatMessages: [],
            events: [],
            metrics: []
        };
        
        // Timers for batch processing
        this.timers = {};
        
        // Statistics
        this.stats = {
            processed: 0,
            failed: 0,
            retried: 0,
            queuedTotal: 0,
            averageLatency: 0
        };
        
        // Start periodic flush
        this.startPeriodicFlush();
    }

    // ==================== QUEUE MANAGEMENT ====================

    add(type, operation) {
        if (!this.queues[type]) {
            console.error(`Unknown operation type: ${type}`);
            return false;
        }
        
        // Check queue size limit
        if (this.queues[type].length >= this.config.maxQueueSize) {
            console.warn(`Queue ${type} is full, dropping operation`);
            this.stats.failed++;
            return false;
        }
        
        // Add timestamp to operation
        operation.timestamp = Date.now();
        operation.retryCount = 0;
        
        // Add to queue
        this.queues[type].push(operation);
        this.stats.queuedTotal++;
        
        // Schedule flush if not already scheduled
        if (!this.timers[type]) {
            this.scheduleFlush(type);
        }
        
        // Immediate flush if batch size reached
        if (this.queues[type].length >= this.config.batchSize) {
            this.flush(type);
        }
        
        return true;
    }

    scheduleFlush(type) {
        this.timers[type] = setTimeout(() => {
            this.flush(type);
        }, this.config.flushInterval);
    }

    async flush(type) {
        // Clear timer
        if (this.timers[type]) {
            clearTimeout(this.timers[type]);
            delete this.timers[type];
        }
        
        const queue = this.queues[type];
        if (queue.length === 0) return;
        
        // Take batch from queue
        const batch = queue.splice(0, this.config.batchSize);
        
        try {
            await this.processBatch(type, batch);
            
            // Reschedule if more items in queue
            if (queue.length > 0) {
                this.scheduleFlush(type);
            }
        } catch (error) {
            console.error(`Batch processing failed for ${type}:`, error);
            
            // Retry failed batch items
            await this.retryBatch(type, batch);
        }
    }

    async flushAll() {
        const flushPromises = Object.keys(this.queues).map(type => this.flush(type));
        await Promise.all(flushPromises);
    }

    // ==================== BATCH PROCESSING ====================

    async processBatch(type, batch) {
        const startTime = Date.now();
        
        switch (type) {
            case 'objectUpdates':
                await this.processObjectUpdates(batch);
                break;
            case 'userPositions':
                await this.processUserPositions(batch);
                break;
            case 'chatMessages':
                await this.processChatMessages(batch);
                break;
            case 'events':
                await this.processEvents(batch);
                break;
            case 'metrics':
                await this.processMetrics(batch);
                break;
            default:
                throw new Error(`Unknown batch type: ${type}`);
        }
        
        // Update statistics
        const latency = Date.now() - startTime;
        this.updateStats(batch.length, latency);
        
        console.log(`✅ Processed ${batch.length} ${type} in ${latency}ms`);
    }

    async processObjectUpdates(batch) {
        if (batch.length === 0) return;
        
        const client = await this.persistence.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Prepare batch update query
            const values = [];
            const params = [];
            let paramIndex = 1;
            
            batch.forEach(update => {
                values.push(`($${paramIndex}, $${paramIndex+1}::jsonb, $${paramIndex+2}::jsonb, $${paramIndex+3}::jsonb, $${paramIndex+4}, NOW())`);
                params.push(
                    update.objectId,
                    JSON.stringify(update.position || {}),
                    JSON.stringify(update.rotation || {}),
                    JSON.stringify(update.scale || {}),
                    update.updatedBy
                );
                paramIndex += 5;
            });
            
            // Execute batch update
            const query = `
                UPDATE world_objects AS wo SET
                    position = COALESCE(u.position, wo.position),
                    rotation = COALESCE(u.rotation, wo.rotation),
                    scale = COALESCE(u.scale, wo.scale),
                    updated_by = u.updated_by,
                    updated_at = u.updated_at,
                    interaction_count = wo.interaction_count + 1
                FROM (VALUES ${values.join(',')}) 
                AS u(object_id, position, rotation, scale, updated_by, updated_at)
                WHERE wo.object_id = u.object_id::varchar
            `;
            
            await client.query(query, params);
            
            // Update cache
            await this.updateObjectCache(batch);
            
            // Publish updates via Redis pub/sub
            await this.publishObjectUpdates(batch);
            
            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async processUserPositions(batch) {
        if (batch.length === 0) return;
        
        const multi = this.cache.redis.multi();
        
        // Group by space for efficient updates
        const bySpace = {};
        batch.forEach(update => {
            const spaceId = update.spaceId || 'main';
            if (!bySpace[spaceId]) bySpace[spaceId] = [];
            bySpace[spaceId].push(update);
        });
        
        // Process each space
        for (const [spaceId, updates] of Object.entries(bySpace)) {
            const key = `space:${spaceId}:positions`;
            
            updates.forEach(update => {
                const data = {
                    userId: update.userId,
                    position: update.position,
                    rotation: update.rotation,
                    timestamp: update.timestamp
                };
                
                multi.hset(key, update.userId, JSON.stringify(data));
            });
            
            multi.expire(key, 60); // 1 minute TTL for position data
        }
        
        await multi.exec();
        
        // Publish position updates
        for (const [spaceId, updates] of Object.entries(bySpace)) {
            await this.cache.publish(`space:${spaceId}:positions`, updates);
        }
    }

    async processChatMessages(batch) {
        if (batch.length === 0) return;
        
        const client = await this.persistence.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Prepare batch insert
            const values = [];
            const params = [];
            let paramIndex = 1;
            
            batch.forEach(msg => {
                values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4})`);
                params.push(
                    msg.spaceId || 'main',
                    msg.userId,
                    msg.username,
                    msg.message,
                    msg.messageType || 'text'
                );
                paramIndex += 5;
            });
            
            const query = `
                INSERT INTO chat_messages 
                (space_id, user_id, username, message, message_type)
                VALUES ${values.join(',')}
                RETURNING *
            `;
            
            const result = await client.query(query, params);
            
            // Update cache with new messages
            for (const row of result.rows) {
                const spaceId = row.space_id;
                const key = `space:${spaceId}:chat`;
                
                // Add to chat history in cache
                await this.cache.redis.lpush(key, JSON.stringify(row));
                await this.cache.redis.ltrim(key, 0, 99); // Keep last 100 messages
                await this.cache.redis.expire(key, 1800); // 30 minutes
            }
            
            await client.query('COMMIT');
            
            // Publish new messages
            await this.cache.publish('world:chat:messages', result.rows);
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async processEvents(batch) {
        if (batch.length === 0) return;
        
        const client = await this.persistence.pool.connect();
        try {
            // Prepare batch insert
            const values = [];
            const params = [];
            let paramIndex = 1;
            
            batch.forEach(event => {
                values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}::jsonb)`);
                params.push(
                    event.eventType,
                    event.spaceId || 'main',
                    event.userId,
                    JSON.stringify(event.payload || {})
                );
                paramIndex += 4;
            });
            
            const query = `
                INSERT INTO events 
                (event_type, space_id, user_id, payload)
                VALUES ${values.join(',')}
            `;
            
            await client.query(query, params);
            
        } catch (error) {
            console.error('Failed to process events batch:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async processMetrics(batch) {
        if (batch.length === 0) return;
        
        // Aggregate metrics by type
        const aggregated = {};
        
        batch.forEach(metric => {
            const key = `${metric.type}:${metric.id}`;
            if (!aggregated[key]) {
                aggregated[key] = {
                    type: metric.type,
                    id: metric.id,
                    count: 0,
                    sum: 0,
                    min: Infinity,
                    max: -Infinity,
                    values: []
                };
            }
            
            const agg = aggregated[key];
            agg.count++;
            agg.sum += metric.value;
            agg.min = Math.min(agg.min, metric.value);
            agg.max = Math.max(agg.max, metric.value);
            agg.values.push(metric.value);
        });
        
        // Store aggregated metrics in Redis
        const multi = this.cache.redis.multi();
        
        for (const [key, agg] of Object.entries(aggregated)) {
            const avg = agg.sum / agg.count;
            const metricData = {
                type: agg.type,
                id: agg.id,
                count: agg.count,
                sum: agg.sum,
                avg: avg,
                min: agg.min,
                max: agg.max,
                timestamp: Date.now()
            };
            
            // Store in sorted set for time-series data
            multi.zadd(
                `metrics:${agg.type}:${agg.id}`,
                Date.now(),
                JSON.stringify(metricData)
            );
            
            // Keep only last hour of metrics
            multi.zremrangebyscore(
                `metrics:${agg.type}:${agg.id}`,
                '-inf',
                Date.now() - 3600000
            );
            
            // Update current metrics hash
            multi.hset(
                'metrics:current',
                key,
                JSON.stringify(metricData)
            );
        }
        
        await multi.exec();
    }

    // ==================== CACHE UPDATES ====================

    async updateObjectCache(batch) {
        const multi = this.cache.redis.multi();
        
        // Group by space
        const bySpace = {};
        batch.forEach(update => {
            const spaceId = update.spaceId || 'main';
            if (!bySpace[spaceId]) bySpace[spaceId] = [];
            bySpace[spaceId].push(update);
        });
        
        // Update cache for each space
        for (const [spaceId, updates] of Object.entries(bySpace)) {
            const key = `space:${spaceId}:objects`;
            
            updates.forEach(update => {
                const objectData = {
                    objectId: update.objectId,
                    position: update.position,
                    rotation: update.rotation,
                    scale: update.scale,
                    updatedAt: update.timestamp
                };
                
                multi.hset(key, update.objectId, JSON.stringify(objectData));
            });
            
            multi.expire(key, 600); // 10 minutes
        }
        
        await multi.exec();
    }

    async publishObjectUpdates(batch) {
        // Group by space for publishing
        const bySpace = {};
        batch.forEach(update => {
            const spaceId = update.spaceId || 'main';
            if (!bySpace[spaceId]) bySpace[spaceId] = [];
            bySpace[spaceId].push({
                objectId: update.objectId,
                position: update.position,
                rotation: update.rotation,
                scale: update.scale
            });
        });
        
        // Publish to each space channel
        for (const [spaceId, updates] of Object.entries(bySpace)) {
            await this.cache.publish(`space:${spaceId}:objects`, updates);
        }
    }

    // ==================== RETRY LOGIC ====================

    async retryBatch(type, batch) {
        const retryItems = [];
        
        for (const item of batch) {
            item.retryCount = (item.retryCount || 0) + 1;
            
            if (item.retryCount <= this.config.retryAttempts) {
                retryItems.push(item);
                this.stats.retried++;
            } else {
                console.error(`Failed to process ${type} after ${this.config.retryAttempts} attempts:`, item);
                this.stats.failed++;
            }
        }
        
        if (retryItems.length > 0) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
            
            // Re-add to queue
            retryItems.forEach(item => {
                this.queues[type].unshift(item); // Add to front of queue
            });
            
            // Schedule flush
            if (!this.timers[type]) {
                this.scheduleFlush(type);
            }
        }
    }

    // ==================== LIFECYCLE ====================

    startPeriodicFlush() {
        this.periodicFlushInterval = setInterval(() => {
            this.checkQueues();
        }, this.config.flushInterval * 2);
    }

    checkQueues() {
        Object.keys(this.queues).forEach(type => {
            if (this.queues[type].length > 0 && !this.timers[type]) {
                this.flush(type);
            }
        });
    }

    async shutdown() {
        // Stop periodic flush
        if (this.periodicFlushInterval) {
            clearInterval(this.periodicFlushInterval);
        }
        
        // Clear all timers
        Object.values(this.timers).forEach(timer => clearTimeout(timer));
        this.timers = {};
        
        // Flush all remaining items
        await this.flushAll();
        
        console.log('BatchProcessor shutdown complete');
    }

    // ==================== STATISTICS ====================

    updateStats(batchSize, latency) {
        this.stats.processed += batchSize;
        
        // Update average latency
        const totalProcessed = this.stats.processed;
        const currentAvg = this.stats.averageLatency;
        this.stats.averageLatency = (currentAvg * (totalProcessed - batchSize) + latency) / totalProcessed;
    }

    getStats() {
        const queueSizes = {};
        Object.keys(this.queues).forEach(type => {
            queueSizes[type] = this.queues[type].length;
        });
        
        return {
            ...this.stats,
            queues: queueSizes,
            totalQueued: Object.values(queueSizes).reduce((sum, size) => sum + size, 0)
        };
    }

    resetStats() {
        this.stats = {
            processed: 0,
            failed: 0,
            retried: 0,
            queuedTotal: 0,
            averageLatency: 0
        };
    }
}

module.exports = BatchProcessor;