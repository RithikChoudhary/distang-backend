import mongoose, { Document, Schema } from 'mongoose';

/**
 * Buzz model - for sending vibration alerts to partner
 * Like a "poke" or "thinking of you" notification
 */
export interface IBuzz extends Document {
  coupleId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  type: 'single' | 'double' | 'long';
  isRead: boolean;
  createdAt: Date;
}

const BuzzSchema = new Schema<IBuzz>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['single', 'double', 'long'],
      default: 'single',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
BuzzSchema.index({ coupleId: 1, recipient: 1, isRead: 1 });
BuzzSchema.index({ createdAt: -1 });

export const Buzz = mongoose.model<IBuzz>('Buzz', BuzzSchema);

