import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Buzz } from '../models/Buzz.model';
import { VoiceMessage } from '../models/VoiceMessage.model';
import { Couple } from '../models/Couple.model';
import { uploadAudio } from '../services/cloudinary.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Send a buzz (vibration) to partner
 */
export const sendBuzz = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { type = 'single' } = req.body;

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!user.coupleId) {
      res.status(400).json({ success: false, message: 'You must be in a relationship.' });
      return;
    }

    const couple = await Couple.findById(user.coupleId);
    if (!couple) {
      res.status(404).json({ success: false, message: 'Couple not found.' });
      return;
    }

    const partnerId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;

    const buzz = new Buzz({
      coupleId: couple._id,
      sender: user._id,
      recipient: partnerId,
      type,
    });

    await buzz.save();

    res.status(201).json({
      success: true,
      message: 'Buzz sent! 💕',
      data: { buzz },
    });
  } catch (error) {
    console.error('Send buzz error:', error);
    res.status(500).json({ success: false, message: 'Failed to send buzz.' });
  }
};

/**
 * Get pending buzzes for current user
 */
export const getPendingBuzzes = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const buzzes = await Buzz.find({
      recipient: user._id,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'uniqueId name');

    // Mark all as read
    if (buzzes.length > 0) {
      await Buzz.updateMany(
        { recipient: user._id, isRead: false },
        { isRead: true }
      );
    }

    res.status(200).json({
      success: true,
      data: { 
        buzzes,
        count: buzzes.length,
      },
    });
  } catch (error) {
    console.error('Get pending buzzes error:', error);
    res.status(500).json({ success: false, message: 'Failed to get buzzes.' });
  }
};

/**
 * Upload voice message (uploads to Cloudinary)
 */
export const sendVoiceMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const file = req.file;
    const { duration } = req.body;

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!user.coupleId) {
      res.status(400).json({ success: false, message: 'You must be in a relationship.' });
      return;
    }

    if (!file) {
      res.status(400).json({ success: false, message: 'No audio file provided.' });
      return;
    }

    const couple = await Couple.findById(user.coupleId);
    if (!couple) {
      res.status(404).json({ success: false, message: 'Couple not found.' });
      return;
    }

    // Upload to Cloudinary
    const messageId = uuidv4();
    const result = await uploadAudio(
      file.buffer,
      'walkie',
      undefined,
      couple._id.toString(),
      messageId
    );
    
    if (!result) {
      res.status(500).json({
        success: false,
        message: 'Failed to upload audio to cloud storage.',
      });
      return;
    }

    const partnerId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;

    const voiceMessage = new VoiceMessage({
      coupleId: couple._id,
      sender: user._id,
      recipient: partnerId,
      audioPath: result.url,
      cloudinaryPublicId: result.publicId,
      duration: parseFloat(duration) || 0,
    });

    await voiceMessage.save();

    const populated = await VoiceMessage.findById(voiceMessage._id)
      .populate('sender', 'uniqueId name');

    res.status(201).json({
      success: true,
      message: 'Voice message sent! 🎤',
      data: { voiceMessage: populated },
    });
  } catch (error) {
    console.error('Send voice message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send voice message.' });
  }
};

/**
 * Get pending voice messages
 */
export const getPendingVoiceMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const messages = await VoiceMessage.find({
      recipient: user._id,
      isListened: false,
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'uniqueId name');

    res.status(200).json({
      success: true,
      data: { 
        messages,
        count: messages.length,
      },
    });
  } catch (error) {
    console.error('Get pending voice messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to get voice messages.' });
  }
};

/**
 * Mark voice message as listened
 */
export const markVoiceMessageListened = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { messageId } = req.params;

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const message = await VoiceMessage.findById(messageId);

    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found.' });
      return;
    }

    if (message.recipient.toString() !== user._id.toString()) {
      res.status(403).json({ success: false, message: 'Not authorized.' });
      return;
    }

    message.isListened = true;
    message.listenedAt = new Date();
    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message marked as listened.',
    });
  } catch (error) {
    console.error('Mark voice message listened error:', error);
    res.status(500).json({ success: false, message: 'Failed to update message.' });
  }
};

/**
 * Get walkie-talkie status (pending buzzes + voice messages)
 */
export const getWalkieStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const [pendingBuzzes, pendingVoice] = await Promise.all([
      Buzz.countDocuments({ recipient: user._id, isRead: false }),
      VoiceMessage.countDocuments({ recipient: user._id, isListened: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        pendingBuzzes,
        pendingVoice,
        hasNotifications: pendingBuzzes > 0 || pendingVoice > 0,
      },
    });
  } catch (error) {
    console.error('Get walkie status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get status.' });
  }
};

