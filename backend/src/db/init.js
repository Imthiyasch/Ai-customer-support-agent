import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not set in the .env file.");
    process.exit(1);
  }

  console.log("Connecting to the database...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for cloud databases like Neon
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log("Running schema.sql...");
    await pool.query(schemaSql);
    console.log("✅ Database initialized successfully! All tables and pgvector extension are ready.");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
  } finally {
    await pool.end();
  }
}

initDb();
