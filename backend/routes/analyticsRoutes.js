import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getOverviewAnalytics,
  getRouteAnalyticsController,
  getClientAnalyticsController
} from "../controllers/analyticsController.js";

const router = express.Router();

// All routes require JWT authentication
router.use(authMiddleware);

/**
 * GET /api/analytics/overview
 * Get overview analytics (total requests, avg response time, error rate, etc.)
 * Query params: ?from=<timestamp>&to=<timestamp>
 * Default: last 24 hours
 */
router.get("/overview", getOverviewAnalytics);

/**
 * GET /api/analytics/routes
 * Get analytics grouped by route
 * Query params: ?from=<timestamp>&to=<timestamp>
 * Default: last 24 hours
 */
router.get("/routes", getRouteAnalyticsController);

/**
 * GET /api/analytics/clients
 * Get analytics grouped by client
 * Query params: ?from=<timestamp>&to=<timestamp>
 * Default: last 24 hours
 */
router.get("/clients", getClientAnalyticsController);

export default router;
