import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { configureRoutes } from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { AppDataSource } from './config/database';
import { notificationService } from './services/notificationService';
import { s3Client } from './config/aws';
import logger from './utils/logger';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images from S3
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  let s3Status = 'unknown'; // Declare the variable outside try/catch
  try {
    // Test S3 connection
    await s3Client.config.credentials();
    s3Status = 'connected';
  } catch (error) {
    logger.error('S3 connection test failed:', error);
    s3Status = 'error';
  }

  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: AppDataSource.isInitialized,
      notification: notificationService.isInitialized(),
      s3: s3Status
    }
  });
});

// Routes
configureRoutes(app);

// Error handling
app.use(errorHandler);

// Service initialization
async function initializeServices() {
  try {
    // Verify environment variables
    const requiredEnvVars = [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_S3_BUCKET_NAME'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Test S3 connection
    try {
      await s3Client.config.credentials();
      logger.info('AWS S3 connection verified successfully');
    } catch (error: unknown) {
      // Type guard to check if error is an Error object
      if (error instanceof Error) {
        throw new Error(`Failed to connect to AWS S3: ${error.message}`);
      } else {
        throw new Error('Failed to connect to AWS S3: Unknown error');
      }
    }

    // Connect to database
    await AppDataSource.initialize();
    logger.info('Database connected successfully');

    // Initialize notification service
    await notificationService.initialize();
    logger.info('Notification service initialized successfully');

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Service initialization failed:', error);
    process.exit(1);
  }
}

// Error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Start application
initializeServices().catch(error => {
  logger.error('Failed to start the application:', error);
  process.exit(1);
});

export default app;