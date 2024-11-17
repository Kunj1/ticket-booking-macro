import Stripe from 'stripe';
import { AppError } from '../utils/AppError';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia', // Updated to the latest version
});

export const paymentService = {
  async createPaymentIntent(amount: number, currency: string): Promise<string> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
      });

      return paymentIntent.client_secret!;
    } catch (error) {
      throw new AppError('Failed to create payment intent', 500);
    }
  },

  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw new AppError('Failed to confirm payment', 500);
    }
  },

  async createRefund(paymentIntentId: string): Promise<void> {
    try {
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
      });
    } catch (error) {
      throw new AppError('Failed to create refund', 500);
    }
  },
};