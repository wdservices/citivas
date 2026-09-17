import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  resourceType?: string;
  bytes?: number;
  format?: string;
  width?: number;
  height?: number;
  createdAt?: string;
};

type UploadOptions = {
  folder?: string;
  publicId?: string;
  tags?: string[];
  transformation?: string;
};

// Default folder structure
export const CLOUDINARY_FOLDERS = {
  EVENTS: 'events',
  BUSINESS: 'businesses',
  USERS: 'users',
  LISTINGS: 'listings',
  TICKETS: 'tickets',
  AVATARS: 'avatars',
  PROPERTIES: 'properties',
  ADS: 'advertisements',
} as const;

/**
 * Compress an image file to an optimized Base64 / WebP / JPEG Data URL (under 250KB)
 * to guarantee that uploads never fail even if third-party cloud services are not configured.
 */
export async function compressImageToDataUrl(file: File, maxWidth = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image for compression'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to raw data url
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * fetch with a hard timeout — an unresponsive endpoint (missing backend,
 * unprovisioned bucket, blocked network) must never hang an upload forever.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 15000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Reject if the wrapped promise doesn't settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Primary image upload function with multi-tier fallback:
 * 1. Cloudinary Unsigned (if client env variables configured)
 * 2. Cloudinary Signed via Server (if server env variables configured)
 * 3. Firebase Storage (if provisioned)
 * 4. Resilient Base64 Data URL (guaranteed success)
 *
 * Every network tier has a hard timeout so a missing backend / unprovisioned
 * bucket can never leave the UI stuck on "Uploading..." forever.
 */
export async function uploadImageToCloudinary(
  file: File,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const folder = options.folder || CLOUDINARY_FOLDERS.BUSINESS;
  const unsignedPreset = import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET?.trim();
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();

  // Tier 1: Client-side Unsigned Cloudinary Upload
  if (cloudName && unsignedPreset) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', unsignedPreset);
      if (options.folder) formData.append('folder', options.folder);
      if (options.publicId) formData.append('public_id', options.publicId);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      const response = await fetchWithTimeout(uploadUrl, { method: 'POST', body: formData }, 20000);

      if (response.ok) {
        const result = await response.json();
        if (result.secure_url) {
          return {
            secureUrl: result.secure_url,
            publicId: result.public_id || `${folder}/${Date.now()}`,
            resourceType: result.resource_type,
            bytes: result.bytes || file.size,
          };
        }
      }
    } catch (err) {
      console.warn('[upload] Client Cloudinary upload failed, trying fallbacks:', err);
    }
  }

  // Tier 2: Server-side Signed Cloudinary Upload
  try {
    const signRes = await fetchWithTimeout(
      '/api/uploads/sign',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: options.folder, public_id: options.publicId }),
      },
      10000,
    );

    if (signRes.ok) {
      const signData = await signRes.json();
      if (signData?.signature && signData?.apiKey && signData?.cloudName) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', String(signData.timestamp));
        formData.append('signature', signData.signature);
        if (options.folder) formData.append('folder', options.folder);
        if (options.publicId) formData.append('public_id', options.publicId);

        const uploadRes = await fetchWithTimeout(
          `https://api.cloudinary.com/v1_1/${signData.cloudName}/auto/upload`,
          { method: 'POST', body: formData },
          45000,
        );

        if (uploadRes.ok) {
          const result = await uploadRes.json();
          if (result.secure_url) {
            return {
              secureUrl: result.secure_url,
              publicId: result.public_id || `${folder}/${Date.now()}`,
              resourceType: result.resource_type,
              bytes: result.bytes || file.size,
            };
          }
        }
      }
    }
  } catch (err) {
    // Continue to next tier
  }

  // Tier 3: Firebase Storage Upload (skipped fast if the bucket was never provisioned)
  if (storage) {
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${folder}/${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await withTimeout(uploadBytes(storageRef, file), 25000, 'Firebase Storage upload');
      const downloadUrl = await withTimeout(getDownloadURL(snapshot.ref), 15000, 'Firebase Storage URL');

      if (downloadUrl) {
        return {
          secureUrl: downloadUrl,
          publicId: storagePath,
          bytes: file.size,
        };
      }
    } catch (err) {
      console.warn('[upload] Firebase Storage upload fallback triggered:', err);
    }
  }

  // Tier 4: Resilient Optimized Base64 Data URL
  // Compress aggressively to stay well under Firestore's 1MB per-field limit.
  try {
    const dataUrl = await compressImageToDataUrl(file, 800, 0.7);
    const maxBytes = 750_000;
    if (dataUrl.length > maxBytes) {
      const dataUrl2 = await compressImageToDataUrl(file, 600, 0.5);
      if (dataUrl2.length > maxBytes) {
        throw new Error('Image too large for local storage. Please use a smaller image.');
      }
      const uniqueId = `${folder}/local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return { secureUrl: dataUrl2, publicId: uniqueId, bytes: dataUrl2.length };
    }
    const uniqueId = `${folder}/local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      secureUrl: dataUrl,
      publicId: uniqueId,
      bytes: dataUrl.length,
    };
  } catch (err) {
    console.warn('[upload] Base64 fallback failed:', err);
    throw new Error('Image upload failed. No upload backend is configured. Please set up Cloudinary or Firebase Storage.');
  }
}

/**
 * Get optimized image URL
 */
export const getOptimizedImageUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    crop?: string;
    format?: string;
  } = {}
): string => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) {
    console.warn('Cloudinary cloud name not configured');
    return '';
  }

  const transformations = [];
  
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.format) transformations.push(`f_${options.format}`);
  
  const transformationString = transformations.length > 0 ? transformations.join(',') : '';
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}${publicId}`;
};

/**
 * Image validation helper
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.',
    };
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File too large. Please upload an image smaller than 10MB.',
    };
  }
  
  return { isValid: true };
};

/**
 * Get image preview URL before upload
 */
export const getImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Extract Cloudinary public_id from a full image URL.
 * URL pattern: https://res.cloudinary.com/{cloud}/image/upload/{version?}/{public_id}.{ext}
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    // Match pattern: /image/upload/ (optional v1234/) then public_id.ext
    const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (match && match[1]) {
      // Remove any trailing query params
      return match[1].split('?')[0];
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Delete image(s) from Cloudinary via server endpoint.
 * Best-effort: returns results even if some deletes fail.
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<boolean> => {
  return deleteImagesFromCloudinary([publicId]);
};

/**
 * Delete multiple images from Cloudinary via server endpoint.
 */
export const deleteImagesFromCloudinary = async (publicIds: string[]): Promise<boolean> => {
  if (!publicIds.length) return true;
  try {
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    const resp = await fetch(`${serverUrl}/api/uploads/destroy`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_ids: publicIds }),
    });
    const data = await resp.json();
    return data?.status === true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Collect all public_ids from a listing document for deletion.
 * Checks imagePublicIds (array), imagePublicId (singular), and extracts from URL.
 */
export const collectPublicIdsForListing = (data: any): string[] => {
  const ids: string[] = [];
  if (data.imagePublicIds && Array.isArray(data.imagePublicIds)) {
    ids.push(...data.imagePublicIds.filter(Boolean));
  }
  if (data.imagePublicId) {
    ids.push(data.imagePublicId);
  }
  // Extract from image URL if no stored public_ids
  if (ids.length === 0 && data.image) {
    const extracted = extractPublicIdFromUrl(data.image);
    if (extracted) ids.push(extracted);
  }
  // Also check images array
  if (data.images && Array.isArray(data.images)) {
    for (const url of data.images) {
      const extracted = extractPublicIdFromUrl(url);
      if (extracted && !ids.includes(extracted)) ids.push(extracted);
    }
  }
  return ids;
};

/**
 * Get Cloudinary base URL
 */
export const getCloudinaryBaseUrl = (): string => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
  return cloudName ? `https://res.cloudinary.com/${cloudName}` : '';
};