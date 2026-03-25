import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export function normalizeGroqError(error, fallbackMessage) {
  if (error?.status === 429) {
    const wrapped = new Error('Groq rate limit exceeded. Please wait a moment or check your Groq Dashboard.');
    wrapped.statusCode = 429;
    return wrapped;
  }

  if (error?.status === 401) {
    const wrapped = new Error('Groq API key is invalid. Update GROQ_API_KEY in backend/.env.');
    wrapped.statusCode = 401;
    return wrapped;
  }

  const wrapped = new Error(error?.message || fallbackMessage);
  wrapped.statusCode = error?.status || 500;
  return wrapped;
}

/**
 * Sends a chat completion request to Groq SDK.
 * Default model is Llama 3.3 70B Versatile for high-quality answers.
 */
export async function createGroqChatCompletion({ messages, stream = true }) {
  try {
    return await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      stream,
    });
  } catch (error) {
    throw normalizeGroqError(error, 'Failed to generate chat response with Groq');
  }
}

export const getGroqClient = () => groq;
