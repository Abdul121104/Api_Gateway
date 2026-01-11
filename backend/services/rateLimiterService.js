import { getRedisClient } from '../config/redis.js';

const DEFAULT_LIMIT = 100; // requests per minute
const WINDOW_SIZE = 60; // seconds (1 minute)

/**
 * Sliding window rate limiter using Redis sorted sets
 * @param {string} key - The identifier (API key in our case)
 * @param {number} limit - Maximum requests allowed in the window
 * @param {number} windowSeconds - Window size in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
 */
export async function checkRateLimit(key, limit = DEFAULT_LIMIT, windowSeconds = WINDOW_SIZE) {
  try {
    const client = getRedisClient();
    
    if (!client.isOpen) {
      await client.connect();
    }

    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    // Redis key for this identifier
    const redisKey = `ratelimit:${key}`;
    
    // Remove entries outside the window (older than windowStart)
    await client.zRemRangeByScore(redisKey, 0, windowStart);
    
    // Count requests in the current window
    const currentCount = await client.zCard(redisKey);
    
    if (currentCount >= limit) {
      // Rate limit exceeded
      // Get the oldest request in the window to calculate reset time
      const oldestRequests = await client.zRange(redisKey, 0, 0, { REV: false });
      let resetTime = now + (windowSeconds * 1000);
      
      if (oldestRequests.length > 0) {
        const oldestTimestamp = parseInt(oldestRequests[0]);
        resetTime = oldestTimestamp + (windowSeconds * 1000);
      }
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil((resetTime - now) / 1000) // seconds until reset
      };
    }
    
    // Add current request to the sorted set
    // Use timestamp as score and a unique value
    await client.zAdd(redisKey, {
      score: now,
      value: `${now}-${Math.random()}`
    });
    
    // Set expiry on the key (window size + 1 second buffer)
    await client.expire(redisKey, windowSeconds + 1);
    
    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetTime: windowSeconds
    };
    
  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: limit,
      resetTime: windowSeconds
    };
  }
}