import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database Setup Script
 * 
 * Runs the schema.sql to create tables and indexes
 */

async function setupDatabase() {
  try {
    console.log('📦 Setting up FishIt database...\n');

    // Read schema file
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📝 Executing schema...');

    // Execute schema
    await db.query(schema);

    console.log('✅ Database schema created successfully!');

    // Verify tables
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Tables created:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Test insert
    console.log('\n🧪 Testing database...');
    const testResult = await db.query('SELECT NOW() as current_time');
    console.log(`   Current database time: ${testResult.rows[0].current_time}`);

    console.log('\n✅ Database setup complete!\n');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);

  } finally {
    await db.close();
  }
}

setupDatabase();