import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/bookingService';
import { AppError } from '../utils/AppError';
import { validateBooking } from '../utils/validator';

export const bookingController = {
  async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = validateBooking.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }
      const booking = await bookingService.createBooking({ ...req.body, userId });
      res.status(201).json(booking);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to create booking', 400));
    }
  },

  async getUserBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const bookings = await bookingService.getUserBookings(userId, page, limit);
      res.json(bookings);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to fetch bookings', 500));
    }
  },

  async getBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }
      const booking = await bookingService.getBookingById(req.params.id, userId);
      res.json(booking);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to fetch booking', 500));
    }
  },

  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }
      await bookingService.cancelBooking(req.params.id, userId);
      res.status(200).json({ message: 'Booking cancelled successfully' });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to cancel booking', 500));
    }
  },
};