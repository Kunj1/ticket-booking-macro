import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/eventService';
import { AppError } from '../utils/AppError';
import { validateEvent } from '../utils/validator';

export const eventController = {
  async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = validateEvent.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }
      const event = await eventService.createEvent(req.body);
      res.status(201).json(event);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to create event', 400));
    }
  },

  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, category, startDate, endDate } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await eventService.getEvents({
        search: search as string | undefined,
        category: category as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page,
        limit
      });
      res.json(events);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to fetch events', 500));
    }
  },

  async getEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.getEventById(req.params.id);
      res.json(event);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to fetch event', 500));
    }
  },

  async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = validateEvent.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }
      const event = await eventService.updateEvent(req.params.id, req.body);
      res.json(event);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to update event', 400));
    }
  },

  async deleteEvent(req: Request, res: Response, next: NextFunction) {
    try {
      await eventService.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to delete event', 500));
    }
  },
};