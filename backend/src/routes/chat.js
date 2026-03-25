import express from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { query } from '../db/index.js';
import { normalizeOpenAiError } from '../utils/openai.js';
import { createGroqChatCompletion, normalizeGroqError } from '../utils/groq.js';
import { generateLocalEmbedding } from '../utils/localEmbeddings.js';

const router = express.Router();

router.post('/stream', ClerkExpressRequireAuth(), async (req, res) => {
  const { question, kbId } = req.body;
  const userId = req.auth.userId;

  if (!question || !kbId) return res.status(400).json({ error: 'Missing question or kbId' });

  try {
    // 1. Generate local embedding for the question
    const questionEmbedding = await generateLocalEmbedding(question);

    // 2. Perform vector similarity search
    const searchRes = await query(`
      SELECT c.content, d.filename, 1 - (c.embedding <=> $1::vector) as similarity
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE d.knowledge_base_id = $2
      ORDER BY c.embedding <=> $1::vector
      LIMIT 5;
    `, [JSON.stringify(questionEmbedding), kbId]);

    const contextChunks = searchRes.rows;
    const contextText = contextChunks.map(c => `Source: ${c.filename}\n${c.content}`).join('\n\n');
    const sources = [...new Set(contextChunks.map(c => c.filename))];

    // 3. Construct prompt
    const systemPrompt = `You are an AI assistant. Answer the user's question ONLY using the provided context. If the answer is not in the context, say "I cannot find the answer in the provided documents."\n\nCONTEXT:\n${contextText}`;

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send sources first
    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    // 4. Stream response from Groq
    let stream;
    try {
      stream = await createGroqChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        stream: true,
      });
    } catch (error) {
      throw normalizeGroqError(error, 'Failed to generate chat response');
    }

    let fullAnswer = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullAnswer += content;
      if (content) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
      }
    }

    // 4.5 Generate Suggested Questions
    try {
      const suggestRes = await createGroqChatCompletion({
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Based on the previous answer and context, suggest exactly 3 short follow-up questions the user might want to ask. Output only a JSON array of strings, e.g. ["Question 1", "Question 2", "Question 3"].' },
          { role: 'user', content: `Context: ${contextText}\n\nPrevious Answer: ${fullAnswer}` }
        ],
        stream: false,
      });
      const suggestionsStr = suggestRes.choices[0]?.message?.content || '[]';
      // Basic JSON cleanup if needed
      const match = suggestionsStr.match(/\[.*\]/s);
      const suggestions = match ? JSON.parse(match[0]) : [];
      res.write(`data: ${JSON.stringify({ type: 'suggestions', suggestions })}\n\n`);
    } catch (e) {
      console.error('Failed to generate suggestions', e);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

    // 5. (Async) Save to chat history
    // Ensure user exists
    await query('INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [userId, 'user@clerk']);

    // Get or create a chat
    let chatRes = await query('SELECT id FROM chats WHERE user_id = $1 AND knowledge_base_id = $2 LIMIT 1', [userId, kbId]);
    let chatId;
    if (chatRes.rows.length === 0) {
      const newChat = await query('INSERT INTO chats (user_id, knowledge_base_id, title) VALUES ($1, $2, $3) RETURNING id', [userId, kbId, question.substring(0, 50)]);
      chatId = newChat.rows[0].id;
    } else {
      chatId = chatRes.rows[0].id;
    }

    await query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)', [chatId, 'user', question]);
    await query('INSERT INTO messages (chat_id, role, content, sources) VALUES ($1, $2, $3, $4)', [chatId, 'ai', fullAnswer, JSON.stringify(sources)]);

  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({ error: error.message || 'Chat failed' });
    } else {
      res.end();
    }
  }
});

// Get chat history
router.get('/history/:kbId', ClerkExpressRequireAuth(), async (req, res) => {
  const { kbId } = req.params;
  const userId = req.auth.userId;
  try {
    const chatRes = await query('SELECT id FROM chats WHERE user_id = $1 AND knowledge_base_id = $2 LIMIT 1', [userId, kbId]);
    if (chatRes.rows.length === 0) return res.json([]);
    
    const messages = await query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatRes.rows[0].id]);
    res.json(messages.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
