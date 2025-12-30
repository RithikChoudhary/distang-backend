import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import {
  adminLogin,
  getStats,
  getAnalytics,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getCouples,
  getCouple,
  deleteCouple,
  getMemories,
  deleteMemory,
  getMessages,
  deleteMessage,
  getSystemHealth,
  getActivityFeed,
  exportData,
} from '../controllers/admin.controller';

const router = Router();

/**
 * Admin Authentication Middleware
 */
const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Admin authentication required',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as { isAdmin: boolean };

    if (!decoded.isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token',
    });
  }
};

// Public routes
router.post('/login', adminLogin);

// Protected admin routes
router.use(adminAuth);

// Dashboard & Analytics
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);
router.get('/activity', getActivityFeed);
router.get('/health', getSystemHealth);
router.get('/export', exportData);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Couples
router.get('/couples', getCouples);
router.get('/couples/:id', getCouple);
router.delete('/couples/:id', deleteCouple);

// Memories
router.get('/memories', getMemories);
router.delete('/memories/:id', deleteMemory);

// Messages
router.get('/messages', getMessages);
router.delete('/messages/:id', deleteMessage);

export default router;
