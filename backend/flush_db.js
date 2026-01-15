import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'fishit',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'fishit',
  password: process.env.DB_PASSWORD || 'fishitpass',
  port: 5433, // <--- FORCE PORT 5433
});

async function flushPipes() {
  try {
    console.log("🧹 Flushing stuck records on Port 5433...");
    const res = await pool.query("DELETE FROM fish_mints WHERE token_id IS NULL");
    console.log(`✅ Deleted ${res.rowCount} ghost records.`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

flushPipes();