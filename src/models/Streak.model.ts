import mongoose, { Document, Schema } from 'mongoose';

/**
 * Streak Photo model
 * - Users can send up to 3 photos per streak
 * - Photos visible for 24 hours if not viewed
 * - If viewed, visible for 40 seconds then marked as seen
 */
export interface IStreakPhoto extends Document {
  coupleId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  imagePath: string;
  cloudinaryPublicId?: string;
  expiresAt: Date;
  viewedAt: Date | null;
  viewedBy: mongoose.Types.ObjectId | null;
  isExpired: boolean;
  createdAt: Date;
}

export interface IStreak extends Document {
  coupleId: mongoose.Types.ObjectId;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: Date;
  partner1LastPhoto: Date | null;
  partner2LastPhoto: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Streak Photo Schema
const StreakPhotoSchema = new Schema<IStreakPhoto>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
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
    cloudinaryPublicId: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: true,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    viewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index for auto-deletion after 24 hours
StreakPhotoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for querying active photos
StreakPhotoSchema.index({ coupleId: 1, uploadedBy: 1, isExpired: 1 });

// Streak Counter Schema
const StreakSchema = new Schema<IStreak>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      unique: true,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastStreakDate: {
      type: Date,
      default: null,
    },
    partner1LastPhoto: {
      type: Date,
      default: null,
    },
    partner2LastPhoto: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const StreakPhoto = mongoose.model<IStreakPhoto>('StreakPhoto', StreakPhotoSchema);
export const Streak = mongoose.model<IStreak>('Streak', StreakSchema);
