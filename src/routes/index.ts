import { Express } from 'express';
import authRoutes from './auth';
import eventRoutes from './events';
import bookingRoutes from './bookings';
import ticketRoutes from './tickets';
import userRoutes from './users';

export function configureRoutes(app: Express) {
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/users', userRoutes);
}