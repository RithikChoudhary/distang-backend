import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Cloudinary auto-configures from CLOUDINARY_URL if set
// Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
// Otherwise, use individual env vars as fallback
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
const CLOUDINARY_CONFIGURED = !!(CLOUDINARY_URL || process.env.CLOUDINARY_API_SECRET);

if (CLOUDINARY_URL) {
  console.log('✅ Cloudinary configured via CLOUDINARY_URL');
  // SDK auto-configures from CLOUDINARY_URL environment variable
} else if (process.env.CLOUDINARY_API_SECRET) {
  console.log('✅ Cloudinary configured via individual env vars');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbkbqh8sy',
    api_key: process.env.CLOUDINARY_API_KEY || '632942881449357',
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn('⚠️  Cloudinary not configured - file uploads will fail!');
  console.warn('   Set CLOUDINARY_URL or CLOUDINARY_API_SECRET in environment variables.');
}

/**
 * Upload types for organizing files
 */
export type UploadType = 
  | 'profile'      // User profile photos
  | 'gallery'      // User gallery photos
  | 'memory'       // Couple memories
  | 'chat-image'   // Chat images
  | 'chat-voice'   // Chat voice messages
  | 'streak'       // Streak photos
  | 'walkie';      // Walkie-talkie voice messages

/**
 * Get the folder path based on upload type and IDs
 */
const getFolderPath = (
  type: UploadType,
  userId?: string,
  coupleId?: string
): string => {
  const base = 'distang';
  
  switch (type) {
    case 'profile':
      return `${base}/users/${userId}/profile`;
    case 'gallery':
      return `${base}/users/${userId}/photos`;
    case 'memory':
      return `${base}/couples/${coupleId}/memories`;
    case 'chat-image':
      return `${base}/couples/${coupleId}/chat/images`;
    case 'chat-voice':
      return `${base}/couples/${coupleId}/chat/voice`;
    case 'streak':
      return `${base}/couples/${coupleId}/streak`;
    case 'walkie':
      return `${base}/couples/${coupleId}/walkie`;
    default:
      return `${base}/misc`;
  }
};

/**
 * Upload a file to Cloudinary from a buffer
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  options: {
    type: UploadType;
    userId?: string;
    coupleId?: string;
    publicId?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
  }
): Promise<{ url: string; publicId: string } | null> => {
  // Check if Cloudinary is configured
  if (!CLOUDINARY_CONFIGURED) {
    console.error('❌ Cloudinary upload failed: CLOUDINARY_API_SECRET not configured');
    console.error('   Please add CLOUDINARY_API_SECRET to Render environment variables');
    return null;
  }
  
  const folder = getFolderPath(options.type, options.userId, options.coupleId);
  
  console.log(`📤 Uploading to Cloudinary: folder=${folder}, type=${options.type}`);
  
  try {
    const result = await new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: options.publicId,
          resource_type: options.resourceType || 'auto',
          // Optimize images automatically
          transformation: options.resourceType === 'image' || !options.resourceType ? [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ] : undefined,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', JSON.stringify(error, null, 2));
            reject(error);
          } else if (result) {
            console.log(`✅ Cloudinary upload success: ${result.secure_url}`);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      );
      
      uploadStream.end(buffer);
    });
    
    return result;
  } catch (error: any) {
    console.error('❌ Upload to Cloudinary failed:', error?.message || error);
    return null;
  }
};

/**
 * Upload an image file
 */
export const uploadImage = async (
  buffer: Buffer,
  type: UploadType,
  userId?: string,
  coupleId?: string,
  publicId?: string
): Promise<{ url: string; publicId: string } | null> => {
  return uploadToCloudinary(buffer, {
    type,
    userId,
    coupleId,
    publicId,
    resourceType: 'image',
  });
};

/**
 * Upload an audio file
 */
export const uploadAudio = async (
  buffer: Buffer,
  type: UploadType,
  userId?: string,
  coupleId?: string,
  publicId?: string
): Promise<{ url: string; publicId: string } | null> => {
  return uploadToCloudinary(buffer, {
    type,
    userId,
    coupleId,
    publicId,
    resourceType: 'video', // Cloudinary uses 'video' for audio files
  });
};

/**
 * Upload a video file
 */
export const uploadVideo = async (
  buffer: Buffer,
  type: UploadType,
  userId?: string,
  coupleId?: string,
  publicId?: string
): Promise<{ url: string; publicId: string } | null> => {
  return uploadToCloudinary(buffer, {
    type,
    userId,
    coupleId,
    publicId,
    resourceType: 'video',
  });
};

/**
 * Delete a file from Cloudinary
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Delete all files in a folder (e.g., when couple breaks up)
 */
export const deleteCoupleFolder = async (coupleId: string): Promise<boolean> => {
  try {
    const folderPath = `distang/couples/${coupleId}`;
    
    // Delete all resources in the folder
    await cloudinary.api.delete_resources_by_prefix(folderPath);
    
    // Try to delete the folder itself
    try {
      await cloudinary.api.delete_folder(folderPath);
    } catch {
      // Folder might already be empty/deleted
    }
    
    return true;
  } catch (error) {
    console.error('Delete couple folder error:', error);
    return false;
  }
};

/**
 * Delete user's personal files (profile, gallery)
 */
export const deleteUserFolder = async (userId: string): Promise<boolean> => {
  try {
    const folderPath = `distang/users/${userId}`;
    
    await cloudinary.api.delete_resources_by_prefix(folderPath);
    
    try {
      await cloudinary.api.delete_folder(folderPath);
    } catch {
      // Folder might already be empty/deleted
    }
    
    return true;
  } catch (error) {
    console.error('Delete user folder error:', error);
    return false;
  }
};

/**
 * Get optimized URL with transformations
 */
export const getOptimizedUrl = (
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
    quality?: 'auto' | 'auto:low' | 'auto:good' | 'auto:best';
  }
): string => {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: options?.quality || 'auto',
    width: options?.width,
    height: options?.height,
    crop: options?.crop || 'fill',
    secure: true,
  });
};

/**
 * Get thumbnail URL for images
 */
export const getThumbnailUrl = (publicId: string, size: number = 150): string => {
  return getOptimizedUrl(publicId, {
    width: size,
    height: size,
    crop: 'thumb',
    quality: 'auto:good',
  });
};

export default {
  uploadImage,
  uploadAudio,
  uploadVideo,
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteCoupleFolder,
  deleteUserFolder,
  getOptimizedUrl,
  getThumbnailUrl,
};

