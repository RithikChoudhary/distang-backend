import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Message, MessageType } from '../models/Message.model';
import { Couple } from '../models/Couple.model';
import { uploadImage, uploadAudio } from '../services/cloudinary.service';
import { v4 as uuidv4 } from 'uuid';

// Alias for backward compatibility
type AuthRequest = AuthenticatedRequest;

/**
 * Send a message to partner
 * Requires being in a couple relationship
 */
export const sendMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { message, messageType = MessageType.TEXT } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    // Check if user is in a couple
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be in a relationship to send messages.',
      });
      return;
    }
    
    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Message cannot be empty.',
      });
      return;
    }
    
    if (message.length > 5000) {
      res.status(400).json({
        success: false,
        message: 'Message is too long (max 5000 characters).',
      });
      return;
    }
    
    // Get couple info
    const couple = await Couple.findById(user.coupleId);
    
    if (!couple) {
      res.status(404).json({
        success: false,
        message: 'Couple not found.',
      });
      return;
    }
    
    // Determine receiver
    const receiverId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;
    
    // Create message
    const newMessage = new Message({
      coupleId: couple._id,
      senderId: user._id,
      receiverId,
      message: message.trim(),
      messageType,
      isRead: false,
    });
    
    await newMessage.save();
    
    // Populate sender info for response
    await newMessage.populate('senderId', 'uniqueId name');
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      data: {
        message: {
          id: newMessage._id,
          senderId: newMessage.senderId,
          message: newMessage.message,
          messageType: newMessage.messageType,
          isRead: newMessage.isRead,
          createdAt: newMessage.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending message.',
    });
  }
};

/**
 * Send an image message to partner (uploads to Cloudinary)
 */
export const sendImageMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be in a relationship to send messages.',
      });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image provided.',
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    if (!couple) {
      res.status(404).json({
        success: false,
        message: 'Couple not found.',
      });
      return;
    }
    
    // Upload to Cloudinary
    const messageId = uuidv4();
    const result = await uploadImage(
      req.file.buffer,
      'chat-image',
      undefined,
      couple._id.toString(),
      messageId
    );
    
    if (!result) {
      res.status(500).json({
        success: false,
        message: 'Failed to upload image to cloud storage.',
      });
      return;
    }
    
    const receiverId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;
    
    const newMessage = new Message({
      coupleId: couple._id,
      senderId: user._id,
      receiverId,
      message: result.url,
      messageType: MessageType.IMAGE,
      isRead: false,
    });
    
    await newMessage.save();
    await newMessage.populate('senderId', 'uniqueId name');
    
    res.status(201).json({
      success: true,
      message: 'Image sent successfully.',
      data: {
        message: {
          id: newMessage._id,
          senderId: newMessage.senderId,
          message: newMessage.message,
          messageType: newMessage.messageType,
          isRead: newMessage.isRead,
          createdAt: newMessage.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Send image error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending image.',
    });
  }
};

/**
 * Send a voice message to partner (uploads to Cloudinary)
 */
export const sendVoiceMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { duration } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be in a relationship to send messages.',
      });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No audio provided.',
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    if (!couple) {
      res.status(404).json({
        success: false,
        message: 'Couple not found.',
      });
      return;
    }
    
    // Upload to Cloudinary
    const messageId = uuidv4();
    const result = await uploadAudio(
      req.file.buffer,
      'chat-voice',
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
    
    const receiverId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;
    
    const durationNum = parseInt(duration) || 0;
    
    const newMessage = new Message({
      coupleId: couple._id,
      senderId: user._id,
      receiverId,
      message: JSON.stringify({ path: result.url, duration: durationNum }),
      messageType: MessageType.VOICE,
      isRead: false,
    });
    
    await newMessage.save();
    await newMessage.populate('senderId', 'uniqueId name');
    
    res.status(201).json({
      success: true,
      message: 'Voice message sent successfully.',
      data: {
        message: {
          id: newMessage._id,
          senderId: newMessage.senderId,
          message: newMessage.message,
          messageType: newMessage.messageType,
          isRead: newMessage.isRead,
          createdAt: newMessage.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Send voice error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending voice message.',
    });
  }
};

/**
 * Get chat messages
 * Returns paginated messages for the couple
 */
export const getMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be in a relationship to view messages.',
      });
      return;
    }
    
    // Get messages, excluding those deleted by this user
    const [messages, total, unreadCount] = await Promise.all([
      Message.find({
        coupleId: user.coupleId,
        deletedBy: { $ne: user._id },
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'uniqueId name'),
      
      Message.countDocuments({
        coupleId: user.coupleId,
        deletedBy: { $ne: user._id },
      }),
      
      Message.countDocuments({
        coupleId: user.coupleId,
        receiverId: user._id,
        isRead: false,
        deletedBy: { $ne: user._id },
      }),
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          id: msg._id,
          senderId: msg.senderId,
          message: msg.message,
          messageType: msg.messageType,
          isRead: msg.isRead,
          readAt: msg.readAt,
          createdAt: msg.createdAt,
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalMessages: total,
          hasMore: skip + messages.length < total,
        },
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching messages.',
    });
  }
};

/**
 * Mark messages as read
 * Marks all unread messages from partner as read
 */
export const markAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be in a relationship.',
      });
      return;
    }
    
    // Mark all unread messages from partner as read
    const result = await Message.updateMany(
      {
        coupleId: user.coupleId,
        receiverId: user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Messages marked as read.',
      data: {
        markedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while marking messages as read.',
    });
  }
};

/**
 * Delete a message (soft delete for the user)
 * Message is only hidden for this user, not actually deleted
 */
export const deleteMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { messageId } = req.params;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
      return;
    }
    
    // Check if message belongs to user's couple
    if (message.coupleId.toString() !== user.coupleId?.toString()) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this message.',
      });
      return;
    }
    
    // Add user to deletedBy array (soft delete)
    if (!message.deletedBy) {
      message.deletedBy = [];
    }
    
    if (!message.deletedBy.includes(user._id)) {
      message.deletedBy.push(user._id);
      await message.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Message deleted successfully.',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting message.',
    });
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(200).json({
        success: true,
        data: { unreadCount: 0 },
      });
      return;
    }
    
    const unreadCount = await Message.countDocuments({
      coupleId: user.coupleId,
      receiverId: user._id,
      isRead: false,
      deletedBy: { $ne: user._id },
    });
    
    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching unread count.',
    });
  }
};

