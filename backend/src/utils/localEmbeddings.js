import { generateEmbedding } from './openai.js';

/**
 * Cloud Embeddings Utility using OpenAI
 * We call this 'local' to maintain API consistency, but it's now Cloud-Powered for 10x Speed!
 */

export async function generateLocalEmbedding(text) {
  try {
    const embedding = await generateEmbedding(text);
    return embedding;
  } catch (error) {
    console.error('Neural Synthesis Error:', error);
    throw new Error('Neural integration failed. Check OpenAI API Key.');
  }
}
