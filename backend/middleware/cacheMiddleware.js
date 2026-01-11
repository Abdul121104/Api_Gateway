import { generateCacheKey, getCachedResponse, setCachedResponse, invalidateCacheForPath } from '../services/cacheService.js';

const DEFAULT_TTL = 60; // seconds

export default function cacheMiddleware(req, res, next) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const cacheKey = req.path;
      invalidateCacheForPath(cacheKey).catch(err => {
        console.error('Cache invalidation error:', err);
      });
      res.setHeader('X-Cache', 'BYPASS');
    }
    return next();
  }

  // Generate cache key
  const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
  const cacheKey = generateCacheKey(req.method, req.path, queryString);

  getCachedResponse(cacheKey)
    .then(cached => {
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.status(cached.status);
        res.send(cached.body);
        return;
      }

      // ✅ FIX: mark MISS immediately
      res.setHeader('X-Cache', 'MISS');

      // Store original functions
      const originalSend = res.send.bind(res);
      const originalStatus = res.status.bind(res);

      let responseBody = null;
      let responseStatus = 200;

      res.status = function (code) {
        responseStatus = code;
        return originalStatus(code);
      };

      res.send = async function (body) {
        responseBody = body;

        // Call original send
        originalSend(body);

        // Cache successful responses only
        if (responseStatus < 400) {
          try {
            await setCachedResponse(cacheKey, responseBody, responseStatus, DEFAULT_TTL);
          } catch (error) {
            console.error('Cache store error:', error);
          }
        }
      };

      next();
    })
    .catch(error => {
      console.error('Cache lookup error:', error);
      next();
    });
}
