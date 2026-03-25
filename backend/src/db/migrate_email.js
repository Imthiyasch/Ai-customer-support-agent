import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Applying migration: ALTER TABLE users ALTER COLUMN email DROP NOT NULL...");
    await pool.query('ALTER TABLE users ALTER COLUMN email DROP NOT NULL;');
    console.log("✅ Migration successful!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await pool.end();
  }
}

migrate();
