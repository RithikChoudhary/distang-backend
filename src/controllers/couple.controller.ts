import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { User, RelationshipStatus } from '../models/User.model';
import { Couple, CoupleStatus } from '../models/Couple.model';
import { Consent, ConsentType } from '../models/Consent.model';
import { Memory, MemoryStatus } from '../models/Memory.model';
import { Review } from '../models/Review.model';
import { generateCertificatePDF } from '../utils/pdfGenerator';

/**
 * Send a pair request to another user
 */
export const sendPairRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { partnerUniqueId } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    // Check if user is already in a relationship
    if (user.relationshipStatus === RelationshipStatus.PAIRED) {
      res.status(400).json({
        success: false,
        message: 'You are already in a relationship.',
      });
      return;
    }
    
    // Check for pending requests from this user
    const existingRequest = await Couple.findOne({
      'pairRequest.fromUserId': user._id,
      'pairRequest.status': 'pending',
    });
    
    if (existingRequest) {
      res.status(400).json({
        success: false,
        message: 'You already have a pending pair request.',
      });
      return;
    }
    
    // Find partner by unique ID
    const partner = await User.findOne({
      uniqueId: partnerUniqueId.toUpperCase(),
    });
    
    if (!partner) {
      res.status(404).json({
        success: false,
        message: 'Partner not found with this unique ID.',
      });
      return;
    }
    
    // Can't pair with yourself
    if (partner._id.toString() === user._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot pair with yourself.',
      });
      return;
    }
    
    // Check if partner is already in a relationship
    if (partner.relationshipStatus === RelationshipStatus.PAIRED) {
      res.status(400).json({
        success: false,
        message: 'This user is already in a relationship.',
      });
      return;
    }
    
    // Check for existing pending request to this partner
    const existingPairToPartner = await Couple.findOne({
      $or: [
        { partner1: user._id, partner2: partner._id },
        { partner1: partner._id, partner2: user._id },
      ],
      'pairRequest.status': 'pending',
    });
    
    if (existingPairToPartner) {
      res.status(400).json({
        success: false,
        message: 'There is already a pending request between you and this user.',
      });
      return;
    }
    
    // Create couple with pending status
    const couple = new Couple({
      partner1: user._id,
      partner2: partner._id,
      status: CoupleStatus.PENDING,
      pairRequest: {
        fromUserId: user._id,
        toUserId: partner._id,
        status: 'pending',
        createdAt: new Date(),
      },
    });
    
    await couple.save();
    
    res.status(201).json({
      success: true,
      message: 'Pair request sent successfully.',
      data: {
        coupleId: couple.coupleId,
        partner: {
          uniqueId: partner.uniqueId,
          name: partner.name,
        },
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Send pair request error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending pair request.',
    });
  }
};

/**
 * Accept a pair request
 */
export const acceptPairRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { coupleId } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    // Find the pending couple request
    const couple = await Couple.findOne({
      coupleId,
      'pairRequest.toUserId': user._id,
      'pairRequest.status': 'pending',
    });
    
    if (!couple) {
      res.status(404).json({
        success: false,
        message: 'Pair request not found or already responded to.',
      });
      return;
    }
    
    // Update couple status
    couple.status = CoupleStatus.ACTIVE;
    couple.pairRequest.status = 'accepted';
    couple.pairRequest.respondedAt = new Date();
    couple.pairingDate = new Date();
    
    await couple.save();
    
    // Update both users
    const partner = await User.findById(couple.pairRequest.fromUserId);
    
    if (partner) {
      partner.relationshipStatus = RelationshipStatus.PAIRED;
      partner.coupleId = couple._id;
      await partner.save();
    }
    
    user.relationshipStatus = RelationshipStatus.PAIRED;
    user.coupleId = couple._id;
    await user.save();
    
    // Create consent record with all features OFF by default
    const consent = new Consent({
      coupleId: couple._id,
      partner1Consent: {
        userId: couple.partner1,
        photoSharing: false,
        memoryAccess: false,
        locationSharing: false,
      },
      partner2Consent: {
        userId: couple.partner2,
        photoSharing: false,
        memoryAccess: false,
        locationSharing: false,
      },
      history: [],
    });
    
    await consent.save();
    
    res.status(200).json({
      success: true,
      message: 'Pair request accepted! You are now connected.',
      data: {
        coupleId: couple.coupleId,
        pairingDate: couple.pairingDate,
        partner: partner ? {
          uniqueId: partner.uniqueId,
          name: partner.name,
          profilePhoto: partner.profilePhoto,
        } : null,
      },
    });
  } catch (error) {
    console.error('Accept pair request error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while accepting pair request.',
    });
  }
};

/**
 * Reject a pair request
 */
export const rejectPairRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { coupleId } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    // Find the pending couple request
    const couple = await Couple.findOne({
      coupleId,
      'pairRequest.toUserId': user._id,
      'pairRequest.status': 'pending',
    });
    
    if (!couple) {
      res.status(404).json({
        success: false,
        message: 'Pair request not found or already responded to.',
      });
      return;
    }
    
    // Update request status
    couple.pairRequest.status = 'rejected';
    couple.pairRequest.respondedAt = new Date();
    couple.status = CoupleStatus.DISSOLVED;
    
    await couple.save();
    
    res.status(200).json({
      success: true,
      message: 'Pair request rejected.',
    });
  } catch (error) {
    console.error('Reject pair request error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while rejecting pair request.',
    });
  }
};

/**
 * Get pending pair requests for the user
 */
export const getPendingRequests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    // Find requests TO this user
    const incomingRequests = await Couple.find({
      'pairRequest.toUserId': user._id,
      'pairRequest.status': 'pending',
    }).populate('partner1', 'uniqueId name profilePhoto');
    
    // Find requests FROM this user
    const outgoingRequests = await Couple.find({
      'pairRequest.fromUserId': user._id,
      'pairRequest.status': 'pending',
    }).populate('partner2', 'uniqueId name profilePhoto');
    
    res.status(200).json({
      success: true,
      data: {
        incoming: incomingRequests.map((c) => ({
          coupleId: c.coupleId,
          from: c.partner1,
          createdAt: c.pairRequest.createdAt,
        })),
        outgoing: outgoingRequests.map((c) => ({
          coupleId: c.coupleId,
          to: c.partner2,
          createdAt: c.pairRequest.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching requests.',
    });
  }
};

/**
 * Initiate breakup
 */
export const breakup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { anonymousReview } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You are not in a relationship.',
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    
    if (!couple || couple.status !== CoupleStatus.ACTIVE) {
      res.status(400).json({
        success: false,
        message: 'No active relationship found.',
      });
      return;
    }
    
    // Archive memories (don't delete)
    await Memory.updateMany(
      { coupleId: couple._id, status: MemoryStatus.ACTIVE },
      { $set: { status: MemoryStatus.ARCHIVED } }
    );
    
    // Dissolve the couple
    couple.status = CoupleStatus.DISSOLVED;
    couple.dissolutionDate = new Date();
    await couple.save();
    
    // Update both partners and save relationship history
    const partnerId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;
    
    const partner = await User.findById(partnerId);
    const breakupDate = new Date();
    
    // Calculate relationship duration
    const startDate = couple.relationshipStartDate || couple.pairingDate || couple.createdAt;
    const durationDays = Math.floor((breakupDate.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    // Save relationship history for both users (PERMANENT, never deleted)
    if (partner) {
      // Add to partner's history
      if (!partner.relationshipHistory) {
        partner.relationshipHistory = [];
      }
      partner.relationshipHistory.push({
        partnerName: user.name,
        partnerUniqueId: user.uniqueId,
        startDate: new Date(startDate),
        endDate: breakupDate,
        durationDays,
        initiatedBreakup: false, // Partner did not initiate
      });
      
      partner.relationshipStatus = RelationshipStatus.SINGLE;
      partner.coupleId = undefined;
      partner.pastRelationshipExists = true;
      await partner.save();
    }
    
    // Add to user's history
    if (!user.relationshipHistory) {
      user.relationshipHistory = [];
    }
    user.relationshipHistory.push({
      partnerName: partner?.name || 'Unknown',
      partnerUniqueId: partner?.uniqueId || 'Unknown',
      startDate: new Date(startDate),
      endDate: breakupDate,
      durationDays,
      initiatedBreakup: true, // This user initiated the breakup
    });
    
    user.relationshipStatus = RelationshipStatus.SINGLE;
    user.coupleId = undefined;
    user.pastRelationshipExists = true;
    await user.save();
    
    // Save anonymous review if provided (max 300 chars)
    if (anonymousReview && anonymousReview.trim().length > 0) {
      const review = new Review({
        coupleId: couple._id,
        reviewText: anonymousReview.trim().slice(0, 300),
      });
      await review.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Relationship has been ended. Memories have been archived.',
    });
  } catch (error) {
    console.error('Breakup error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during breakup process.',
    });
  }
};

/**
 * Get relationship info (including start date and streak)
 */
export const getRelationshipInfo = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You are not in a relationship.',
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    
    if (!couple || couple.status !== CoupleStatus.ACTIVE) {
      res.status(400).json({
        success: false,
        message: 'No active relationship found.',
      });
      return;
    }
    
    // Calculate days together
    const startDate = couple.relationshipStartDate || couple.pairingDate || couple.createdAt;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(startDate).getTime());
    const daysTogether = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    res.status(200).json({
      success: true,
      data: {
        relationshipStartDate: couple.relationshipStartDate,
        pairingDate: couple.pairingDate,
        daysTogether,
        isStartDateSet: !!couple.relationshipStartDate,
      },
    });
  } catch (error) {
    console.error('Get relationship info error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching relationship info.',
    });
  }
};

/**
 * Set or update relationship start date
 */
export const setRelationshipStartDate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { startDate } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You are not in a relationship.',
      });
      return;
    }
    
    if (!startDate) {
      res.status(400).json({
        success: false,
        message: 'Start date is required.',
      });
      return;
    }
    
    const parsedDate = new Date(startDate);
    
    // Validate date is not in the future
    if (parsedDate > new Date()) {
      res.status(400).json({
        success: false,
        message: 'Start date cannot be in the future.',
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    
    if (!couple || couple.status !== CoupleStatus.ACTIVE) {
      res.status(400).json({
        success: false,
        message: 'No active relationship found.',
      });
      return;
    }
    
    // Update the relationship start date
    couple.relationshipStartDate = parsedDate;
    await couple.save();
    
    // Calculate days together
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - parsedDate.getTime());
    const daysTogether = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    res.status(200).json({
      success: true,
      message: 'Relationship start date updated successfully.',
      data: {
        relationshipStartDate: couple.relationshipStartDate,
        daysTogether,
      },
    });
  } catch (error) {
    console.error('Set relationship start date error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while setting relationship start date.',
    });
  }
};

/**
 * Get relationship certificate
 */
export const getCertificate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You are not in a relationship.',
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    
    if (!couple || couple.status !== CoupleStatus.ACTIVE) {
      res.status(400).json({
        success: false,
        message: 'No active relationship found.',
      });
      return;
    }
    
    const partner1 = await User.findById(couple.partner1);
    const partner2 = await User.findById(couple.partner2);
    
    if (!partner1 || !partner2) {
      res.status(500).json({
        success: false,
        message: 'Error loading partner data.',
      });
      return;
    }
    
    // Check if PDF export is requested
    if (req.query.format === 'pdf') {
      const pdfBuffer = await generateCertificatePDF({
        couple,
        partner1,
        partner2,
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="certificate-${couple.coupleId}.pdf"`
      );
      res.send(pdfBuffer);
      return;
    }
    
    // Return JSON certificate data
    res.status(200).json({
      success: true,
      data: {
        certificate: {
          coupleId: couple.coupleId,
          partner1: {
            uniqueId: partner1.uniqueId,
            name: partner1.name,
          },
          partner2: {
            uniqueId: partner2.uniqueId,
            name: partner2.name,
          },
          pairingDate: couple.pairingDate,
          disclaimer: 'This is a digital certificate for personal use within this application only. It is NOT a legal document and has no legal standing.',
        },
      },
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while generating certificate.',
    });
  }
};

