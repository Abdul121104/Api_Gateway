import redis from 'redis';

let redisClient = null;

/**
 * Create and configure Redis client
 */
export function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = redis.createClient({
    url
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });

  return redisClient;
}

/**
 * Get Redis client instance
 */
export function getRedisClient() {
  if (!redisClient) {
    return createRedisClient();
  }
  return redisClient;
}

/**
 * Connect to Redis
 */
export async function connectRedis() {
  const client = getRedisClient();
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}