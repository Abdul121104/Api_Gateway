import { enqueueLog } from '../queues/logQueue.js';

/**
 * Request logger middleware
 * Captures request/response data and enqueues it for async processing
 * Non-blocking - errors in logging won't affect the response
 */
export default function requestLoggerMiddleware(req, res, next) {
  const startTime = Date.now();

  // Capture response finish
  res.on('finish', () => {
    try {
      const responseTime = Date.now() - startTime;
      
      // Extract data from request
      const logData = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
        userAgent: req.headers['user-agent'],
      };

      // Extract API client info (set by apiKeyMiddleware)
      if (req.apiClient) {
        logData.clientId = req.apiClient._id?.toString();
        // Optionally store API key hash prefix (first 8 chars) for debugging
        // logData.apiKey = req.apiClient.hashedKey?.substring(0, 8);
      }

      // Extract route info (set by proxy route if matched)
      if (req.matchedRoute) {
        logData.routeId = req.matchedRoute._id?.toString();
      }

      // Enqueue log job (non-blocking)
      // This will not block the response even if it fails
      enqueueLog(logData).catch(err => {
        // Fail silently - logging should never affect the gateway
        console.error('Failed to enqueue log (non-critical):', err.message);
      });

    } catch (error) {
      // Fail silently - logging errors must not affect response
      console.error('Error in request logger (non-critical):', error.message);
    }
  });

  // Continue to next middleware
  next();
}