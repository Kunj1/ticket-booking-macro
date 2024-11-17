import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/aws';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import sharp from 'sharp';
import crypto from 'crypto';

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

if (!BUCKET_NAME) {
  throw new AppError('AWS S3 bucket name not configured', 500);
}

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

  async uploadProfilePicture(userIdentifier: string, file: Express.Multer.File): Promise<string> {
    try {
      const processedImage = await this.processImage(file);
      const fileHash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
      const fileName = `profile-pictures/${userIdentifier}/${fileHash}.jpg`;

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: processedImage,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
        ServerSideEncryption: 'AES256'
      }));

      return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
      logger.error('Error uploading profile picture:', error);
      throw new AppError('Failed to upload profile picture', 500);
    }
  },

  async deleteProfilePicture(fileUrl: string): Promise<void> {
    try {
      const key = new URL(fileUrl).pathname.slice(1);
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      }));
    } catch (error) {
      logger.error('Error deleting profile picture:', error);
      throw new AppError('Failed to delete profile picture', 500);
    }
  }
};