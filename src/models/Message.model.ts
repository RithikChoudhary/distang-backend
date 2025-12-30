import mongoose, { Document, Schema } from 'mongoose';

/**
 * Message model for couple chat
 * All messages are stored and persist in the database
 */
export interface IMessage extends Document {
  coupleId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  message: string;
  messageType: MessageType;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedBy?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VOICE = 'voice',
  LOCATION = 'location',
}

const MessageSchema = new Schema<IMessage>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    messageType: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
MessageSchema.index({ coupleId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, isRead: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

