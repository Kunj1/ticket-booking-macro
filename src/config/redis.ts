import Redis from 'ioredis';

let reconnectAttempts = 0;

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    reconnectAttempts = times;
    return Math.min(times * 1000, 30000);
  },
});

redisClient.on('error', (error) => {
  console.error('Redis error:', error);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
  reconnectAttempts = 0;
});

export default redisClient;