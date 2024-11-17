import { S3Client } from '@aws-sdk/client-s3';
import { AppError } from '../utils/AppError';

// Check for required environment variables
const requiredEnvVars = {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
};

// In development, allow missing credentials with a warning
if (process.env.NODE_ENV === 'development') {
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
    
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing AWS credentials: ${missingVars.join(', ')}`);
  }
}
// In production, throw error if credentials are missing
else if (Object.values(requiredEnvVars).some(value => !value)) {
  throw new AppError('Missing AWS credentials in environment variables', 500);
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1', // Provide a default region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy-key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy-secret'
  }
});