import express from "express";
import apiKeyMiddleware from "../middleware/apiKey.js";
import rateLimiterMiddleware from "../middleware/rateLimiter.js";
import cacheMiddleware from "../middleware/cacheMiddleware.js";
import requestLoggerMiddleware from "../middleware/requestLogger.js";
import { findMatchingRoute } from "../services/routeMatchService.js";
import { forwardRequest } from "../services/proxyService.js";

const router = express.Router();

/**
 * Catch-all gateway proxy route
 * This handles ALL requests to the gateway (except routes defined before this)
 * Protected by API key middleware, rate limiting, caching, and logging
 */
router.use(apiKeyMiddleware);
router.use(rateLimiterMiddleware);
router.use(cacheMiddleware);
router.use(requestLoggerMiddleware);
router.use(async (req, res, next) => {
  try {
    const requestPath = req.path;

    // Find matching route
    const match = await findMatchingRoute(requestPath);

    if (!match) {
      return res.status(404).json({ message: "Route not found" });
    }

    const { route, remainingPath } = match;

    // Store matched route for logging
    req.matchedRoute = route;

    // Forward the request
    await forwardRequest(route, remainingPath, req, res);

  } catch (error) {
    console.error('Gateway proxy error:', error);
    res.status(500).json({ message: "Internal gateway error" });
  }
});

export default router;