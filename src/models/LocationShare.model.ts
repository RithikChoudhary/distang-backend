import mongoose, { Document, Schema } from 'mongoose';

/**
 * Location share model
 * Locations stay active until manually stopped by the user
 */
export interface ILocationShare extends Document {
  coupleId: mongoose.Types.ObjectId;
  sharedBy: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy?: number;
  isActive: boolean;
  sharedAt: Date;
  updatedAt: Date;
}

const LocationShareSchema = new Schema<ILocationShare>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
    },
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
LocationShareSchema.index({ coupleId: 1, sharedBy: 1 });
LocationShareSchema.index({ isActive: 1 });

export const LocationShare = mongoose.model<ILocationShare>(
  'LocationShare',
  LocationShareSchema
);
