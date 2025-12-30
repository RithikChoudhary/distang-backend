import mongoose, { Document, Schema } from 'mongoose';

/**
 * Call state enum
 */
export enum CallState {
  IDLE = 'idle',
  INCOMING = 'incoming',
  DIALING = 'dialing',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
}

/**
 * Call status document interface
 */
export interface ICallStatus extends Document {
  userId: mongoose.Types.ObjectId;
  coupleId: mongoose.Types.ObjectId;
  state: CallState;
  platform: 'ios' | 'android';
  updatedAt: Date;
  createdAt: Date;
}

const CallStatusSchema = new Schema<ICallStatus>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
    },
    state: {
      type: String,
      enum: Object.values(CallState),
      default: CallState.IDLE,
    },
    platform: {
      type: String,
      enum: ['ios', 'android'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups
CallStatusSchema.index({ coupleId: 1, userId: 1 });
CallStatusSchema.index({ updatedAt: 1 });

export const CallStatus = mongoose.model<ICallStatus>('CallStatus', CallStatusSchema);

