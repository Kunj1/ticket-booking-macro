import { Router } from 'express';
import { ticketController } from '../controllers/ticketController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Public routes
router.get('/', ticketController.getTickets);
router.get('/:id', ticketController.getTicket);
router.get('/event/:eventId', ticketController.getTicketsForEvent);
router.get('/available/:eventId', ticketController.getAvailableTickets);
router.get('/availability/:eventId/:ticketType', ticketController.checkTicketAvailability);

// Protected routes (require authentication)
router.post('/', authMiddleware, ticketController.createTicket);
router.put('/:id', authMiddleware, ticketController.updateTicket);
router.delete('/:id', authMiddleware, ticketController.deleteTicket);
router.post('/:ticketId/reserve', authMiddleware, ticketController.reserveTicket);
router.post('/:ticketId/release', authMiddleware, ticketController.releaseTicket);

export default router;