import express from 'express';
import multer from 'multer';
import { ClerkExpressRequireAuth, createClerkClient } from '@clerk/clerk-sdk-node';
import { query } from '../db/index.js';
import { chunkText } from '../utils/openai.js';
import { generateLocalEmbedding } from '../utils/localEmbeddings.js';
import { handleUpload } from '@vercel/blob/client';
import { extractTextFromBuffer } from '../utils/documentProcessor.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Helper: Sync/Update User Identity from Clerk
 * Ensures the 'users' table has the latest real name and email.
 */
async function syncUserIdentity(userId) {
  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress || 'unknown@clerk';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0];
    await query('INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = $2', [userId, email]);
    return { email, name };
  } catch (error) {
    console.error('Clerk Sync Error:', error);
    return { email: 'unknown@clerk', name: 'Aura Guest' };
  }
}

/**
 * Vercel Blob: Client-Side Upload Security Handshake
 * This allows the browser to upload 100MB+ files directly to Vercel
 * while the server stays secure. 
 * (Temp: Removed Auth to solve fetch issues)
 */
router.post('/handle-blob-upload', async (req, res) => {
  const body = req.body;
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Here you can check User Authentication via Clerk if needed
        return {
          allowedContentTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json', 'text/plain', 'text/markdown', 'application/csv'],
          tokenPayload: JSON.stringify({ userId: req.auth?.userId || 'guest', kbName: clientPayload.kbName })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Blob upload finished:', blob.url);
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Blob upload handle error:', error);
    return res.status(400).json({ error: error.message });
  }
});

// Finalize and process the cloud-uploaded file
router.post('/process-blob', ClerkExpressRequireAuth(), async (req, res) => {
  const { blobUrl, kbName, description } = req.body;
  if (!blobUrl) return res.status(400).json({ error: 'No blob URL provided' });

  const userId = req.auth.userId;

  try {
    // 1. Fetch file content from the blob URL
    const response = await fetch(blobUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const originalname = blobUrl.split('/').pop().split('?')[0];

    // 2. Logic to Get KB or Create
    await syncUserIdentity(userId); // Live Identity Refresh!
    let kbRes = await query('SELECT id FROM knowledge_bases WHERE user_id = $1 AND name = $2', [userId, kbName]);
    let kbId;
    if (kbRes.rows.length === 0) {
      const newKb = await query('INSERT INTO knowledge_bases (user_id, name, description) VALUES ($1, $2, $3) RETURNING id', [userId, kbName, description]);
      kbId = newKb.rows[0].id;
    } else {
      kbId = kbRes.rows[0].id;
    }

    // 3. Document and Embedding record
    const docRes = await query(
      'INSERT INTO documents (knowledge_base_id, filename, file_type, status) VALUES ($1, $2, $3, $4) RETURNING id', 
      [kbId, originalname, 'blob', 'processing']
    );
    const docId = docRes.rows[0].id;

    // 4. Extraction and Embedding
    const text = await extractTextFromBuffer(buffer, 'application/octet-stream', originalname);
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      const embedding = await generateLocalEmbedding(chunk);
      await query(
        'INSERT INTO document_chunks (document_id, content, embedding) VALUES ($1, $2, $3)', 
        [docId, chunk, JSON.stringify(embedding)]
      );
    }

    await query("UPDATE documents SET status = 'complete' WHERE id = $1", [docId]);
    res.json({ message: 'Cloud document processed', kbId, docId, chunks: chunks.length });
  } catch (err) {
    console.error('Blob process error:', err);
    res.status(500).json({ error: 'Cloud synthesis failed' });
  }
});

// Upload and process document (Old Multer Route for local/small files - keep for fallback)
router.post('/', ClerkExpressRequireAuth(), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const userId = req.auth.userId;
  const { originalname, buffer, mimetype } = req.file;
  // Use a default selected KB or create one for demo purposes
  const kbName = req.body.kbName || 'Default Knowledge Base';
  const description = req.body.description || '';

  try {
    // 0. Ensure user exists in our local DB
    await syncUserIdentity(userId); // Live Identity Refresh!

    // 1. Get or create knowledge base
    let kbRes = await query('SELECT id FROM knowledge_bases WHERE user_id = $1 AND name = $2', [userId, kbName]);
    let kbId;
    if (kbRes.rows.length === 0) {
      const newKb = await query('INSERT INTO knowledge_bases (user_id, name, description) VALUES ($1, $2, $3) RETURNING id', [userId, kbName, description]);
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
    const text = await extractTextFromBuffer(buffer, mimetype, originalname);

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
