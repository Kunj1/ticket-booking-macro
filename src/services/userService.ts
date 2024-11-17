import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { AppError } from '../utils/AppError';

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
    const { password, refreshToken, id, ...updatableFields } = profileData;
  
    userRepository.merge(user, updatableFields);
    await userRepository.save(user);
  
    // Return updated profile without sensitive information
    const { password: _, refreshToken: __, ...updatedProfile } = user;
    return updatedProfile;
  },
  
    async deleteUser(userId: string): Promise<void> {
      const result = await userRepository.delete(userId);
      if (result.affected === 0) {
        throw new AppError('User not found', 404);
      }
    }
};