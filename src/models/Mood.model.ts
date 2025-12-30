import mongoose, { Document, Schema } from 'mongoose';

/**
 * Available mood types
 */
export enum MoodType {
  HAPPY = 'happy',
  EXCITED = 'excited',
  CALM = 'calm',
  TIRED = 'tired',
  SAD = 'sad',
  STRESSED = 'stressed',
  LOVING = 'loving',
  ANGRY = 'angry',
  ANXIOUS = 'anxious',
  NEUTRAL = 'neutral',
}

/**
 * Mood emoji mapping
 */
export const moodEmojis: Record<MoodType, string> = {
  [MoodType.HAPPY]: '😊',
  [MoodType.EXCITED]: '🤩',
  [MoodType.CALM]: '😌',
  [MoodType.TIRED]: '😴',
  [MoodType.SAD]: '😢',
  [MoodType.STRESSED]: '😫',
  [MoodType.LOVING]: '🥰',
  [MoodType.ANGRY]: '😤',
  [MoodType.ANXIOUS]: '😰',
  [MoodType.NEUTRAL]: '😐',
};

/**
 * Mood document interface
 */
export interface IMood extends Document {
  coupleId: mongoose.Types.ObjectId;
  uniqueId: string; // User who set the mood
  name: string;
  mood: MoodType;
  message?: string; // Optional short note
  createdAt: Date;
}

const MoodSchema = new Schema<IMood>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
    },
    uniqueId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    mood: {
      type: String,
      enum: Object.values(MoodType),
      required: true,
    },
    message: {
      type: String,
      maxlength: 100,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying recent moods
MoodSchema.index({ coupleId: 1, uniqueId: 1, createdAt: -1 });

export const Mood = mongoose.model<IMood>('Mood', MoodSchema);

