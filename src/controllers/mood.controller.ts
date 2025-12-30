import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Mood, MoodType, moodEmojis } from '../models/Mood.model';
import { User } from '../models/User.model';

/**
 * Set current mood
 * POST /mood
 */
export const setMood = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be connected with a partner',
      });
      return;
    }
    
    const { mood, message } = req.body;
    
    if (!mood || !Object.values(MoodType).includes(mood)) {
      res.status(400).json({
        success: false,
        message: 'Invalid mood type',
      });
      return;
    }
    
    const newMood = new Mood({
      coupleId: user.coupleId,
      uniqueId: user.uniqueId,
      name: user.name,
      mood,
      message: message?.slice(0, 100),
    });
    
    await newMood.save();
    
    res.status(201).json({
      success: true,
      message: 'Mood shared with partner!',
      data: {
        mood: {
          id: newMood._id,
          mood: newMood.mood,
          emoji: moodEmojis[mood as MoodType],
          message: newMood.message,
          createdAt: newMood.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Set mood error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set mood',
    });
  }
};

/**
 * Get partner's current mood
 * GET /mood/partner
 */
export const getPartnerMood = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.coupleId) {
      res.json({
        success: true,
        data: { mood: null },
      });
      return;
    }
    
    // Get partner's most recent mood
    const partnerMood = await Mood.findOne({
      coupleId: user.coupleId,
      uniqueId: { $ne: user.uniqueId },
    }).sort({ createdAt: -1 });
    
    if (!partnerMood) {
      res.json({
        success: true,
        data: { mood: null },
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        mood: {
          id: partnerMood._id,
          name: partnerMood.name,
          mood: partnerMood.mood,
          emoji: moodEmojis[partnerMood.mood as MoodType],
          message: partnerMood.message,
          createdAt: partnerMood.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get partner mood error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get partner mood',
    });
  }
};

/**
 * Get my current mood
 * GET /mood/me
 */
export const getMyMood = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.coupleId) {
      res.json({
        success: true,
        data: { mood: null },
      });
      return;
    }
    
    const myMood = await Mood.findOne({
      coupleId: user.coupleId,
      uniqueId: user.uniqueId,
    }).sort({ createdAt: -1 });
    
    if (!myMood) {
      res.json({
        success: true,
        data: { mood: null },
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        mood: {
          id: myMood._id,
          mood: myMood.mood,
          emoji: moodEmojis[myMood.mood as MoodType],
          message: myMood.message,
          createdAt: myMood.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get my mood error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mood',
    });
  }
};

/**
 * Get mood history for the couple
 * GET /mood/history
 */
export const getMoodHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.coupleId) {
      res.json({
        success: true,
        data: { moods: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } },
      });
      return;
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const moods = await Mood.find({
      coupleId: user.coupleId,
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const total = await Mood.countDocuments({
      coupleId: user.coupleId,
    });
    
    res.json({
      success: true,
      data: {
        moods: moods.map(m => ({
          id: m._id,
          uniqueId: m.uniqueId,
          name: m.name,
          mood: m.mood,
          emoji: moodEmojis[m.mood as MoodType],
          message: m.message,
          createdAt: m.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get mood history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mood history',
    });
  }
};

/**
 * Get all mood types
 * GET /mood/types
 */
export const getMoodTypes = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const types = Object.values(MoodType).map(mood => ({
      value: mood,
      label: mood.charAt(0).toUpperCase() + mood.slice(1),
      emoji: moodEmojis[mood],
    }));
    
    res.json({
      success: true,
      data: { types },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get mood types',
    });
  }
};

