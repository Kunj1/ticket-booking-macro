import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../services/ticketService';
import { AppError } from '../utils/AppError';
import { validateTicketCreation, validateTicket, validateTicketUpdate } from '../utils/validator';

export const ticketController = {
  async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = validateTicketCreation.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }
      const ticket = await ticketService.createTicket(req.body);
      res.status(201).json(ticket);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to create ticket', 400));
    }
  },

  async getTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await ticketService.getTickets(page, limit);
      res.json(result);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to fetch tickets', 500));
    }
  },

  async getTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.getTicketById(req.params.id);
      res.json(ticket);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to fetch ticket', 500));
    }
  },

  async updateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = validateTicketUpdate.validate(req.body);
      if (error) {
        throw new AppError(error.details[0].message, 400);
      }
      const ticket = await ticketService.updateTicket(req.params.id, req.body);
      res.json(ticket);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to update ticket', 400));
    }
  },

  async deleteTicket(req: Request, res: Response, next: NextFunction) {
    try {
      await ticketService.deleteTicket(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to delete ticket', 500));
    }
  },

  async getTicketsForEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await ticketService.getTicketsForEvent(req.params.eventId, page, limit);
      res.json(result);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to fetch tickets for event', 500));
    }
  },

  async checkTicketAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId, ticketType } = req.params;
      const availability = await ticketService.checkTicketAvailability(eventId, ticketType);
      res.json({ availability });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to check ticket availability', 500));
    }
  },

  async reserveTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }
      const result = await ticketService.reserveTicket(ticketId, userId);
      res.json({ success: result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to reserve ticket', 400));
    }
  },

  async releaseTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketId } = req.params;
      await ticketService.releaseTicket(ticketId);
      res.status(204).send();
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to release ticket', 400));
    }
  },

  async getAvailableTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;
      const tickets = await ticketService.getAvailableTickets(eventId);
      res.json(tickets);
    } catch (error) {
      next(error instanceof AppError ? error : new AppError('Failed to fetch available tickets', 500));
    }
  },

};