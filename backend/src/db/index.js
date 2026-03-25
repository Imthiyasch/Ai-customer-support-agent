import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

// Provide utility for vector similarity searches down the line
