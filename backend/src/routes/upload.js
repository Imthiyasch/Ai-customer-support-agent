import express from 'express';
import multer from 'multer';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { query } from '../db/index.js';
import { chunkText } from '../utils/openai.js';
import { generateLocalEmbedding } from '../utils/localEmbeddings.js';
import { extractPdfText } from '../utils/pdf.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload and process document
router.post('/', ClerkExpressRequireAuth(), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const userId = req.auth.userId;
  const { originalname, buffer, mimetype } = req.file;
  // Use a default selected KB or create one for demo purposes
  const kbName = req.body.kbName || 'Default Knowledge Base';

  try {
    // 0. Ensure user exists in our local DB
    await query('INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [userId, 'user@clerk']);

    // 1. Get or create knowledge base
    let kbRes = await query('SELECT id FROM knowledge_bases WHERE user_id = $1 AND name = $2', [userId, kbName]);
    let kbId;
    if (kbRes.rows.length === 0) {
      const newKb = await query('INSERT INTO knowledge_bases (user_id, name) VALUES ($1, $2) RETURNING id', [userId, kbName]);
      kbId = newKb.rows[0].id;
    } else {
      kbId = kbRes.rows[0].id;
    }

    // 2. Insert document record
    const docRes = await query(
      'INSERT INTO documents (knowledge_base_id, filename, file_type, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [kbId, originalname, mimetype, 'processing']
    );
    const docId = docRes.rows[0].id;

    // 3. Extract text
    let text = '';
    if (mimetype === 'application/pdf') {
      text = await extractPdfText(buffer);
    } else {
      text = buffer.toString('utf-8');
    }

    // 4. Chunk and Embed
    const chunks = chunkText(text);
    for (const chunk of chunks) {
      const embedding = await generateLocalEmbedding(chunk);
      await query(
        'INSERT INTO document_chunks (document_id, content, embedding) VALUES ($1, $2, $3)',
        [docId, chunk, JSON.stringify(embedding)]
      );
    }

    // 5. Mark as complete
    await query("UPDATE documents SET status = 'complete' WHERE id = $1", [docId]);

    res.json({ message: 'Document processed successfully', kbId, docId, chunks: chunks.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to process document' });
  }
});

// Get user's knowledge bases
router.get('/kbs', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const result = await query(`
      SELECT kb.*, COUNT(d.id) as doc_count 
      FROM knowledge_bases kb 
      LEFT JOIN documents d ON kb.id = d.knowledge_base_id 
      WHERE kb.user_id = $1 
      GROUP BY kb.id
      ORDER BY kb.created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// Update KB (Rename)
router.put('/kb/:id', ClerkExpressRequireAuth(), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.auth.userId;

  try {
    const check = await query('SELECT id FROM knowledge_bases WHERE id = $1 AND user_id = $2', [id, userId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'KB not found or unauthorized' });

    await query('UPDATE knowledge_bases SET name = $1 WHERE id = $2', [name, id]);
    res.json({ message: 'Renamed successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Rename failed' });
  }
});

// Delete KB
router.delete('/kb/:id', ClerkExpressRequireAuth(), async (req, res) => {
  const { id } = req.params;
  const userId = req.auth.userId;

  try {
    const check = await query('SELECT id FROM knowledge_bases WHERE id = $1 AND user_id = $2', [id, userId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'KB not found or unauthorized' });

    await query('DELETE FROM knowledge_bases WHERE id = $1', [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Deletion failed' });
  }
});

export default router;
