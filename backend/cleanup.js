import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// 1. Determine the best way to connect
// Many setups use DATABASE_URL. If that exists, we use it. 
// Otherwise, we fall back to individual variables.
const dbConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST || 'localhost', // Default to localhost if undefined
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    };

// 2. Handle SSL (Necessary if you use Supabase, Neon, or remote DBs)
if (process.env.DB_SSL === 'true' || (dbConfig.connectionString && dbConfig.connectionString.includes('sslmode=require'))) {
    dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(dbConfig);

async function cleanGhosts() {
  try {
    console.log(`🧹 Connecting to database at ${dbConfig.host || 'remote host'}...`);
    
    // Check for bad rows
    const check = await pool.query('SELECT count(*) FROM fish_mints WHERE token_id IS NULL');
    const count = parseInt(check.rows[0].count);
    console.log(`👀 Found ${count} ghost records.`);

    if (count > 0) {
        const res = await pool.query('DELETE FROM fish_mints WHERE token_id IS NULL');
        console.log(`✅ Successfully deleted ${res.rowCount} bad rows.`);
    } else {
        console.log("✨ Database is already clean!");
    }

  } catch (err) {
    console.error("❌ Error cleaning database:", err.message);
  } finally {
    await pool.end();
  }
}

cleanGhosts();