import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { AppError } from '../utils/AppError';
import { notificationService } from './notificationService';
import logger from '../utils/logger';

const userRepository = AppDataSource.getRepository(User);

export const userService = {
  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid old password', 401);
    }

    if (oldPassword === newPassword) {
      throw new AppError('New password too similar', 409);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await userRepository.save(user);

    // Send password update notification
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: user.email,
        template: 'account_update',
        data: {
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username,
          updateType: 'password',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to send password update email:', error);
    }
  },

  async getUserProfile(userId: string): Promise<Partial<User>> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Exclude sensitive information
    const { password, refreshToken, ...userProfile } = user;
    return userProfile;
  },

  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<Partial<User>> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }
  
    // Ensure that sensitive fields cannot be updated directly
    const { password, refreshToken, id, role, ...updatableFields } = profileData;
  
    // Save the original email to check if it changed
    const originalEmail = user.email;
    
    userRepository.merge(user, updatableFields);
    await userRepository.save(user);

    // Send profile update notification if significant fields were updated
    const significantChanges = ['email', 'phoneNumber', 'username', 'eventManager', 'performer'].some(
      field => field in updatableFields
    );

    if (significantChanges) {
      try {
        await notificationService.sendNotification({
          type: 'email',
          recipient: originalEmail, // Use original email in case it was changed
          template: 'account_update',
          data: {
            name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username,
            updateType: 'profile',
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.error('Failed to send profile update email:', error);
      }
    }
  
    // Return updated profile without sensitive information
    const { password: _, refreshToken: __, ...updatedProfile } = user;
    return updatedProfile;
  },
  
  async deleteUser(userId: string): Promise<void> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const userEmail = user.email;
    const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username;

    // Delete the user
    const result = await userRepository.delete(userId);
    if (result.affected === 0) {
      throw new AppError('Failed to delete user', 500);
    }

    // Send account deletion notification
    try {
      await notificationService.sendNotification({
        type: 'email',
        recipient: userEmail,
        emailOptions: {
          subject: 'MACRO Account Deletion Confirmation',
          text: `Dear ${userName},\n\nThis email confirms that your MACRO account has been successfully deleted. All your personal data has been removed from our systems.\n\nIf you didn't request this deletion, please contact our support team immediately.\n\nBest regards,\nThe MACRO Team`,
          html: `
            <h2>Account Deletion Confirmation</h2>
            <p>Dear ${userName},</p>
            <p>This email confirms that your MACRO account has been successfully deleted. All your personal data has been removed from our systems.</p>
            <p><strong>If you didn't request this deletion, please contact our support team immediately.</strong></p>
            <br>
            <p>Best regards,</p>
            <p>The MACRO Team</p>
          `
        }
      });
    } catch (error) {
      logger.error('Failed to send account deletion email:', error);
    }
  }
};