import { UploadApiResponse } from 'cloudinary';
import { cloudinary, APP_FOLDER, getSignedUrl } from '../config/cloudinary';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type UploadOptions = {
  folder: string;
  identifier: string;
  accessMode?: 'public' | 'private';
};

export const fileService = {
  async processImage(file: Express.Multer.File): Promise<Buffer> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new AppError('Invalid file type. Only JPEG, PNG and WebP images are allowed.', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError('File size too large. Maximum size is 5MB.', 400);
    }

    try {
      return await sharp(file.buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      logger.error('Error processing image:', error);
      throw new AppError('Failed to process image', 500);
    }
  },

  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions
  ): Promise<{ url: string; publicId: string }> {
    try {
      const processedImage = await this.processImage(file);
      const base64Image = processedImage.toString('base64');
      const uploadStr = `data:${file.mimetype};base64,${base64Image}`;

      // Construct the full folder path
      const folderPath = `${APP_FOLDER}/${options.folder}`;

      // Upload to Cloudinary
      const result: UploadApiResponse = await cloudinary.uploader.upload(uploadStr, {
        folder: folderPath,
        public_id: `${options.identifier}_${Date.now()}`,
        overwrite: true,
        resource_type: 'image',
        //type: options.accessMode === 'private' ? 'private' : 'upload',
        type: 'private',
        access_mode: options.accessMode === 'private' ? 'authenticated' : 'public',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      });

      // For private images, generate a signed URL
      const url = options.accessMode === 'private' 
        ? getSignedUrl(result.public_id)
        : result.secure_url;

      return {
        url,
        publicId: result.public_id
      };
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new AppError('Failed to upload file', 500);
    }
  },

  async uploadProfilePicture(userIdentifier: string, file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
    try {
      return await this.uploadFile(file, {
        folder: 'profile-pictures',
        identifier: userIdentifier,
        accessMode: 'private'
      });
    } catch (error) {
      logger.error('Error uploading profile picture:', error);
      throw new AppError('Failed to upload profile picture', 500);
    }
  },

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new AppError('Failed to delete file', 500);
    }
  },

  async deleteProfilePicture(fileUrl: string): Promise<void> {
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = fileUrl.split('/');
      const publicIdIndex = urlParts.indexOf(APP_FOLDER);
      if (publicIdIndex === -1) {
        throw new AppError('Invalid file URL', 400);
      }
      
      const publicId = urlParts.slice(publicIdIndex).join('/').split('?')[0]; // Remove query parameters
      await this.deleteFile(publicId);
    } catch (error) {
      logger.error('Error deleting profile picture:', error);
      throw new AppError('Failed to delete profile picture', 500);
    }
  }
};