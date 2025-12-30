import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Couple } from '../models/Couple.model';
import { Memory } from '../models/Memory.model';
import { Message } from '../models/Message.model';
import { Mood } from '../models/Mood.model';
import { config } from '../config/env';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getRequestLogs, getRequestStats } from '../middlewares/security.middleware';

// Admin credentials (in production, store in database with hashed password)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@distang.com';
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
      data: { 
        token,
        admin: {
          email,
          name: 'Admin',
          role: 'super_admin'
        }
      },
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
 * Get Dashboard Stats - Comprehensive metrics
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [
      totalUsers,
      totalCouples,
      totalMemories,
      totalMessages,
      newUsersToday,
      newUsersYesterday,
      newUsersWeek,
      newUsersMonth,
      newCouplesToday,
      activeUsers24h,
      activeUsers1h,
      verifiedUsers,
      messagesWeek,
      memoriesWeek,
    ] = await Promise.all([
      User.countDocuments(),
      Couple.countDocuments(), // Count all couples regardless of status
      Memory.countDocuments(),
      Message.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
      User.countDocuments({ createdAt: { $gte: lastWeek } }),
      User.countDocuments({ createdAt: { $gte: lastMonth } }),
      Couple.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ lastActive: { $gte: oneDayAgo } }),
      User.countDocuments({ lastActive: { $gte: oneHourAgo } }),
      User.countDocuments({ isVerified: true }),
      Message.countDocuments({ createdAt: { $gte: lastWeek } }),
      Memory.countDocuments({ createdAt: { $gte: lastWeek } }),
    ]);

    // Calculate growth rates
    const userGrowthRate = newUsersYesterday > 0 
      ? ((newUsersToday - newUsersYesterday) / newUsersYesterday * 100).toFixed(1)
      : newUsersToday > 0 ? '100' : '0';

    // Get message types distribution
    const messageTypes = await Message.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get top active couples (by message count this week)
    const topActiveCouples = await Message.aggregate([
      { $match: { createdAt: { $gte: lastWeek } } },
      { $group: { _id: '$coupleId', messageCount: { $sum: 1 } } },
      { $sort: { messageCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'couples',
          localField: '_id',
          foreignField: '_id',
          as: 'couple'
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalCouples,
          totalMemories,
          totalMessages,
          verifiedUsers,
          verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : '0',
        },
        activity: {
          activeUsers24h,
          activeUsers1h,
          messagesWeek,
          memoriesWeek,
          avgMessagesPerDay: Math.round(messagesWeek / 7),
        },
        growth: {
          newUsersToday,
          newUsersYesterday,
          newUsersWeek,
          newUsersMonth,
          newCouplesToday,
          userGrowthRate: `${userGrowthRate}%`,
        },
        messageTypes: messageTypes.reduce((acc, t) => {
          acc[t._id || 'text'] = t.count;
          return acc;
        }, {} as Record<string, number>),
        topActiveCouples,
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
 * Get Analytics - Time series data for charts
 */
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // User signups per day
    const userSignups = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Couples formed per day
    const couplesFormed = await Couple.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Messages per day
    const messagesPerDay = await Message.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Memories per day
    const memoriesPerDay = await Memory.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Active users per day (users who sent messages)
    const activeUsersPerDay = await Message.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            user: '$senderId'
          }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // User retention (users who were active this week vs last week)
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);

    const [thisWeekActive, lastWeekActive] = await Promise.all([
      User.countDocuments({ lastActive: { $gte: thisWeekStart } }),
      User.countDocuments({ lastActive: { $gte: lastWeekStart, $lt: thisWeekStart } }),
    ]);

    const retentionRate = lastWeekActive > 0 
      ? ((thisWeekActive / lastWeekActive) * 100).toFixed(1)
      : '0';

    res.json({
      success: true,
      data: {
        userSignups,
        couplesFormed,
        messagesPerDay,
        memoriesPerDay,
        activeUsersPerDay,
        retention: {
          thisWeekActive,
          lastWeekActive,
          retentionRate: `${retentionRate}%`,
        },
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
    });
  }
};

/**
 * Get Users List with advanced filtering
 */
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const status = req.query.status as string; // 'active', 'inactive', 'banned', 'paired', 'single'
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { uniqueId: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'active') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      query.lastActive = { $gte: oneDayAgo };
    } else if (status === 'inactive') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query.lastActive = { $lt: oneWeekAgo };
    } else if (status === 'banned') {
      query.isBanned = true;
    } else if (status === 'paired') {
      query.coupleId = { $exists: true, $ne: null };
    } else if (status === 'single') {
      query.$or = [
        { coupleId: { $exists: false } },
        { coupleId: null }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Get message counts for each user
    const userIds = users.map(u => u._id);
    const messageCounts = await Message.aggregate([
      { $match: { senderId: { $in: userIds } } },
      { $group: { _id: '$senderId', count: { $sum: 1 } } }
    ]);
    const messageCountMap = messageCounts.reduce((acc, m) => {
      acc[m._id.toString()] = m.count;
      return acc;
    }, {} as Record<string, number>);

    const enrichedUsers = users.map(user => ({
      ...user,
      messageCount: messageCountMap[user._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: {
        users: enrichedUsers,
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
 * Get Single User with full details
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .lean();
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Get user's couple info
    let couple = null;
    let partner = null;
    if (user.coupleId) {
      couple = await Couple.findById(user.coupleId).lean();
      if (couple) {
        const partnerId = couple.partner1?.toString() === user._id.toString()
          ? couple.partner2
          : couple.partner1;
        partner = await User.findById(partnerId).select('name email uniqueId profilePhoto').lean();
      }
    }

    // Get user's activity stats
    const [messageCount, memoryCount, lastMood] = await Promise.all([
      Message.countDocuments({ senderId: user._id }),
      Memory.countDocuments({ uploadedBy: user._id }),
      Mood.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean(),
    ]);

    // Get recent messages
    const recentMessages = await Message.find({ senderId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        user,
        couple,
        partner,
        stats: {
          messageCount,
          memoryCount,
          lastMood,
        },
        recentMessages,
      },
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
 * Update User (ban, verify, etc.)
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { isBanned, isVerified, note } = req.body;
    
    const updateData: any = {};
    if (typeof isBanned === 'boolean') updateData.isBanned = isBanned;
    if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;
    if (note) updateData.adminNote = note;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

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
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
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
        const partnerId = couple.partner1?.toString() === user._id.toString()
          ? couple.partner2
          : couple.partner1;
        if (partnerId) {
          await User.findByIdAndUpdate(partnerId, { $unset: { coupleId: 1 } });
        }
        await Couple.findByIdAndDelete(user.coupleId);
      }
    }

    // Delete user's data
    await Promise.all([
      Memory.deleteMany({ uploadedBy: user._id }),
      Message.deleteMany({ senderId: user._id }),
      Mood.deleteMany({ userId: user._id }),
      User.findByIdAndDelete(req.params.id),
    ]);

    res.json({
      success: true,
      message: 'User and all associated data deleted successfully',
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
 * Get Couples List with details
 */
export const getCouples = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string; // 'active', 'inactive'
    const search = req.query.search as string || '';

    const query: any = {};
    if (status) {
      query.status = status;
    }

    let couples = await Couple.find(query)
      .populate('partner1', 'name email uniqueId profilePhoto lastActive')
      .populate('partner2', 'name email uniqueId profilePhoto lastActive')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Filter by search if provided
    if (search) {
      couples = couples.filter(c => {
        const p1 = c.partner1 as any;
        const p2 = c.partner2 as any;
        return (
          p1?.name?.toLowerCase().includes(search.toLowerCase()) ||
          p2?.name?.toLowerCase().includes(search.toLowerCase()) ||
          p1?.email?.toLowerCase().includes(search.toLowerCase()) ||
          p2?.email?.toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    // Get message counts for each couple
    const coupleIds = couples.map(c => c._id);
    const messageCounts = await Message.aggregate([
      { $match: { coupleId: { $in: coupleIds } } },
      { $group: { _id: '$coupleId', count: { $sum: 1 } } }
    ]);
    const messageCountMap = messageCounts.reduce((acc, m) => {
      acc[m._id.toString()] = m.count;
      return acc;
    }, {} as Record<string, number>);

    // Get memory counts
    const memoryCounts = await Memory.aggregate([
      { $match: { coupleId: { $in: coupleIds } } },
      { $group: { _id: '$coupleId', count: { $sum: 1 } } }
    ]);
    const memoryCountMap = memoryCounts.reduce((acc, m) => {
      acc[m._id.toString()] = m.count;
      return acc;
    }, {} as Record<string, number>);

    const enrichedCouples = couples.map(couple => ({
      ...couple,
      messageCount: messageCountMap[couple._id.toString()] || 0,
      memoryCount: memoryCountMap[couple._id.toString()] || 0,
    }));

    const total = await Couple.countDocuments(query);

    res.json({
      success: true,
      data: {
        couples: enrichedCouples,
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
 * Get Single Couple with full details
 */
export const getCouple = async (req: Request, res: Response): Promise<void> => {
  try {
    const couple = await Couple.findById(req.params.id)
      .populate('partner1', '-password')
      .populate('partner2', '-password')
      .lean();

    if (!couple) {
      res.status(404).json({
        success: false,
        message: 'Couple not found',
      });
      return;
    }

    // Get couple stats
    const [messageCount, memoryCount, recentMessages] = await Promise.all([
      Message.countDocuments({ coupleId: couple._id }),
      Memory.countDocuments({ coupleId: couple._id }),
      Message.find({ coupleId: couple._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('senderId', 'name')
        .lean(),
    ]);

    // Get message activity by day
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const messageActivity = await Message.aggregate([
      { $match: { coupleId: couple._id, createdAt: { $gte: lastWeek } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        couple,
        stats: {
          messageCount,
          memoryCount,
          daysActive: Math.floor((Date.now() - new Date(couple.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
        },
        recentMessages,
        messageActivity,
      },
    });
  } catch (error) {
    console.error('Get couple error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get couple',
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
    const type = req.query.type as string;

    const query: any = {};
    if (coupleId) query.coupleId = coupleId;
    if (type) query.type = type;

    const [memories, total] = await Promise.all([
      Memory.find(query)
        .populate('uploadedBy', 'name email profilePhoto')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
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
    const type = req.query.type as string;
    const search = req.query.search as string;

    const query: any = {};
    if (coupleId) query.coupleId = coupleId;
    if (type) query.messageType = type;
    if (search) {
      query.message = { $regex: search, $options: 'i' };
    }

    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('senderId', 'name email profilePhoto')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
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

/**
 * Get System Health
 */
export const getSystemHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get database stats
    const dbStats = await mongoose.connection.db?.stats();
    
    // Get collection sizes
    const [userCount, coupleCount, messageCount, memoryCount] = await Promise.all([
      User.estimatedDocumentCount(),
      Couple.estimatedDocumentCount(),
      Message.estimatedDocumentCount(),
      Memory.estimatedDocumentCount(),
    ]);

    res.json({
      success: true,
      data: {
        server: {
          status: 'healthy',
          uptime: process.uptime(),
          nodeVersion: process.version,
          environment: config.nodeEnv,
          memoryUsage: process.memoryUsage(),
        },
        database: {
          status: dbStatus,
          name: mongoose.connection.name,
          host: mongoose.connection.host,
          collections: {
            users: userCount,
            couples: coupleCount,
            messages: messageCount,
            memories: memoryCount,
          },
          size: dbStats?.dataSize || 0,
          storageSize: dbStats?.storageSize || 0,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health',
    });
  }
};

/**
 * Get Activity Feed - Recent actions across the platform
 */
export const getActivityFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    // Get recent activities
    const [recentUsers, recentCouples, recentMessages, recentMemories] = await Promise.all([
      User.find()
        .select('name email uniqueId createdAt profilePhoto')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Couple.find()
        .populate('partner1', 'name')
        .populate('partner2', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Message.find()
        .populate('senderId', 'name')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Memory.find()
        .populate('uploadedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // Combine and sort activities
    const activities: any[] = [];

    recentUsers.forEach(user => {
      activities.push({
        type: 'user_signup',
        icon: '👤',
        message: `${user.name} joined Distang`,
        timestamp: user.createdAt,
        data: { userId: user._id, name: user.name },
      });
    });

    recentCouples.forEach(couple => {
      const p1 = couple.partner1 as any;
      const p2 = couple.partner2 as any;
      activities.push({
        type: 'couple_formed',
        icon: '💑',
        message: `${p1?.name || 'User'} and ${p2?.name || 'User'} became a couple`,
        timestamp: couple.createdAt,
        data: { coupleId: couple._id },
      });
    });

    recentMessages.slice(0, 10).forEach(msg => {
      const sender = msg.senderId as any;
      const msgType = (msg as any).messageType || 'text';
      activities.push({
        type: 'message_sent',
        icon: msgType === 'image' ? '📷' : msgType === 'voice' ? '🎤' : '💬',
        message: `${sender?.name || 'User'} sent a ${msgType} message`,
        timestamp: msg.createdAt,
        data: { messageId: msg._id },
      });
    });

    recentMemories.forEach(memory => {
      const uploader = memory.uploadedBy as any;
      activities.push({
        type: 'memory_created',
        icon: '📸',
        message: `${uploader?.name || 'User'} shared a memory`,
        timestamp: memory.createdAt,
        data: { memoryId: memory._id },
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: activities.slice(0, limit),
    });
  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity feed',
    });
  }
};

/**
 * Export Data (for compliance/backup)
 */
export const exportData = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string || 'users';
    
    let data: any;
    
    switch (type) {
      case 'users':
        data = await User.find().select('-password').lean();
        break;
      case 'couples':
        data = await Couple.find()
          .populate('partner1', 'name email uniqueId')
          .populate('partner2', 'name email uniqueId')
          .lean();
        break;
      case 'messages':
        data = await Message.find()
          .populate('senderId', 'name email')
          .lean();
        break;
      case 'memories':
        data = await Memory.find()
          .populate('uploadedBy', 'name email')
          .lean();
        break;
      default:
        res.status(400).json({
          success: false,
          message: 'Invalid export type',
        });
        return;
    }

    res.json({
      success: true,
      data: {
        type,
        count: data.length,
        exportedAt: new Date().toISOString(),
        data,
      },
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
    });
  }
};

/**
 * Get API Request Logs
 */
export const getApiLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = getRequestLogs(limit);
    const stats = getRequestStats();

    res.json({
      success: true,
      data: {
        logs,
        stats,
      },
    });
  } catch (error) {
    console.error('Get API logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API logs',
    });
  }
};
