import { Channel } from 'amqplib';
import nodemailer from 'nodemailer';
import { connectRabbitMQ } from '../config/rabbitmq';
import logger from '../utils/logger';
import { AppError } from '../utils/AppError';
import { EmailOptions , NotificationType , TemplatedEmailData , NotificationPayload } from '../types/notification';

export interface EmailContent {
  subject: string;
  text: string;
  html?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private channel: Channel | null = null;
  private emailTransport: nodemailer.Transporter;
  private initialized = false;

  private constructor() {
    this.emailTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Verify email transport
      await this.emailTransport.verify();
      logger.info('Email transport verified');

      // Setup RabbitMQ connection
      const channelConnection = await connectRabbitMQ();
      if (!channelConnection) {
        throw new AppError('Failed to connect to RabbitMQ', 500);
      }
      this.channel = channelConnection;

      // Setup queues and exchanges
      await this.setupQueues();
      
      // Start processing messages
      await this.startProcessing();
      
      this.initialized = true;
      logger.info('Notification service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  private async setupQueues(): Promise<void> {
    if (!this.channel) return;

    // Setup dead letter exchange
    await this.channel.assertExchange('notification_dlx', 'direct', { durable: true });
    await this.channel.assertQueue('notification_dlq', { durable: true });
    await this.channel.bindQueue('notification_dlq', 'notification_dlx', 'notification_routing_key');

    // Setup main notification queue
    await this.channel.assertQueue('notification_queue', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'notification_dlx',
        'x-dead-letter-routing-key': 'notification_routing_key',
        'x-message-ttl': 86400000 // 24 hours
      }
    });
  }

  public async sendNotification(payload: NotificationPayload): Promise<void> {
    if (!this.initialized) {
      throw new AppError('Notification service not initialized', 500);
    }

    if (!this.channel) {
      throw new AppError('RabbitMQ channel not available', 500);
    }

    const message = Buffer.from(JSON.stringify(payload));
    this.channel.sendToQueue('notification_queue', message, {
      persistent: true,
      headers: {
        'x-retry-count': 0
      }
    });

    logger.info(`Notification queued: ${payload.type} to ${payload.recipient}`);
  }

  private async startProcessing(): Promise<void> {
    if (!this.channel) return;
  
    this.channel.consume('notification_queue', async (msg) => {
      if (!msg) return;
  
      try {
        const payload = JSON.parse(msg.content.toString()) as NotificationPayload;
        await this.processNotification(payload);
        this.channel?.ack(msg);
        logger.info(`Successfully processed ${payload.type} notification for ${payload.recipient}`);
      } catch (err) {
        // Type guard for Error object
        const error = err as Error;
        const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) as number;
        
        if (retryCount < 3) {
          // Acknowledge the original message
          this.channel?.ack(msg);
          
          // Republish with incremented retry count after delay
          setTimeout(() => {
            this.channel?.publish('', 'notification_queue', msg.content, {
              persistent: true,
              headers: {
                'x-retry-count': retryCount + 1,
                'x-last-error': error.message || 'Unknown error'
              }
            });
          }, Math.pow(2, retryCount) * 1000);
          
          logger.warn(`Retrying ${retryCount + 1}/3 for notification`, {
            recipient: JSON.parse(msg.content.toString()).recipient,
            retryCount: retryCount + 1,
            error: error.message || 'Unknown error'
          });
        } else {
          // After max retries, acknowledge the message and send to dead letter queue
          this.channel?.ack(msg);
          
          // Publish to dead letter exchange
          this.channel?.publish('notification_dlx', 'notification_routing_key', msg.content, {
            persistent: true,
            headers: {
              'x-retry-count': retryCount,
              'x-last-error': error.message || 'Unknown error'
            }
          });
          
          logger.error('Notification failed after max retries', {
            error: error.message || 'Unknown error',
            payload: JSON.parse(msg.content.toString()),
            retryCount
          });
        }
      }
    }, { noAck: false });
  }

  private async processNotification(payload: NotificationPayload): Promise<void> {
    switch (payload.type) {
      case 'email':
        if (payload.template) {
          // Handle templated email
          const emailContent = this.getEmailTemplate(payload.template, payload.data);
          await this.sendEmail(payload.recipient, emailContent);
        } else if (payload.emailOptions) {
          // Handle direct email
          await this.sendEmail(payload.recipient, payload.emailOptions);
        } else {
          throw new AppError('Either template or emailOptions must be provided for email notifications', 400);
        }
        break;
      case 'sms':
        await this.sendSMS(payload.recipient, payload.data!.message);
        break;
      case 'push':
        await this.sendPushNotification(payload.recipient, payload.data);
        break;
      default:
        throw new AppError(`Unknown notification type: ${payload.type}`, 400);
    }
  }

  private async sendEmail(to: string, options: EmailOptions): Promise<void> {
    if (!this.initialized) {
      throw new AppError('Notification service not initialized', 500);
    }

    try {
      await this.emailTransport.sendMail({
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to,
        ...options,
        headers: {
          'X-Application-Name': 'MACRO'
        }
      });
      logger.info(`Email sent successfully to ${to}`);
    } catch (error) {
      logger.error('Failed to send email', { error, to });
      throw error;
    }
  }

  private async sendSMS(to: string, message: string): Promise<void> {
    // Implement SMS provider integration
    logger.info(`SMS sent to ${to}: ${message}`);
  }

  private async sendPushNotification(recipient: string, data: any): Promise<void> {
    // Implement push notification provider integration
    logger.info(`Push notification sent to ${recipient}`);
  }

  private getEmailTemplate(template: string, data: any): EmailContent {
    switch (template) {
      case 'booking_confirmation':
        return {
          subject: 'MACRO Booking Confirmation',
          text: `Thank you for your booking! Reference: ${data.bookingRef}`,
          html: `
            <h2>Booking Confirmation for MACRO</h2>
            <p>Thank you for your booking!</p>
            <p>Booking Reference: <strong>${data.bookingRef}</strong></p>
            <p>Event: ${data.eventName}</p>
            <p>Date: ${data.eventDate}</p>
            <p>Tickets: ${data.ticketCount}</p>
            <br>
            <p>Best regards,</p>
            <p><strong>Syntalix</strong></p>
          `
        };
      case 'welcome_email':
        return {
          subject: 'Welcome to MACRO',
          text: `Welcome ${data.name}! Thank you for joining us.`,
          html: `
            <h2>Welcome to MACRO</h2>
            <p>Hello ${data.name}!</p>
            <p>Thank you for creating an account with us. We're excited to have you on board.</p>
            <p>You can now start browsing and booking tickets for your favorite events.</p>
            <br>
            <p>Best regards,</p>
            <p><strong>Syntalix</strong></p>
          `
        };
      default:
        throw new AppError(`Email template '${template}' not found`, 400);
    }
  }
}

export const notificationService = NotificationService.getInstance();