import pkg from 'pg';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { extractPdfText } from '../utils/pdf.js';

dotenv.config();
const { Pool } = pkg;

async function testAll() {
  console.log("=== COMPREHENSIVE DIAGNOSTIC START ===");
  
  const dbUrl = (process.env.DATABASE_URL || "").trim();
  const openAiKey = (process.env.OPENAI_API_KEY || "").trim();

  // 1. Test Database
  console.log("\n--- Step 1: Database ---");
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is empty!");
  } else {
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    try {
      const res = await pool.query('SELECT NOW()');
      console.log("✅ DB Connected:", res.rows[0].now);
    } catch (err) {
      console.error("❌ DB Failed:", err.message);
      console.log("Tip: Check if the host in .env is correct and has no extra spaces.");
    } finally {
      await pool.end();
    }
  }

  // 2. Test OpenAI
  console.log("\n--- Step 2: OpenAI ---");
  if (!openAiKey) {
    console.error("❌ OPENAI_API_KEY is empty!");
  } else {
    const openai = new OpenAI({ apiKey: openAiKey });
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'Test',
      });
      console.log("✅ OpenAI Embedding successful. Dimensions:", response.data[0].embedding.length);
    } catch (err) {
      console.error("❌ OpenAI Failed:", err.message);
      if (err.message.includes("quota")) {
        console.log("Tip: Still getting insufficient_quota. Please check billing.");
      }
    }
  }

  // 3. Test PDF Parsing
  console.log("\n--- Step 3: PDF Parsing ---");
  try {
    if (typeof extractPdfText !== 'function') {
      throw new Error('PDF extractor helper was not loaded');
    }
    console.log("✅ pdf-parse utility is wired and ready.");
  } catch (err) {
    console.error("❌ pdf-parse Failed:", err.message);
  }

  console.log("\n=== COMPREHENSIVE DIAGNOSTIC END ===");
}

testAll();
