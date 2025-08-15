#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  console.log('🔧 Running database migrations...\n');
  
  const client = await pool.connect();
  
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of migration files
    const migrationDir = path.join(__dirname);
    const files = await fs.readdir(migrationDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql') && !f.includes('rollback'))
      .sort();
    
    console.log(`Found ${sqlFiles.length} migration files\n`);
    
    for (const file of sqlFiles) {
      // Check if migration has been run
      const result = await client.query(
        'SELECT * FROM migrations WHERE filename = $1',
        [file]
      );
      
      if (result.rows.length > 0) {
        console.log(`⏩ Skipping ${file} (already executed)`);
        continue;
      }
      
      // Read and execute migration
      console.log(`🚀 Executing ${file}...`);
      const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
      
      try {
        await client.query(sql);
        
        // Record migration
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [file]
        );
        
        console.log(`✅ ${file} executed successfully\n`);
      } catch (error) {
        console.error(`❌ Failed to execute ${file}:`, error.message);
        throw error;
      }
    }
    
    console.log('✨ All migrations completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

module.exports = runMigrations;