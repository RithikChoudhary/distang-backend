import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Couple } from '../models/Couple.model';
import { Memory } from '../models/Memory.model';
import { Message } from '../models/Message.model';
import { config } from '../config/env';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Admin credentials (in production, store in database)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@codex-couples.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Admin Login
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    const token = jwt.sign(
      { isAdmin: true, email },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * Get Dashboard Stats
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalCouples,
      totalMemories,
      totalMessages,
      newUsersToday,
      newCouplesToday,
    ] = await Promise.all([
      User.countDocuments(),
      Couple.countDocuments(),
      Memory.countDocuments(),
      Message.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Couple.countDocuments({ createdAt: { $gte: today } }),
    ]);

    // Active users (logged in within 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: oneDayAgo },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCouples,
        totalMemories,
        totalMessages,
        activeUsers,
        newUsersToday,
        newCouplesToday,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
    });
  }
};

/**
 * Get Users List
 */
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { uniqueId: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
    });
  }
};

/**
 * Get Single User
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
    });
  }
};

/**
 * Delete User
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Remove from couple if paired
    if (user.coupleId) {
      const couple = await Couple.findById(user.coupleId);
      if (couple) {
        // Find partner and remove coupleId
        const partnerId = couple.partner1?.toString() === user._id.toString()
          ? couple.partner2
          : couple.partner1;
        if (partnerId) {
          await User.findByIdAndUpdate(partnerId, { $unset: { coupleId: 1 } });
        }
        await Couple.findByIdAndDelete(user.coupleId);
      }
    }

    // Delete user's memories
    await Memory.deleteMany({ uploadedBy: user._id });

    // Delete user's messages
    await Message.deleteMany({ senderId: user._id });

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
};

/**
 * Get Couples List
 */
export const getCouples = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [couples, total] = await Promise.all([
      Couple.find()
        .populate('user1', 'name email uniqueId profilePhoto')
        .populate('user2', 'name email uniqueId profilePhoto')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Couple.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        couples,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get couples error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get couples',
    });
  }
};

/**
 * Delete Couple (Break up)
 */
export const deleteCouple = async (req: Request, res: Response): Promise<void> => {
  try {
    const couple = await Couple.findById(req.params.id);
    
    if (!couple) {
      res.status(404).json({
        success: false,
        message: 'Couple not found',
      });
      return;
    }

    // Remove coupleId from both users
    await User.updateMany(
      { _id: { $in: [couple.partner1, couple.partner2] } },
      { $unset: { coupleId: 1 } }
    );

    await Couple.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Couple broken up successfully',
    });
  } catch (error) {
    console.error('Delete couple error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete couple',
    });
  }
};

/**
 * Get Memories List
 */
export const getMemories = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 24;
    const coupleId = req.query.coupleId as string;

    const query: any = {};
    if (coupleId) {
      query.coupleId = coupleId;
    }

    const [memories, total] = await Promise.all([
      Memory.find(query)
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Memory.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        memories,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get memories',
    });
  }
};

/**
 * Delete Memory
 */
export const deleteMemory = async (req: Request, res: Response): Promise<void> => {
  try {
    const memory = await Memory.findByIdAndDelete(req.params.id);
    
    if (!memory) {
      res.status(404).json({
        success: false,
        message: 'Memory not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Memory deleted successfully',
    });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete memory',
    });
  }
};

/**
 * Get Messages List
 */
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const coupleId = req.query.coupleId as string;

    const query: any = {};
    if (coupleId) {
      query.coupleId = coupleId;
    }

    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('senderId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Message.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
    });
  }
};

/**
 * Delete Message
 */
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    
    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
    });
  }
};

