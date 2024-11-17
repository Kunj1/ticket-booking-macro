import { AppDataSource } from '../config/database';
import { Booking } from '../models/Booking';
import { User } from '../models/User';
import { Ticket } from '../models/Ticket';
import { ticketService } from './ticketService';
import { notificationService } from './notificationService';
import { AppError } from '../utils/AppError';

const bookingRepository = AppDataSource.getRepository(Booking);
const userRepository = AppDataSource.getRepository(User);
const ticketRepository = AppDataSource.getRepository(Ticket);

export const bookingService = {
  async createBooking(bookingData: { ticketId: string; quantity: number; userId: string }): Promise<Booking> {
    const { ticketId, quantity, userId } = bookingData;

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const ticket = await ticketRepository.findOne({ where: { id: ticketId }, relations: ['event'] });
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.quantity < quantity) {
      throw new AppError('Not enough tickets available', 400);
    }

    const totalPrice = ticket.price * quantity;

    const booking = bookingRepository.create({
      user,
      ticket,
      quantity,
      totalPrice,
      status: 'pending'
    });

    const ticketReserved = await ticketService.reserveTicket(ticketId, userId);
    if (!ticketReserved) {
      throw new AppError('Failed to reserve ticket', 400);
    }

    await bookingRepository.save(booking);

    // Send confirmation email
    await notificationService.sendNotification({
      type: 'email',
      recipient: user.email,
      template: 'booking_confirmation',
      data: {
        bookingRef: booking.id,
        eventName: ticket.event.title,
        eventDate: ticket.event.date,
        ticketCount: quantity,
        totalPrice: totalPrice
      }
    });

    return booking;
  },

  async getUserBookings(userId: string, page: number = 1, limit: number = 10): Promise<{ bookings: Booking[], total: number }> {
    const [bookings, total] = await bookingRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['ticket', 'ticket.event'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    return { bookings, total };
  },

  async cancelBooking(bookingId: string, userId: string): Promise<void> {
    const booking = await bookingRepository.findOne({
      where: { id: bookingId, user: { id: userId } },
      relations: ['ticket', 'ticket.event']
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check if the booking can be cancelled (e.g., not too close to the event date)
    const currentDate = new Date();
    const eventDate = booking.ticket.event.date;
    const daysDifference = Math.ceil((eventDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));

    if (daysDifference < 2) { // Cancellation is not allowed within 48 hours of the event
      throw new AppError('Cancellation is not allowed within 48 hours of the event', 400);
    }

    await ticketService.releaseTicket(booking.ticket.id);
    booking.status = 'cancelled';
    await bookingRepository.save(booking);

    // Send cancellation notification
    await notificationService.sendNotification({
      type: 'email',
      recipient: booking.user.email,
      template: 'booking_cancellation',
      data: {
        bookingRef: booking.id,
        eventName: booking.ticket.event.title,
        eventDate: booking.ticket.event.date,
        refundAmount: booking.totalPrice
      }
    });
  },

  async getBookingById(bookingId: string, userId: string): Promise<Booking> {
    const booking = await bookingRepository.findOne({
      where: { id: bookingId, user: { id: userId } },
      relations: ['ticket', 'ticket.event', 'user']
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    return booking;
  },

  async getBookingsByEvent(eventId: string, page: number = 1, limit: number = 10): Promise<{ bookings: Booking[], total: number }> {
    const [bookings, total] = await bookingRepository.findAndCount({
      where: { ticket: { event: { id: eventId } } },
      relations: ['user', 'ticket'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    return { bookings, total };
  }
};