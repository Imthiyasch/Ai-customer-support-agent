import { pipeline } from '@xenova/transformers';

/**
 * Local Embeddings Utility using Hugging Face (Xenova/Transformers)
 * This runs locally on your server for 100% FREE and UNLIMITED embeddings.
 */

let extractor;

// Initialize the model (it downloads on the first run, then caches)
export async function getExtractor() {
  if (!extractor) {
    // Model: BGE-Small-EN-v1.5 (Excellent RAG performance, 384 dimensions)
    extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
  }
  return extractor;
}

/**
 * Generates an embedding vector for the given text.
 * Output dimension: 384
 */
export async function generateLocalEmbedding(text) {
  try {
    const extract = await getExtractor();
    const output = await extract(text, { pooling: 'mean', normalize: true });
    
    // Convert the Tensor to a standard JavaScript array
    const embedding = Array.from(output.data);
    return embedding;
  } catch (error) {
    console.error('Local Embedding Error:', error);
    throw new Error('Failed to generate local embedding');
  }
}
