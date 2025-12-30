import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Couple status enum
 */
export enum CoupleStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  DISSOLVED = 'dissolved',
}

/**
 * Pair request interface for tracking who initiated
 */
export interface IPairRequest {
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  respondedAt?: Date;
}

/**
 * Couple document interface
 */
export interface ICouple extends Document {
  coupleId: string;
  partner1: mongoose.Types.ObjectId;
  partner2: mongoose.Types.ObjectId;
  status: CoupleStatus;
  pairRequest: IPairRequest;
  pairingDate: Date;
  relationshipStartDate?: Date; // When the relationship actually started (set by couple)
  dissolutionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CoupleSchema = new Schema<ICouple>(
  {
    coupleId: {
      type: String,
      required: true,
      unique: true,
      default: () => `CPL-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    partner1: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    partner2: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CoupleStatus),
      default: CoupleStatus.PENDING,
    },
    pairRequest: {
      fromUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      toUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      respondedAt: {
        type: Date,
        default: null,
      },
    },
    pairingDate: {
      type: Date,
      default: null,
    },
    relationshipStartDate: {
      type: Date,
      default: null,
    },
    dissolutionDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding couples by partner
CoupleSchema.index({ partner1: 1, partner2: 1 });
CoupleSchema.index({ status: 1 });

export const Couple = mongoose.model<ICouple>('Couple', CoupleSchema);

