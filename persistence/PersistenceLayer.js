const { Pool } = require('pg');

class PersistenceLayer {
    constructor(config) {
        this.pool = new Pool({
            connectionString: config.databaseUrl || process.env.DATABASE_URL,
            ssl: config.ssl !== false ? { rejectUnauthorized: false } : false,
            max: config.poolSize || 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        
        this.spaceId = config.spaceId || 'main';
    }

    // ==================== LIFECYCLE METHODS ====================
    
    async connect() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            console.log('✅ Database connected successfully');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        await this.pool.end();
        console.log('Database connection closed');
    }

    // ==================== SPACE MANAGEMENT ====================
    
    async getOrCreateSpace(spaceName = 'main') {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM spaces WHERE name = $1',
                [spaceName]
            );
            
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            
            const newSpace = await client.query(
                `INSERT INTO spaces (name, is_public, max_users) 
                 VALUES ($1, $2, $3) 
                 RETURNING *`,
                [spaceName, true, 100]
            );
            
            return newSpace.rows[0];
        } finally {
            client.release();
        }
    }

    // ==================== USER MANAGEMENT ====================
    
    async upsertUser(userData) {
        const { userId, username, displayName, avatarUrl } = userData;
        
        const result = await this.pool.query(
            `INSERT INTO users (id, username, display_name, avatar_url, last_seen_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id) DO UPDATE SET
                username = COALESCE($2, users.username),
                display_name = COALESCE($3, users.display_name),
                avatar_url = COALESCE($4, users.avatar_url),
                last_seen_at = NOW()
             RETURNING *`,
            [userId, username, displayName, avatarUrl]
        );
        
        return result.rows[0];
    }

    async createSession(userId, socketId, spaceId) {
        const result = await this.pool.query(
            `INSERT INTO sessions (user_id, socket_id, space_id, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, socketId, spaceId || this.spaceId, null, null]
        );
        
        return result.rows[0];
    }

    async endSession(socketId) {
        const result = await this.pool.query(
            `UPDATE sessions 
             SET disconnected_at = NOW(), 
                 is_active = false,
                 duration_seconds = EXTRACT(EPOCH FROM (NOW() - connected_at))
             WHERE socket_id = $1
             RETURNING *`,
            [socketId]
        );
        
        return result.rows[0];
    }

    async updateUserPosition(userId, position, rotation) {
        await this.pool.query(
            `UPDATE sessions 
             SET position = $2, rotation = $3
             WHERE user_id = $1 AND is_active = true`,
            [userId, JSON.stringify(position), JSON.stringify(rotation)]
        );
    }

    async getActiveUsers(spaceId) {
        const result = await this.pool.query(
            `SELECT u.*, s.position, s.rotation, s.socket_id
             FROM sessions s
             JOIN users u ON s.user_id = u.id
             WHERE s.space_id = $1 AND s.is_active = true`,
            [spaceId || this.spaceId]
        );
        
        return result.rows;
    }

    // ==================== OBJECT MANAGEMENT ====================
    
    async saveObject(objectData) {
        const { 
            objectId, name, type, position, rotation, scale,
            modelId, modelUrl, createdBy, properties 
        } = objectData;
        
        const result = await this.pool.query(
            `INSERT INTO world_objects 
             (object_id, space_id, name, type, position, rotation, scale, 
              model_id, model_url, created_by, properties)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (object_id) DO UPDATE SET
                position = $5, rotation = $6, scale = $7,
                updated_at = NOW(), updated_by = $10
             RETURNING *`,
            [objectId, this.spaceId, name, type, 
             JSON.stringify(position), JSON.stringify(rotation), JSON.stringify(scale),
             modelId, modelUrl, createdBy, JSON.stringify(properties || {})]
        );
        
        return result.rows[0];
    }

    async updateObject(objectId, updates, updatedBy) {
        const { position, rotation, scale, properties } = updates;
        
        const result = await this.pool.query(
            `UPDATE world_objects 
             SET position = COALESCE($2, position),
                 rotation = COALESCE($3, rotation),
                 scale = COALESCE($4, scale),
                 properties = COALESCE($5, properties),
                 updated_by = $6,
                 updated_at = NOW(),
                 interaction_count = interaction_count + 1,
                 last_interacted_at = NOW()
             WHERE object_id = $1
             RETURNING *`,
            [objectId, 
             position ? JSON.stringify(position) : null,
             rotation ? JSON.stringify(rotation) : null,
             scale ? JSON.stringify(scale) : null,
             properties ? JSON.stringify(properties) : null,
             updatedBy]
        );
        
        return result.rows[0];
    }

    async deleteObject(objectId, deletedBy) {
        // Log deletion in audit log before deleting
        await this.logEvent('object.delete', { 
            objectId, 
            deletedBy,
            spaceId: this.spaceId 
        });
        
        const result = await this.pool.query(
            'DELETE FROM world_objects WHERE object_id = $1 RETURNING *',
            [objectId]
        );
        
        return result.rows[0];
    }

    async getObjects(spaceId, limit = 1000) {
        const result = await this.pool.query(
            `SELECT * FROM world_objects 
             WHERE space_id = $1 AND visibility = true
             ORDER BY created_at DESC
             LIMIT $2`,
            [spaceId || this.spaceId, limit]
        );
        
        return result.rows;
    }

    // ==================== MODEL MANAGEMENT ====================
    
    async saveUploadedModel(modelData) {
        const {
            modelId, name, originalFilename, r2Key, publicUrl,
            fileSize, format, uploadedBy
        } = modelData;
        
        const result = await this.pool.query(
            `INSERT INTO uploaded_models 
             (model_id, name, original_filename, r2_key, public_url,
              file_size_bytes, format, uploaded_by, space_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (model_id) DO UPDATE SET
                usage_count = uploaded_models.usage_count + 1,
                last_used_at = NOW()
             RETURNING *`,
            [modelId, name, originalFilename, r2Key, publicUrl,
             fileSize, format, uploadedBy, this.spaceId]
        );
        
        return result.rows[0];
    }

    async getUploadedModels(spaceId) {
        const result = await this.pool.query(
            `SELECT m.*, u.username as uploader_name
             FROM uploaded_models m
             LEFT JOIN users u ON m.uploaded_by = u.id
             WHERE m.space_id = $1 OR m.is_public = true
             ORDER BY m.uploaded_at DESC`,
            [spaceId || this.spaceId]
        );
        
        return result.rows;
    }

    // ==================== CHAT MANAGEMENT ====================
    
    async saveChatMessage(messageData) {
        const { userId, username, message, messageType = 'text' } = messageData;
        
        const result = await this.pool.query(
            `INSERT INTO chat_messages 
             (space_id, user_id, username, message, message_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [this.spaceId, userId, username, message, messageType]
        );
        
        return result.rows[0];
    }

    async getChatHistory(spaceId, limit = 100) {
        const result = await this.pool.query(
            `SELECT c.*, u.avatar_url
             FROM chat_messages c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE c.space_id = $1 AND c.deleted_at IS NULL
             ORDER BY c.created_at DESC
             LIMIT $2`,
            [spaceId || this.spaceId, limit]
        );
        
        return result.rows.reverse(); // Return in chronological order
    }

    async deleteOldMessages(olderThanHours = 24) {
        const result = await this.pool.query(
            `UPDATE chat_messages 
             SET deleted_at = NOW()
             WHERE space_id = $1 
               AND created_at < NOW() - INTERVAL '$2 hours'
               AND deleted_at IS NULL
             RETURNING *`,
            [this.spaceId, olderThanHours]
        );
        
        return result.rowCount;
    }

    // ==================== SCREEN SHARING ====================
    
    async startScreenShare(userId, shareType = 'screen') {
        const result = await this.pool.query(
            `INSERT INTO screen_shares 
             (space_id, user_id, share_type)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [this.spaceId, userId, shareType]
        );
        
        return result.rows[0];
    }

    async endScreenShare(shareId) {
        const result = await this.pool.query(
            `UPDATE screen_shares 
             SET ended_at = NOW(),
                 duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
             WHERE id = $1
             RETURNING *`,
            [shareId]
        );
        
        return result.rows[0];
    }

    async getActiveScreenShare(spaceId) {
        const result = await this.pool.query(
            `SELECT s.*, u.username, u.display_name
             FROM screen_shares s
             JOIN users u ON s.user_id = u.id
             WHERE s.space_id = $1 AND s.ended_at IS NULL
             ORDER BY s.started_at DESC
             LIMIT 1`,
            [spaceId || this.spaceId]
        );
        
        return result.rows[0];
    }

    // ==================== WORLD STATE ====================
    
    async loadWorldState(spaceId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Load all data in parallel
            const [space, objects, models, messages, activeUsers, screenShare] = await Promise.all([
                client.query('SELECT * FROM spaces WHERE id = $1', [spaceId || this.spaceId]),
                client.query(
                    `SELECT * FROM world_objects 
                     WHERE space_id = $1 AND visibility = true 
                     ORDER BY created_at`,
                    [spaceId || this.spaceId]
                ),
                client.query(
                    `SELECT m.*, u.username as uploader_name
                     FROM uploaded_models m
                     LEFT JOIN users u ON m.uploaded_by = u.id
                     WHERE m.space_id = $1 OR m.is_public = true`,
                    [spaceId || this.spaceId]
                ),
                client.query(
                    `SELECT c.*, u.username, u.avatar_url
                     FROM chat_messages c
                     LEFT JOIN users u ON c.user_id = u.id
                     WHERE c.space_id = $1 AND c.deleted_at IS NULL
                     ORDER BY c.created_at DESC
                     LIMIT 100`,
                    [spaceId || this.spaceId]
                ),
                client.query(
                    `SELECT u.*, s.position, s.rotation, s.socket_id
                     FROM sessions s
                     JOIN users u ON s.user_id = u.id
                     WHERE s.space_id = $1 AND s.is_active = true`,
                    [spaceId || this.spaceId]
                ),
                client.query(
                    `SELECT s.*, u.username
                     FROM screen_shares s
                     JOIN users u ON s.user_id = u.id
                     WHERE s.space_id = $1 AND s.ended_at IS NULL
                     LIMIT 1`,
                    [spaceId || this.spaceId]
                )
            ]);
            
            await client.query('COMMIT');
            
            // Transform objects to expected format
            const objectsMap = {};
            objects.rows.forEach(obj => {
                objectsMap[obj.object_id] = {
                    objectId: obj.object_id,
                    name: obj.name,
                    type: obj.type,
                    position: obj.position,
                    rotation: obj.rotation,
                    scale: obj.scale,
                    modelId: obj.model_id,
                    modelUrl: obj.model_url,
                    properties: obj.properties
                };
            });
            
            // Transform models to expected format
            const modelsMap = {};
            models.rows.forEach(model => {
                modelsMap[model.model_id] = {
                    modelId: model.model_id,
                    name: model.name,
                    publicUrl: model.public_url,
                    thumbnailUrl: model.thumbnail_url,
                    uploaderName: model.uploader_name,
                    uploadedAt: model.uploaded_at
                };
            });
            
            return {
                space: space.rows[0],
                objects: objectsMap,
                uploadedModels: modelsMap,
                chatHistory: messages.rows.reverse(),
                users: activeUsers.rows,
                sharedScreen: screenShare.rows[0] ? {
                    userId: screenShare.rows[0].user_id,
                    username: screenShare.rows[0].username,
                    shareType: screenShare.rows[0].share_type
                } : null
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async saveWorldState(worldState) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Save objects
            if (worldState.objects) {
                for (const [objectId, objectData] of Object.entries(worldState.objects)) {
                    await this.saveObject({ ...objectData, objectId });
                }
            }
            
            // Save models
            if (worldState.uploadedModels) {
                for (const [modelId, modelData] of Object.entries(worldState.uploadedModels)) {
                    await this.saveUploadedModel({ ...modelData, modelId });
                }
            }
            
            // Save chat messages
            if (worldState.chatHistory && Array.isArray(worldState.chatHistory)) {
                for (const message of worldState.chatHistory) {
                    await this.saveChatMessage(message);
                }
            }
            
            await client.query('COMMIT');
            console.log('✅ World state saved to database');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Failed to save world state:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // ==================== EVENTS & ANALYTICS ====================
    
    async logEvent(eventType, payload, userId = null) {
        try {
            await this.pool.query(
                `INSERT INTO events (event_type, space_id, user_id, payload)
                 VALUES ($1, $2, $3, $4)`,
                [eventType, this.spaceId, userId, JSON.stringify(payload)]
            );
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }

    async trackVisitor(visitorData) {
        const { visitorId, ipAddress, userAgent, deviceType } = visitorData;
        
        await this.pool.query(
            `INSERT INTO visitor_tracking 
             (visitor_id, space_id, ip_address, user_agent, device_type)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (visitor_id) DO UPDATE SET
                last_visit_at = NOW(),
                visit_count = visitor_tracking.visit_count + 1`,
            [visitorId, this.spaceId, ipAddress, userAgent, deviceType]
        );
    }

    // ==================== STATISTICS ====================
    
    async getSpaceStatistics(spaceId) {
        const result = await this.pool.query(
            `SELECT * FROM space_statistics WHERE space_id = $1`,
            [spaceId || this.spaceId]
        );
        
        if (result.rows.length === 0) {
            // If materialized view is not refreshed, get live data
            const liveStats = await this.pool.query(
                `SELECT 
                    COUNT(DISTINCT s.user_id) as total_unique_users,
                    COUNT(DISTINCT CASE WHEN s.is_active THEN s.user_id END) as active_users,
                    COUNT(DISTINCT o.id) as total_objects,
                    COUNT(DISTINCT m.id) as total_messages
                 FROM spaces sp
                 LEFT JOIN sessions s ON sp.id = s.space_id
                 LEFT JOIN world_objects o ON sp.id = o.space_id
                 LEFT JOIN chat_messages m ON sp.id = m.space_id
                 WHERE sp.id = $1
                 GROUP BY sp.id`,
                [spaceId || this.spaceId]
            );
            
            return liveStats.rows[0];
        }
        
        return result.rows[0];
    }

    async refreshMaterializedViews() {
        try {
            await this.pool.query('SELECT refresh_all_materialized_views()');
            console.log('✅ Materialized views refreshed');
        } catch (error) {
            console.error('Failed to refresh materialized views:', error);
        }
    }

    // ==================== BATCH OPERATIONS ====================
    
    async batchUpdateObjects(updates) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const results = [];
            for (const update of updates) {
                const result = await this.updateObject(
                    update.objectId, 
                    update.data, 
                    update.updatedBy
                );
                results.push(result);
            }
            
            await client.query('COMMIT');
            return results;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ==================== CLEANUP ====================
    
    async cleanup() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Clean up old sessions
            await client.query(
                `UPDATE sessions 
                 SET is_active = false, disconnected_at = NOW()
                 WHERE is_active = true 
                   AND connected_at < NOW() - INTERVAL '24 hours'`
            );
            
            // Clean up old messages
            await client.query(
                `UPDATE chat_messages 
                 SET deleted_at = NOW()
                 WHERE created_at < NOW() - INTERVAL '7 days'
                   AND deleted_at IS NULL`
            );
            
            // Clean up old events
            await client.query(
                `DELETE FROM events 
                 WHERE created_at < NOW() - INTERVAL '30 days'`
            );
            
            await client.query('COMMIT');
            console.log('✅ Database cleanup completed');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Cleanup failed:', error);
        } finally {
            client.release();
        }
    }
}

module.exports = PersistenceLayer;