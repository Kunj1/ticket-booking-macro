import { AppDataSource } from '../config/database';
import { Ticket } from '../models/Ticket';
import redisClient from '../config/redis';
import { MoreThan, LessThan } from 'typeorm';
import { AppError } from '../utils/AppError';

const ticketRepository = AppDataSource.getRepository(Ticket);

export const ticketService = {
  async createTicket(ticketData: Partial<Ticket>): Promise<Ticket> {
    const ticket = ticketRepository.create(ticketData);
    await ticketRepository.save(ticket);
    return ticket;
  },

  async getAvailableTickets(eventId: string): Promise<Ticket[]> {
    return ticketRepository.find({
      where: {
        event: { id: eventId },
        quantity: MoreThan(0),
      },
    });
  },

  async getTickets(page: number = 1, limit: number = 10): Promise<{ tickets: Ticket[], total: number }> {
    const [tickets, total] = await ticketRepository.findAndCount({
      relations: ['event'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    return { tickets, total };
  },

  async getTicketById(id: string): Promise<Ticket> {
    const ticket = await ticketRepository.findOne({ where: { id }, relations: ['event'] });
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }
    return ticket;
  },

  async updateTicket(id: string, ticketData: Partial<Ticket>): Promise<Ticket> {
    const ticket = await ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }
    ticketRepository.merge(ticket, ticketData);
    return ticketRepository.save(ticket);
  },

  async deleteTicket(id: string): Promise<void> {
    const result = await ticketRepository.delete(id);
    if (result.affected === 0) {
      throw new AppError('Ticket not found', 404);
    }
  },

  async getTicketsForEvent(eventId: string, page: number = 1, limit: number = 10): Promise<{ tickets: Ticket[], total: number }> {
    const [tickets, total] = await ticketRepository.findAndCount({
      where: { event: { id: eventId } },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    return { tickets, total };
  },

  async checkTicketAvailability(eventId: string, ticketType: string): Promise<number> {
    const ticket = await ticketRepository.findOne({
      where: { event: { id: eventId }, type: ticketType }
    });

    return ticket ? ticket.quantity - ticket.soldCount : 0;
  },

  async reserveTicket(ticketId: string, userId: string): Promise<boolean> {
    const lockKey = `ticket:${ticketId}:lock`;
    
    const lock = await redisClient.setnx(lockKey, userId);
    if (lock) {
      await redisClient.expire(lockKey, 60); // Set expiration to 60 seconds
    } else {
      return false;
    }

    try {
      const ticket = await ticketRepository.findOne({ where: { id: ticketId } });
      if (!ticket || ticket.quantity <= ticket.soldCount) {
        throw new AppError('Ticket not available', 400);
      }

      ticket.soldCount += 1;
      await ticketRepository.save(ticket);
      return true;
    } finally {
      await redisClient.del(lockKey);
    }
  },

  async releaseTicket(ticketId: string): Promise<void> {
    const ticket = await ticketRepository.findOne({ where: { id: ticketId } });
    if (ticket && ticket.soldCount > 0) {
      ticket.soldCount -= 1;
      await ticketRepository.save(ticket);
    } else {
      throw new AppError('Invalid ticket or no tickets to release', 400);
    }
  }
};