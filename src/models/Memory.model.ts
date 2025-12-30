import mongoose, { Document, Schema } from 'mongoose';

/**
 * Memory status enum
 */
export enum MemoryStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

/**
 * Memory document interface
 * Represents a shared photo/memory between partners
 */
export interface IMemory extends Document {
  coupleId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  imagePath: string;
  thumbnailPath?: string;
  caption?: string;
  status: MemoryStatus;
  deletedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema<IMemory>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    imagePath: {
      type: String,
      required: true,
    },
    thumbnailPath: {
      type: String,
      default: null,
    },
    caption: {
      type: String,
      maxlength: 500,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(MemoryStatus),
      default: MemoryStatus.ACTIVE,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
MemorySchema.index({ coupleId: 1, status: 1 });
MemorySchema.index({ uploadedBy: 1 });
MemorySchema.index({ createdAt: -1 });

export const Memory = mongoose.model<IMemory>('Memory', MemorySchema);

