import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AppError } from '../utils/AppError';
import { validateRegistration, validateLogin } from '../utils/validator';
import rateLimit from 'express-rate-limit';
import { RequestWithUser } from '../types/express';
import logger from "../utils/logger";
import { fileService } from '../services/fileService';

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
});

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = validateRegistration.validate(req.body);
      if (error) {
        return res.status(400).json({
            message: error.details[0].message,
            field: error.details[0].context?.key
        });
      }

      // Handle profile picture upload if present
      let profilePictureUrl: string | undefined;
      if (req.file) {
        profilePictureUrl = await fileService.uploadProfilePicture(req.body.email, req.file);
      }

      // Register user with profile picture URL if uploaded
      const user = await authService.register({
        ...req.body,
        profilePicture: profilePictureUrl,
        username: req.body.username || req.body.email.split('@')[0] // Default username if not provided
      });

      res.status(201).json({ 
        message: 'User registered successfully', 
        userId: user.id,
        profilePicture: user.profilePicture
      });
    } catch (error: unknown) {
      // If there's an error and a file was uploaded, attempt to clean it up
      if (req.file && (error instanceof AppError)) {
        try {
          await fileService.deleteProfilePicture(req.file.filename);
        } catch (deleteError) {
          // Log deletion error but don't throw it to client
          logger.error('Failed to cleanup uploaded file:', deleteError);
        }
      }
      
      if (error instanceof AppError) {
          return res.status(error.statusCode).json({ message: error.message });
      }
      next(new AppError('Internal Server Error', 500));
  }
},

  async login(req: Request, res: Response, next: NextFunction) {
    loginLimiter(req, res, async (err: any) => {
      if (err) {
        return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
      }
      try {
        const { error } = validateLogin.validate(req.body);
        if (error) {
          return res.status(400).json({
              message: error.details[0].message,
              field: error.details[0].context?.key
          });
        }
        
        const { email, password } = req.body;
        const result = await authService.login(email, password);
  
        if (result) {
          const { token, refreshToken } = result;
          return res.status(200).json({ token, refreshToken });
        } 
        return res.status(401).json({ message: 'Invalid email or password' });
      } catch (error: unknown) {
        if (error instanceof AppError) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        logger.error('Unexpected login error:', error);
        return res.status(500).json({ message: 'An unexpected error occurred during login' });
      }
    });
  },

  async logout(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      await authService.logout(req.user.id);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: unknown) {
        if (error instanceof AppError) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        logger.error('Unexpected logout error:', error);
        return res.status(500).json({ message: 'An unexpected error occurred during logout' });
      }
    },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }
      const newToken = await authService.refreshToken(refreshToken);
      if (newToken) {
        res.json({ token: newToken });
      } else {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      logger.error('Token refresh failed', error);
      return res.status(500).json({ message: 'Token refresh failed' });
    }
  },
};