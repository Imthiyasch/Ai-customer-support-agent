import { pipeline } from '@xenova/transformers';

/**
 * Local Embeddings Utility using Hugging Face (Xenova/Transformers)
 * Model: Multilingual E5 Small (Perfect for Vercel, supports Malayalam, $0 Cost)
 */

let extractor;

export async function getExtractor() {
  if (!extractor) {
    // 95MB Model - Fast load, high accuracy for Malayalam & English
    extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
  }
  return extractor;
}

export async function generateLocalEmbedding(text) {
  try {
    const extract = await getExtractor();
    const output = await extract(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('Neural Synthesis Error:', error);
    throw new Error('Aura Neural Core failed to initialize.');
  }
}
