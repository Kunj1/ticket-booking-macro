import { Router } from 'express';
import { bookingController } from '../controllers/bookingController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, bookingController.createBooking);
router.get('/user', authMiddleware, bookingController.getUserBookings);
router.get('/:id', authMiddleware, bookingController.getBooking);
router.post('/:id/cancel', authMiddleware, bookingController.cancelBooking);

export default router;