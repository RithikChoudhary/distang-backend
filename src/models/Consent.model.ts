import mongoose, { Document, Schema } from 'mongoose';

/**
 * Consent toggle names - these are the features requiring mutual consent
 */
export enum ConsentType {
  PHOTO_SHARING = 'photoSharing',
  MEMORY_ACCESS = 'memoryAccess',
  LOCATION_SHARING = 'locationSharing',
}

/**
 * Individual consent record for history tracking
 */
export interface IConsentHistory {
  consentType: ConsentType;
  enabled: boolean;
  userId: mongoose.Types.ObjectId;
  timestamp: Date;
}

/**
 * Partner consent status
 */
export interface IPartnerConsent {
  userId: mongoose.Types.ObjectId;
  photoSharing: boolean;
  memoryAccess: boolean;
  locationSharing: boolean;
  lastUpdated: Date;
}

/**
 * Consent document interface
 * Tracks consent for both partners in a couple
 */
export interface IConsent extends Document {
  coupleId: mongoose.Types.ObjectId;
  partner1Consent: IPartnerConsent;
  partner2Consent: IPartnerConsent;
  history: IConsentHistory[];
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isFeatureEnabled(featureType: ConsentType): boolean;
  getActiveFeatures(): ConsentType[];
}

const PartnerConsentSchema = new Schema<IPartnerConsent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    photoSharing: {
      type: Boolean,
      default: false,
    },
    memoryAccess: {
      type: Boolean,
      default: false,
    },
    locationSharing: {
      type: Boolean,
      default: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ConsentHistorySchema = new Schema<IConsentHistory>(
  {
    consentType: {
      type: String,
      enum: Object.values(ConsentType),
      required: true,
    },
    enabled: {
      type: Boolean,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ConsentSchema = new Schema<IConsent>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
      unique: true,
    },
    partner1Consent: {
      type: PartnerConsentSchema,
      required: true,
    },
    partner2Consent: {
      type: PartnerConsentSchema,
      required: true,
    },
    history: {
      type: [ConsentHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Check if a feature is enabled (both partners must consent)
 */
ConsentSchema.methods.isFeatureEnabled = function (
  featureType: ConsentType
): boolean {
  const p1 = this.partner1Consent;
  const p2 = this.partner2Consent;
  
  switch (featureType) {
    case ConsentType.PHOTO_SHARING:
      return p1.photoSharing && p2.photoSharing;
    case ConsentType.MEMORY_ACCESS:
      return p1.memoryAccess && p2.memoryAccess;
    case ConsentType.LOCATION_SHARING:
      return p1.locationSharing && p2.locationSharing;
    default:
      return false;
  }
};

/**
 * Get list of all currently active features (mutual consent given)
 */
ConsentSchema.methods.getActiveFeatures = function (): ConsentType[] {
  const activeFeatures: ConsentType[] = [];
  
  for (const type of Object.values(ConsentType)) {
    if (this.isFeatureEnabled(type)) {
      activeFeatures.push(type);
    }
  }
  
  return activeFeatures;
};

// Index for quick lookup by couple
ConsentSchema.index({ coupleId: 1 });

export const Consent = mongoose.model<IConsent>('Consent', ConsentSchema);

