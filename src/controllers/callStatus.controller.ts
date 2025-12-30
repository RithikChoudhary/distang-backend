import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { CallStatus, CallState } from '../models/CallStatus.model';
import { User } from '../models/User.model';

/**
 * Update my call status
 * POST /call-status
 */
export const updateCallStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { state, platform } = req.body;

    // Validate state
    if (!Object.values(CallState).includes(state)) {
      res.status(400).json({
        success: false,
        message: 'Invalid call state',
      });
      return;
    }

    // Get user's couple ID
    const user = await User.findById(userId);
    if (!user || !user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be in a relationship to share call status',
      });
      return;
    }

    // Upsert call status
    const callStatus = await CallStatus.findOneAndUpdate(
      { userId },
      {
        userId,
        coupleId: user.coupleId,
        state,
        platform: platform || 'android',
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      data: {
        state: callStatus.state,
        updatedAt: callStatus.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating call status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update call status',
    });
  }
};

/**
 * Get my call status
 * GET /call-status/me
 */
export const getMyCallStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    const callStatus = await CallStatus.findOne({ userId });

    res.status(200).json({
      success: true,
      data: callStatus
        ? {
            state: callStatus.state,
            platform: callStatus.platform,
            updatedAt: callStatus.updatedAt,
          }
        : {
            state: CallState.IDLE,
            platform: null,
            updatedAt: null,
          },
    });
  } catch (error) {
    console.error('Error getting call status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get call status',
    });
  }
};

/**
 * Get partner's call status
 * GET /call-status/partner
 */
export const getPartnerCallStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    // Get user's couple ID
    const user = await User.findById(userId);
    if (!user || !user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be in a relationship to view partner status',
      });
      return;
    }

    // Find partner's call status
    const partnerStatus = await CallStatus.findOne({
      coupleId: user.coupleId,
      userId: { $ne: userId },
    }).populate('userId', 'name');

    if (!partnerStatus) {
      res.status(200).json({
        success: true,
        data: {
          state: CallState.IDLE,
          platform: null,
          updatedAt: null,
          isStale: true,
        },
      });
      return;
    }

    // Check if status is stale (older than 5 minutes for iOS, 30 seconds for Android)
    const now = new Date();
    const lastUpdate = new Date(partnerStatus.updatedAt);
    const diffSeconds = (now.getTime() - lastUpdate.getTime()) / 1000;
    
    const staleThreshold = partnerStatus.platform === 'ios' ? 300 : 30; // 5 min for iOS, 30 sec for Android
    const isStale = diffSeconds > staleThreshold;

    // If stale and was on call, assume disconnected
    const effectiveState = isStale && partnerStatus.state !== CallState.IDLE 
      ? CallState.IDLE 
      : partnerStatus.state;

    res.status(200).json({
      success: true,
      data: {
        state: effectiveState,
        platform: partnerStatus.platform,
        updatedAt: partnerStatus.updatedAt,
        isStale,
        secondsAgo: Math.round(diffSeconds),
      },
    });
  } catch (error) {
    console.error('Error getting partner call status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get partner call status',
    });
  }
};

/**
 * Clear my call status (set to idle)
 * DELETE /call-status
 */
export const clearCallStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    await CallStatus.findOneAndUpdate(
      { userId },
      { state: CallState.IDLE },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Call status cleared',
    });
  } catch (error) {
    console.error('Error clearing call status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear call status',
    });
  }
};

