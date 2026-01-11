import { checkRateLimit } from '../services/rateLimiterService.js';

const DEFAULT_LIMIT = 5; // requests per minute (for Day 5 test)

/**
 * Rate limiter middleware
 * Should be used after apiKeyMiddleware to get req.apiClient
 */
export default async function rateLimiterMiddleware(req, res, next) {
  try {
    // Get API key from the client (set by apiKeyMiddleware)
    const apiClient = req.apiClient;
    
    if (!apiClient) {
      // If no API client, skip rate limiting (shouldn't happen if middleware order is correct)
      return next();
    }
    
    // Use API client ID as the rate limit key
    const rateLimitKey = apiClient._id.toString();
    
    // Check rate limit (100 requests per minute by default)
    const result = await checkRateLimit(rateLimitKey, DEFAULT_LIMIT, 60);
    
    if (!result.allowed) {
      // Rate limit exceeded
      res.setHeader('Retry-After', result.resetTime.toString());
      return res.status(429).json({
        message: 'Rate limit exceeded'
      });
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', DEFAULT_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.resetTime * 1000).toISOString());
    
    next();
    
  } catch (error) {
    console.error('Rate limiter middleware error:', error);
    // On error, allow the request (fail open)
    next();
  }
}