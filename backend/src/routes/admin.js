import express from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { query } from '../db/index.js';
import { adminOnly } from '../middleware/admin.js';

const router = express.Router();

// Fetch platform statistics
router.get('/stats', ClerkExpressRequireAuth(), adminOnly, async (req, res) => {
  // In a real app, verify req.auth config for admin role.
  try {
    const userCount = await query('SELECT COUNT(DISTINCT user_id) as count FROM knowledge_bases');
    const docCount = await query('SELECT COUNT(*) as count FROM documents');
    const chatCount = await query('SELECT COUNT(*) as count FROM chats');

    res.json({
      users: userCount.rows[0].count,
      documents: docCount.rows[0].count,
      chats: chatCount.rows[0].count
    });
  } catch (error) {
    res.status(500).json({ error: 'Admin stats failed' });
  }
});

// Fetch all activity
router.get('/activity', ClerkExpressRequireAuth(), adminOnly, async (req, res) => {
  try {
    const activity = await query(`
      SELECT 'document_uploaded' as action, d.filename as kb_name, u.email as user_email, d.created_at 
      FROM documents d
      JOIN knowledge_bases kb ON d.knowledge_base_id = kb.id
      JOIN users u ON kb.user_id = u.id
      UNION ALL
      SELECT 'chat_started' as action, c.title as kb_name, u.email as user_email, c.created_at 
      FROM chats c
      JOIN users u ON c.user_id = u.id
      ORDER BY created_at DESC LIMIT 50
    `);
    res.json(activity.rows);
  } catch (error) {
    res.status(500).json({ error: 'Activity fetch failed' });
  }
});

export default router;
