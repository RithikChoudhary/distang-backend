import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * User relationship status enum
 */
export enum RelationshipStatus {
  SINGLE = 'single',
  PAIRED = 'paired',
}

/**
 * User favorites interface
 */
export interface IUserFavorites {
  food?: string;
  placeVisited?: string;
  placeToBe?: string;
}

/**
 * User notification preferences
 */
export interface INotificationPreferences {
  messages: boolean;
  locationUpdates: boolean;
  streaks: boolean;
  calendar: boolean;
  walkieTalkie: boolean;
}

/**
 * Relationship history entry (permanent, never deleted)
 */
export interface IRelationshipHistory {
  partnerName: string;
  partnerUniqueId: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  initiatedBreakup: boolean; // true if this user initiated the breakup
}

/**
 * User about/hobbies information
 */
export interface IUserAbout {
  bio?: string;
  hobbies: string[];
  occupation?: string;
  education?: string;
  location?: string;
  birthday?: Date;
}

/**
 * User document interface
 */
export interface IUser extends Document {
  uniqueId: string;
  username: string;
  email: string;
  phoneNumber?: string;
  name: string;
  profilePhoto?: string;
  photos: string[]; // Array of 3 additional photos
  favorites: IUserFavorites;
  notifications: INotificationPreferences;
  about: IUserAbout; // Bio, hobbies, etc.
  relationshipHistory: IRelationshipHistory[]; // Permanent history, never deleted
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  relationshipStatus: RelationshipStatus;
  coupleId?: mongoose.Types.ObjectId;
  pastRelationshipExists: boolean;
  isProfileComplete: boolean;
  isVerified: boolean;
  isBanned: boolean;
  adminNote?: string;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserFavoritesSchema = new Schema<IUserFavorites>(
  {
    food: { type: String, default: null },
    placeVisited: { type: String, default: null },
    placeToBe: { type: String, default: null },
  },
  { _id: false }
);

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    messages: { type: Boolean, default: true },
    locationUpdates: { type: Boolean, default: true },
    streaks: { type: Boolean, default: true },
    calendar: { type: Boolean, default: true },
    walkieTalkie: { type: Boolean, default: true },
  },
  { _id: false }
);

const RelationshipHistorySchema = new Schema<IRelationshipHistory>(
  {
    partnerName: { type: String, required: true },
    partnerUniqueId: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationDays: { type: Number, required: true },
    initiatedBreakup: { type: Boolean, default: false },
  },
  { _id: true } // Keep _id for each history entry
);

const UserAboutSchema = new Schema<IUserAbout>(
  {
    bio: { type: String, maxlength: 500, default: null },
    hobbies: { type: [String], default: [] },
    occupation: { type: String, maxlength: 100, default: null },
    education: { type: String, maxlength: 100, default: null },
    location: { type: String, maxlength: 100, default: null },
    birthday: { type: Date, default: null },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    uniqueId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4().slice(0, 8).toUpperCase(),
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/, // Only lowercase letters, numbers, underscores
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 3,
        message: 'Maximum 3 photos allowed',
      },
    },
    favorites: {
      type: UserFavoritesSchema,
      default: () => ({}),
    },
    notifications: {
      type: NotificationPreferencesSchema,
      default: () => ({
        messages: true,
        locationUpdates: true,
        streaks: true,
        calendar: true,
        walkieTalkie: true,
      }),
    },
    about: {
      type: UserAboutSchema,
      default: () => ({ hobbies: [] }),
    },
    relationshipHistory: {
      type: [RelationshipHistorySchema],
      default: [],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: null,
    },
    relationshipStatus: {
      type: String,
      enum: Object.values(RelationshipStatus),
      default: RelationshipStatus.SINGLE,
    },
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      default: null,
    },
    pastRelationshipExists: {
      type: Boolean,
      default: false,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    adminNote: {
      type: String,
      default: null,
    },
    lastActive: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster lookups
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ uniqueId: 1 });
UserSchema.index({ lastActive: -1 });
UserSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', UserSchema);
