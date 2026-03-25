import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function normalizeOpenAiError(error, fallbackMessage) {
  if (error?.status === 429) {
    const wrapped = new Error('OpenAI quota exceeded. Update billing or replace the API key in backend/.env.');
    wrapped.statusCode = 502;
    return wrapped;
  }

  if (error?.status === 401) {
    const wrapped = new Error('OpenAI API key is invalid. Update OPENAI_API_KEY in backend/.env.');
    wrapped.statusCode = 502;
    return wrapped;
  }

  const wrapped = new Error(error?.message || fallbackMessage);
  wrapped.statusCode = error?.status || 500;
  return wrapped;
}

export async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    });
    return response.data[0].embedding;
  } catch (error) {
    throw normalizeOpenAiError(error, 'Failed to generate embedding');
  }
}

export function chunkText(text, chunkSize = 1000, chunkOverlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + chunkSize);
    chunks.push(chunk);
    i += chunkSize - chunkOverlap;
  }
  return chunks;
}

export const getOpenAIClient = () => openai;
