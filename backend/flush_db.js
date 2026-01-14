import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function flushPipes() {
  try {
    console.log("🧹 Flushing stuck records...");
    
    // 1. Delete rows with no Token ID (The ghost causing your error)
    const res1 = await pool.query("DELETE FROM fish_mints WHERE token_id IS NULL");
    console.log(`✅ Deleted ${res1.rowCount} ghost records (NULL IDs).`);

    // 2. Reset any 'pending' stuck jobs
    const res2 = await pool.query("DELETE FROM fish_mints WHERE status = 'pending'");
    console.log(`✅ Deleted ${res2.rowCount} stuck pending jobs.`);

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await pool.end();
  }
}

flushPipes();