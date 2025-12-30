import mongoose, { Document, Schema } from 'mongoose';

/**
 * Important Dates model for calendar feature
 * Stores special dates for the couple
 */
export interface IImportantDate extends Document {
  coupleId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  emoji?: string;
  isRecurring: boolean;
  reminderEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ImportantDateSchema = new Schema<IImportantDate>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    date: {
      type: Date,
      required: true,
    },
    emoji: {
      type: String,
      default: '❤️',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient date queries
ImportantDateSchema.index({ coupleId: 1, date: 1 });

export const ImportantDate = mongoose.model<IImportantDate>(
  'ImportantDate',
  ImportantDateSchema
);

