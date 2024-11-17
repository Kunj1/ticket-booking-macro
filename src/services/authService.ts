import { AppDataSource } from '../config/database';
import { QueryFailedError } from 'typeorm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, SafeUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { notificationService } from './notificationService';
import logger from '../utils/logger';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const userRepository = AppDataSource.getRepository(User);

export const authService = {
  async register(userData: Partial<User>): Promise<SafeUser> {
    try {
      const existingUser = await userRepository.findOne({ where: { email: userData.email } });
      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }

      // Check for existing username
      const existingUsername = await userRepository.findOne({ 
        where: { username: userData.username } 
      });
      if (existingUsername) {
        throw new AppError('Username already taken', 400);
      }

      if (userData.phoneNumber) {
        const phoneNumber = parsePhoneNumberFromString(userData.phoneNumber);
        if (phoneNumber && phoneNumber.isValid()) {
          userData.phoneNumber = phoneNumber.format('E.164'); // Standardize to +[country code][number]
        } else {
          throw new AppError('Invalid phone number format', 400);
        }
      }

      const allowedRoles = ['user', 'admin'];
      if (userData.role && !allowedRoles.includes(userData.role)) {
        throw new AppError('Invalid role provided. Allowed roles are "user" or "admin".', 400);
      } 
      
      const hashedPassword = await bcrypt.hash(userData.password!, 10);
      const user = userRepository.create({
        ...userData,
        password: hashedPassword,
        role: userData.role || 'user',
        eventManager: userData.eventManager ?? false,
        performer: userData.performer ?? false,
        socialMediaLinks: userData.socialMediaLinks || []
      });
      
      await userRepository.save(user);
      
      // Initialize notification service if not already initialized
      if (!notificationService.isInitialized()) {
        await notificationService.initialize();
      }
      
      // Send welcome email
      try {
        await notificationService.sendNotification({
          type: 'email',
          recipient: user.email,
          template: 'welcome_email',
          data: {
            name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'there',
            username: user.username
          }
        });
      } catch (emailError) {
        // Log email error but don't fail registration
        logger.error('Failed to send welcome email:', emailError);
      }
      
      return user.toJSON();
    } catch (error) {
      if (error instanceof AppError) {
        throw error; // Known application errors
      }

      // Handle database-related errors
      if (error instanceof QueryFailedError) {
        // Handle specific database errors
        const message = typeof error.message === 'string' && error.message.includes('violates unique constraint')
          ? 'Email already in use'
          : 'Database error';
        throw new AppError(message, 400);
      }

      // Other unforeseen errors
      logger.error('Unexpected error in authService.register:', error);
      throw new AppError('Registration failed due to an unexpected error.', 500);
    }
  },

  async login(email: string, password: string): Promise<{ token: string; refreshToken: string }> {
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid password', 401);
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: '7d' });

    user.refreshToken = refreshToken;
    await userRepository.save(user);

    return { token, refreshToken };
  },

  async logout(userId: string): Promise<void> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.refreshToken = null;
      await userRepository.save(user);
    }
  },

  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as { userId: string };
      const user = await userRepository.findOne({ where: { id: decoded.userId, refreshToken } });

      if (!user) {
        throw new AppError('Invalid refresh token', 401);
      }

      const newToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
      return newToken;
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  },
};