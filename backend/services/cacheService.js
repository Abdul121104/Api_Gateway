import { getRedisClient } from '../config/redis.js';

const DEFAULT_TTL = 60; // seconds

/**
 * Generate cache key from request method, path, and query string
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {string} queryString - Query string (without ?)
 * @returns {string} Cache key
 */
export function generateCacheKey(method, path, queryString = '') {
  const query = queryString ? `?${queryString}` : '';
  return `cache:${method}:${path}${query}`;
}

/**
 * Get cached response
 * @param {string} key - Cache key
 * @returns {Promise<{body: any, status: number}|null>}
 */
export async function getCachedResponse(key) {
  try {
    const client = getRedisClient();
    
    if (!client.isOpen) {
      await client.connect();
    }

    const cached = await client.get(key);
    
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached);
    return {
      body: parsed.body,
      status: parsed.status
    };
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Store response in cache
 * @param {string} key - Cache key
 * @param {any} body - Response body
 * @param {number} status - HTTP status code
 * @param {number} ttl - Time to live in seconds
 */
export async function setCachedResponse(key, body, status, ttl = DEFAULT_TTL) {
  try {
    const client = getRedisClient();
    
    if (!client.isOpen) {
      await client.connect();
    }

    const value = JSON.stringify({
      body,
      status
    });

    await client.setEx(key, ttl, value);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete cached response
 * @param {string} key - Cache key
 */
export async function deleteCachedResponse(key) {
  try {
    const client = getRedisClient();
    
    if (!client.isOpen) {
      await client.connect();
    }

    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Clear cache by prefix
 * @param {string} prefix - Cache key prefix (e.g., "cache:GET:/users")
 * @returns {Promise<number>} Number of keys deleted
 */
export async function clearCacheByPrefix(prefix) {
  try {
    const client = getRedisClient();
    
    if (!client.isOpen) {
      await client.connect();
    }

    // Use SCAN iterator to find all keys matching the prefix
    const keys = [];
    for await (const key of client.scanIterator({
      MATCH: `${prefix}*`,
      COUNT: 100
    })) {
      keys.push(key);
    }

    if (keys.length === 0) {
      return 0;
    }

    // Delete all matching keys
    if (keys.length > 0) {
        await client.del(...keys);
      }
      
    
    return keys.length;
  } catch (error) {
    console.error('Cache clear error:', error);
    return 0;
  }
}

/**
 * Invalidate cache for a path (all methods)
 * @param {string} path - Request path (without query string)
 */
export async function invalidateCacheForPath(path) {
  try {
    const client = getRedisClient();
    
    if (!client.isOpen) {
      await client.connect();
    }

    // Use SCAN iterator to find all cache keys for this path (any method)
    const keys = [];
    for await (const key of client.scanIterator({
      MATCH: `cache:*:${path}*`,
      COUNT: 100
    })) {
      keys.push(key);
    }

    if (keys.length > 0) {
        await client.del(...keys);
      }
      
    
    return keys.length;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return 0;
  }
}