import mongoose, { Document, Schema } from 'mongoose';

/**
 * Anonymous review document interface
 * Created optionally after a breakup - no identity revealed
 */
export interface IReview extends Document {
  coupleId: mongoose.Types.ObjectId;
  reviewText: string;
  createdAt: Date;
  // Note: We deliberately don't store who wrote the review
  // to maintain complete anonymity
}

const ReviewSchema = new Schema<IReview>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
    },
    reviewText: {
      type: String,
      required: true,
      maxlength: 300, // Max 300 characters as per spec
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding reviews by couple (though anonymous)
ReviewSchema.index({ coupleId: 1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);

