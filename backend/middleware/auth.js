import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// In-memory cache for auth lookups (TTL: 2 minutes)
const userCache = new Map();
const CACHE_TTL = 2 * 60 * 1000;

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Check cache first
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      req.user = cached.user;
      return next();
    }

    const user = await User.findById(userId).select('_id fullName username email profilePhoto coverPhoto followers following friends savedPosts bio');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Cache the user
    userCache.set(userId, { user, ts: Date.now() });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Clear a specific user from cache (call after profile updates)
export const clearUserCache = (userId) => {
  userCache.delete(userId?.toString());
};

export default auth;
