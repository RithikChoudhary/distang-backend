import mongoose, { Document, Schema } from 'mongoose';

/**
 * OTP types
 */
export enum OTPType {
  SIGNUP = 'signup',
  LOGIN = 'login',
  RESET = 'reset',
}

/**
 * OTP document interface
 */
export interface IOTP extends Document {
  email: string;
  otp: string;
  type: OTPType;
  attempts: number;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(OTPType),
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookups
OTPSchema.index({ email: 1, type: 1, isUsed: 1 });

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const OTP = mongoose.model<IOTP>('OTP', OTPSchema);

