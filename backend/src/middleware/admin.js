import { createClerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';
dotenv.config();

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const adminOnly = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress;

    // Hardcoded admin check as requested
    if (email !== 'imthiranu@gmail.com') {
      return res.status(403).json({ error: 'Forbidden: Admin access only' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Platform security check failed' });
  }
};
