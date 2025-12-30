import mongoose, { Document, Schema } from 'mongoose';

/**
 * VoiceMessage model - for walkie-talkie voice notes
 * Audio messages between partners
 */
export interface IVoiceMessage extends Document {
  coupleId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  audioPath: string;
  duration: number; // in seconds
  isListened: boolean;
  listenedAt?: Date;
  createdAt: Date;
}

const VoiceMessageSchema = new Schema<IVoiceMessage>(
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
    audioPath: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
      max: 60, // Max 60 seconds
    },
    isListened: {
      type: Boolean,
      default: false,
    },
    listenedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
VoiceMessageSchema.index({ coupleId: 1, recipient: 1, isListened: 1 });
VoiceMessageSchema.index({ createdAt: -1 });

export const VoiceMessage = mongoose.model<IVoiceMessage>('VoiceMessage', VoiceMessageSchema);

