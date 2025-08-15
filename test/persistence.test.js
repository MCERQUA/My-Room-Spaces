const { describe, it, before, after, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const { v4: uuidv4 } = require('uuid');

// Import modules to test
const PersistenceLayer = require('../persistence/PersistenceLayer');
const CacheManager = require('../persistence/CacheManager');
const BatchProcessor = require('../persistence/BatchProcessor');

// Test configuration
const testConfig = {
  database: {
    databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/3dworld_test',
    poolSize: 5,
    ssl: false
  },
  redis: {
    host: 'localhost',
    port: 6379,
    db: 1 // Use separate database for tests
  }
};

describe('Persistence System Tests', () => {
  let persistence;
  let cache;
  let batchProcessor;
  
  before(async () => {
    // Initialize test instances
    persistence = new PersistenceLayer(testConfig.database);
    cache = new CacheManager(testConfig.redis);
    batchProcessor = new BatchProcessor(persistence, cache, {
      batchSize: 10,
      flushInterval: 50
    });
    
    // Connect to database
    await persistence.connect();
    
    // Clear test data
    await clearTestData();
  });
  
  after(async () => {
    // Cleanup
    await batchProcessor.shutdown();
    await persistence.disconnect();
    await cache.disconnect();
  });
  
  beforeEach(async () => {
    // Reset stats
    cache.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    batchProcessor.resetStats();
  });
  
  // ==================== PERSISTENCE LAYER TESTS ====================
  
  describe('PersistenceLayer', () => {
    describe('User Management', () => {
      it('should create and retrieve a user', async () => {
        const userId = uuidv4();
        const userData = {
          userId,
          username: `testuser_${Date.now()}`,
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg'
        };
        
        const user = await persistence.upsertUser(userData);
        
        expect(user).to.have.property('id', userId);
        expect(user).to.have.property('username', userData.username);
        expect(user).to.have.property('display_name', userData.displayName);
      });
      
      it('should update existing user', async () => {
        const userId = uuidv4();
        
        // Create user
        await persistence.upsertUser({
          userId,
          username: 'original',
          displayName: 'Original Name'
        });
        
        // Update user
        const updated = await persistence.upsertUser({
          userId,
          username: 'updated',
          displayName: 'Updated Name'
        });
        
        expect(updated).to.have.property('username', 'updated');
        expect(updated).to.have.property('display_name', 'Updated Name');
      });
      
      it('should create and end sessions', async () => {
        const userId = uuidv4();
        const socketId = `socket_${Date.now()}`;
        
        // Create user first
        await persistence.upsertUser({
          userId,
          username: 'sessiontest'
        });
        
        // Create session
        const session = await persistence.createSession(userId, socketId, 'main');
        
        expect(session).to.have.property('user_id', userId);
        expect(session).to.have.property('socket_id', socketId);
        expect(session).to.have.property('is_active', true);
        
        // End session
        const ended = await persistence.endSession(socketId);
        
        expect(ended).to.have.property('is_active', false);
        expect(ended).to.have.property('disconnected_at');
        expect(ended).to.have.property('duration_seconds');
      });
      
      it('should track user positions', async () => {
        const userId = uuidv4();
        const position = { x: 10, y: 20, z: 30 };
        const rotation = { x: 0, y: 90, z: 0 };
        
        await persistence.upsertUser({ userId, username: 'postest' });
        await persistence.createSession(userId, `socket_${Date.now()}`, 'main');
        
        await persistence.updateUserPosition(userId, position, rotation);
        
        const activeUsers = await persistence.getActiveUsers('main');
        const user = activeUsers.find(u => u.id === userId);
        
        expect(user).to.exist;
        expect(JSON.parse(user.position)).to.deep.equal(position);
        expect(JSON.parse(user.rotation)).to.deep.equal(rotation);
      });
    });
    
    describe('Object Management', () => {
      it('should save and retrieve objects', async () => {
        const objectData = {
          objectId: uuidv4(),
          name: 'Test Object',
          type: 'model',
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          properties: { color: 'red' }
        };
        
        const saved = await persistence.saveObject(objectData);
        
        expect(saved).to.have.property('object_id', objectData.objectId);
        expect(saved).to.have.property('name', objectData.name);
        expect(JSON.parse(saved.position)).to.deep.equal(objectData.position);
      });
      
      it('should update object positions', async () => {
        const objectId = uuidv4();
        
        // Create object
        await persistence.saveObject({
          objectId,
          name: 'Update Test',
          type: 'primitive',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        });
        
        // Update position
        const newPosition = { x: 5, y: 10, z: 15 };
        const updated = await persistence.updateObject(objectId, {
          position: newPosition
        });
        
        expect(JSON.parse(updated.position)).to.deep.equal(newPosition);
        expect(updated).to.have.property('interaction_count', 1);
      });
      
      it('should delete objects', async () => {
        const objectId = uuidv4();
        
        // Create object
        await persistence.saveObject({
          objectId,
          name: 'Delete Test',
          type: 'model',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        });
        
        // Delete object
        const deleted = await persistence.deleteObject(objectId);
        
        expect(deleted).to.have.property('object_id', objectId);
        
        // Verify deletion
        const objects = await persistence.getObjects('main');
        const found = objects.find(o => o.object_id === objectId);
        expect(found).to.be.undefined;
      });
      
      it('should batch update multiple objects', async () => {
        const updates = [];
        
        // Create test objects
        for (let i = 0; i < 5; i++) {
          const objectId = uuidv4();
          await persistence.saveObject({
            objectId,
            name: `Batch Test ${i}`,
            type: 'model',
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          });
          
          updates.push({
            objectId,
            data: { position: { x: i, y: i, z: i } }
          });
        }
        
        // Batch update
        const results = await persistence.batchUpdateObjects(updates);
        
        expect(results).to.have.lengthOf(5);
        results.forEach((result, index) => {
          expect(JSON.parse(result.position)).to.deep.equal({
            x: index, y: index, z: index
          });
        });
      });
    });
    
    describe('Chat Management', () => {
      it('should save and retrieve chat messages', async () => {
        const messageData = {
          userId: uuidv4(),
          username: 'chatuser',
          message: 'Test message',
          messageType: 'text'
        };
        
        const saved = await persistence.saveChatMessage(messageData);
        
        expect(saved).to.have.property('username', messageData.username);
        expect(saved).to.have.property('message', messageData.message);
        
        const history = await persistence.getChatHistory('main', 10);
        const found = history.find(m => m.id === saved.id);
        expect(found).to.exist;
      });
      
      it('should delete old messages', async () => {
        // Save multiple messages
        for (let i = 0; i < 5; i++) {
          await persistence.saveChatMessage({
            userId: uuidv4(),
            username: `user${i}`,
            message: `Message ${i}`
          });
        }
        
        // Delete messages older than 0 hours (all messages)
        const deletedCount = await persistence.deleteOldMessages(0);
        
        expect(deletedCount).to.be.at.least(5);
      });
    });
    
    describe('World State', () => {
      it('should load complete world state', async () => {
        // Create test data
        const objectId = uuidv4();
        const modelId = uuidv4();
        const userId = uuidv4();
        
        await persistence.saveObject({
          objectId,
          name: 'World State Test',
          type: 'model',
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        });
        
        await persistence.saveUploadedModel({
          modelId,
          name: 'Test Model',
          r2Key: 'models/test.glb',
          publicUrl: 'https://example.com/test.glb',
          fileSize: 1024,
          format: 'glb'
        });
        
        await persistence.saveChatMessage({
          userId,
          username: 'worlduser',
          message: 'World state test message'
        });
        
        // Load world state
        const worldState = await persistence.loadWorldState('main');
        
        expect(worldState).to.have.property('objects');
        expect(worldState).to.have.property('uploadedModels');
        expect(worldState).to.have.property('chatHistory');
        expect(worldState).to.have.property('users');
        
        expect(worldState.objects).to.have.property(objectId);
        expect(worldState.uploadedModels).to.have.property(modelId);
        expect(worldState.chatHistory).to.be.an('array');
      });
      
      it('should save and restore world state', async () => {
        const worldState = {
          objects: {
            'obj1': { 
              objectId: 'obj1',
              name: 'Save Test 1',
              position: { x: 1, y: 1, z: 1 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 }
            }
          },
          uploadedModels: {
            'model1': {
              modelId: 'model1',
              name: 'Model 1',
              publicUrl: 'https://example.com/model1.glb',
              r2Key: 'models/model1.glb',
              fileSize: 2048,
              format: 'glb'
            }
          },
          chatHistory: [
            {
              userId: uuidv4(),
              username: 'saveuser',
              message: 'Save state test'
            }
          ]
        };
        
        await persistence.saveWorldState(worldState);
        
        const loaded = await persistence.loadWorldState('main');
        
        expect(loaded.objects).to.have.property('obj1');
        expect(loaded.uploadedModels).to.have.property('model1');
        expect(loaded.chatHistory).to.be.an('array').with.lengthOf.at.least(1);
      });
    });
  });
  
  // ==================== CACHE MANAGER TESTS ====================
  
  describe('CacheManager', () => {
    describe('Basic Operations', () => {
      it('should set and get cached values', async () => {
        const key = uuidv4();
        const data = { test: 'value', number: 42 };
        
        await cache.set('test', key, data);
        const retrieved = await cache.get('test', key);
        
        expect(retrieved).to.deep.equal(data);
        expect(cache.stats.sets).to.equal(1);
        expect(cache.stats.hits).to.equal(1);
      });
      
      it('should return null for missing keys', async () => {
        const result = await cache.get('test', 'nonexistent');
        
        expect(result).to.be.null;
        expect(cache.stats.misses).to.equal(1);
      });
      
      it('should delete cached values', async () => {
        const key = uuidv4();
        
        await cache.set('test', key, { data: 'test' });
        await cache.delete('test', key);
        
        const result = await cache.get('test', key);
        expect(result).to.be.null;
        expect(cache.stats.deletes).to.equal(1);
      });
      
      it('should invalidate by pattern', async () => {
        // Set multiple values
        await cache.set('test', 'key1', { data: 1 });
        await cache.set('test', 'key2', { data: 2 });
        await cache.set('test', 'key3', { data: 3 });
        
        // Invalidate pattern
        const count = await cache.invalidate('test:key*');
        
        expect(count).to.be.at.least(3);
      });
    });
    
    describe('Hash Operations', () => {
      it('should set and get hash fields', async () => {
        const id = uuidv4();
        const field = 'testfield';
        const value = { test: 'hashvalue' };
        
        await cache.hset('hash', id, field, value);
        const retrieved = await cache.hget('hash', id, field);
        
        expect(retrieved).to.deep.equal(value);
      });
      
      it('should get all hash fields', async () => {
        const id = uuidv4();
        
        await cache.hset('hash', id, 'field1', { value: 1 });
        await cache.hset('hash', id, 'field2', { value: 2 });
        
        const all = await cache.hgetall('hash', id);
        
        expect(all).to.have.property('field1');
        expect(all).to.have.property('field2');
        expect(all.field1).to.deep.equal({ value: 1 });
        expect(all.field2).to.deep.equal({ value: 2 });
      });
    });
    
    describe('World State Caching', () => {
      it('should cache and retrieve world state', async () => {
        const spaceId = 'test-space';
        const worldState = {
          objects: {
            'obj1': { position: { x: 1, y: 2, z: 3 } }
          },
          uploadedModels: {
            'model1': { name: 'Test Model' }
          },
          chatHistory: [
            { message: 'Test message' }
          ],
          users: [
            { username: 'testuser' }
          ],
          sharedScreen: {
            userId: 'user1',
            shareType: 'screen'
          }
        };
        
        await cache.cacheWorldState(spaceId, worldState);
        const retrieved = await cache.getCachedWorldState(spaceId);
        
        expect(retrieved).to.deep.equal(worldState);
      });
    });
    
    describe('Session Management', () => {
      it('should manage user sessions', async () => {
        const userId = uuidv4();
        const sessionData = {
          username: 'sessionuser',
          socketId: 'socket123',
          position: { x: 0, y: 0, z: 0 }
        };
        
        await cache.setUserSession(userId, sessionData);
        const retrieved = await cache.getUserSession(userId);
        
        expect(retrieved).to.deep.equal(sessionData);
        
        const activeUsers = await cache.getActiveUsers();
        expect(activeUsers).to.include(userId);
        
        await cache.removeUserSession(userId);
        const removed = await cache.getUserSession(userId);
        expect(removed).to.be.null;
      });
    });
    
    describe('Rate Limiting', () => {
      it('should enforce rate limits', async () => {
        const userId = uuidv4();
        const action = 'test-action';
        const limit = 5;
        
        for (let i = 0; i < limit + 2; i++) {
          const result = await cache.checkRateLimit(userId, action, limit, 60);
          
          if (i < limit) {
            expect(result.allowed).to.be.true;
            expect(result.remaining).to.equal(limit - i - 1);
          } else {
            expect(result.allowed).to.be.false;
            expect(result.remaining).to.equal(0);
          }
        }
      });
    });
  });
  
  // ==================== BATCH PROCESSOR TESTS ====================
  
  describe('BatchProcessor', () => {
    it('should batch object updates', async (done) => {
      const objectIds = [];
      
      // Create test objects
      for (let i = 0; i < 15; i++) {
        const objectId = uuidv4();
        objectIds.push(objectId);
        
        await persistence.saveObject({
          objectId,
          name: `Batch Object ${i}`,
          type: 'model',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        });
      }
      
      // Add updates to batch processor
      objectIds.forEach((objectId, index) => {
        batchProcessor.add('objectUpdates', {
          objectId,
          position: { x: index, y: index, z: index },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          updatedBy: 'test-user',
          spaceId: 'main'
        });
      });
      
      // Wait for batch processing
      setTimeout(async () => {
        const stats = batchProcessor.getStats();
        expect(stats.processed).to.be.at.least(10);
        expect(stats.failed).to.equal(0);
        done();
      }, 200);
    });
    
    it('should batch chat messages', async (done) => {
      // Add messages to batch
      for (let i = 0; i < 12; i++) {
        batchProcessor.add('chatMessages', {
          userId: uuidv4(),
          username: `batchuser${i}`,
          message: `Batch message ${i}`,
          spaceId: 'main'
        });
      }
      
      // Wait for processing
      setTimeout(async () => {
        const history = await persistence.getChatHistory('main', 20);
        expect(history).to.have.lengthOf.at.least(10);
        
        const stats = batchProcessor.getStats();
        expect(stats.processed).to.be.at.least(10);
        done();
      }, 200);
    });
    
    it('should handle batch errors with retry', async (done) => {
      // Stub database query to fail first time
      const stub = sinon.stub(persistence.pool, 'query');
      stub.onFirstCall().rejects(new Error('Database error'));
      stub.callThrough();
      
      // Add operation
      batchProcessor.add('events', {
        eventType: 'test.event',
        userId: uuidv4(),
        payload: { test: true }
      });
      
      // Wait for retry
      setTimeout(() => {
        const stats = batchProcessor.getStats();
        expect(stats.retried).to.be.at.least(1);
        
        stub.restore();
        done();
      }, 2000);
    });
    
    it('should respect batch size limits', () => {
      const stats = batchProcessor.getStats();
      const initialQueued = stats.totalQueued;
      
      // Add more than batch size
      for (let i = 0; i < 15; i++) {
        batchProcessor.add('metrics', {
          type: 'test',
          id: `metric${i}`,
          value: Math.random() * 100
        });
      }
      
      const newStats = batchProcessor.getStats();
      expect(newStats.queues.metrics).to.be.at.most(15);
    });
    
    it('should flush all queues on shutdown', async () => {
      // Add items to multiple queues
      batchProcessor.add('objectUpdates', {
        objectId: uuidv4(),
        position: { x: 1, y: 1, z: 1 }
      });
      
      batchProcessor.add('chatMessages', {
        userId: uuidv4(),
        username: 'shutdowntest',
        message: 'Shutdown test'
      });
      
      // Shutdown
      await batchProcessor.shutdown();
      
      const stats = batchProcessor.getStats();
      expect(stats.totalQueued).to.equal(0);
    });
  });
  
  // ==================== INTEGRATION TESTS ====================
  
  describe('Integration Tests', () => {
    it('should handle complete user flow', async () => {
      const userId = uuidv4();
      const socketId = `socket_${Date.now()}`;
      
      // User joins
      const user = await persistence.upsertUser({
        userId,
        username: 'integrationuser',
        displayName: 'Integration Test User'
      });
      
      const session = await persistence.createSession(userId, socketId, 'main');
      await cache.setUserSession(userId, { socketId, username: user.username });
      
      // User creates object
      const objectId = uuidv4();
      await persistence.saveObject({
        objectId,
        name: 'User Object',
        type: 'model',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        createdBy: userId
      });
      
      // User sends chat
      await persistence.saveChatMessage({
        userId,
        username: user.username,
        message: 'Integration test message'
      });
      
      // User moves
      await persistence.updateUserPosition(userId, 
        { x: 10, y: 0, z: 10 },
        { x: 0, y: 90, z: 0 }
      );
      
      // User disconnects
      await persistence.endSession(socketId);
      await cache.removeUserSession(userId);
      
      // Verify world state
      const worldState = await persistence.loadWorldState('main');
      expect(worldState.objects).to.have.property(objectId);
      expect(worldState.chatHistory).to.have.lengthOf.at.least(1);
    });
    
    it('should handle cache miss and database fallback', async () => {
      const spaceId = 'cache-test';
      
      // Clear cache
      await cache.flush();
      
      // Load world state (cache miss, database hit)
      const worldState = await persistence.loadWorldState(spaceId);
      
      expect(worldState).to.have.property('objects');
      expect(cache.stats.misses).to.be.at.least(1);
      
      // Cache the state
      await cache.cacheWorldState(spaceId, worldState);
      
      // Load again (cache hit)
      cache.stats.hits = 0;
      const cachedState = await cache.getCachedWorldState(spaceId);
      
      expect(cachedState).to.deep.equal(worldState);
      expect(cache.stats.hits).to.be.at.least(1);
    });
  });
});

// Helper function to clear test data
async function clearTestData() {
  if (!persistence) return;
  
  try {
    await persistence.pool.query('DELETE FROM events');
    await persistence.pool.query('DELETE FROM chat_messages');
    await persistence.pool.query('DELETE FROM world_objects');
    await persistence.pool.query('DELETE FROM uploaded_models');
    await persistence.pool.query('DELETE FROM sessions');
    await persistence.pool.query('DELETE FROM users WHERE username LIKE \'test%\'');
    
    if (cache) {
      await cache.flush();
    }
  } catch (error) {
    console.error('Failed to clear test data:', error);
  }
}