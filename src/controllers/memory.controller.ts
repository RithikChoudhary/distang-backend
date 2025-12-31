import { Response } from 'express';
import { ConsentRequest } from '../middlewares/consent.middleware';
import { Memory, MemoryStatus } from '../models/Memory.model';
import { uploadImage, deleteFromCloudinary } from '../services/cloudinary.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload a memory (photo) to Cloudinary
 * Requires mutual consent for photo sharing
 */
export const uploadMemory = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const couple = req.couple;
    const { caption } = req.body;
    const file = req.file;
    
    if (!user || !couple) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided.',
      });
      return;
    }
    
    // Upload to Cloudinary
    const memoryId = uuidv4();
    const result = await uploadImage(
      file.buffer,
      'memory',
      undefined,
      couple._id.toString(),
      memoryId
    );
    
    if (!result) {
      res.status(500).json({
        success: false,
        message: 'Failed to upload image to cloud storage.',
      });
      return;
    }
    
    // Create memory record with Cloudinary URL
    const memory = new Memory({
      coupleId: couple._id,
      uploadedBy: user._id,
      imagePath: result.url,
      cloudinaryPublicId: result.publicId,
      caption: caption?.trim().slice(0, 500),
      status: MemoryStatus.ACTIVE,
    });
    
    await memory.save();
    
    res.status(201).json({
      success: true,
      message: 'Memory uploaded successfully.',
      data: {
        memory: {
          id: memory._id,
          imagePath: memory.imagePath,
          caption: memory.caption,
          uploadedBy: user.uniqueId,
          createdAt: memory.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Upload memory error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while uploading memory.',
    });
  }
};

/**
 * Get list of memories
 * Requires mutual consent for memory access
 */
export const listMemories = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const couple = req.couple;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    if (!couple) {
      res.status(400).json({
        success: false,
        message: 'Couple not found.',
      });
      return;
    }
    
    const [memories, total] = await Promise.all([
      Memory.find({
        coupleId: couple._id,
        status: MemoryStatus.ACTIVE,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'uniqueId name'),
      Memory.countDocuments({
        coupleId: couple._id,
        status: MemoryStatus.ACTIVE,
      }),
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        memories: memories.map((m) => ({
          id: m._id,
          imagePath: m.imagePath,
          caption: m.caption,
          uploadedBy: m.uploadedBy,
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
    console.error('List memories error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching memories.',
    });
  }
};

/**
 * Get a single memory
 * Requires mutual consent for memory access
 */
export const getMemory = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const couple = req.couple;
    const { id } = req.params;
    
    if (!couple) {
      res.status(400).json({
        success: false,
        message: 'Couple not found.',
      });
      return;
    }
    
    const memory = await Memory.findOne({
      _id: id,
      coupleId: couple._id,
      status: MemoryStatus.ACTIVE,
    }).populate('uploadedBy', 'uniqueId name');
    
    if (!memory) {
      res.status(404).json({
        success: false,
        message: 'Memory not found.',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: {
        memory: {
          id: memory._id,
          imagePath: memory.imagePath,
          caption: memory.caption,
          uploadedBy: memory.uploadedBy,
          createdAt: memory.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get memory error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching memory.',
    });
  }
};

/**
 * Delete a memory
 * Either partner can delete any memory
 */
export const deleteMemory = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const couple = req.couple;
    const { memoryId } = req.params;
    
    if (!user || !couple) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    const memory = await Memory.findOne({
      _id: memoryId,
      coupleId: couple._id,
      status: MemoryStatus.ACTIVE,
    });
    
    if (!memory) {
      res.status(404).json({
        success: false,
        message: 'Memory not found.',
      });
      return;
    }
    
    // Delete from Cloudinary if publicId exists
    if (memory.cloudinaryPublicId) {
      await deleteFromCloudinary(memory.cloudinaryPublicId);
    }
    
    // Mark as deleted (soft delete)
    memory.status = MemoryStatus.DELETED;
    memory.deletedBy = user._id;
    memory.deletedAt = new Date();
    await memory.save();
    
    res.status(200).json({
      success: true,
      message: 'Memory deleted successfully.',
    });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting memory.',
    });
  }
};

