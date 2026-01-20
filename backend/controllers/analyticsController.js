import {
  parseTimeWindow,
  getOverview,
  getRouteAnalytics,
  getClientAnalytics
} from "../services/analyticsService.js";

/**
 * GET /api/analytics/overview
 * Get overview analytics
 */
export const getOverviewAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const timeWindow = parseTimeWindow(req.query);

    const overview = await getOverview(userId, timeWindow);

    res.json(overview);
  } catch (error) {
    if (error.message.includes("Invalid") || error.message.includes("must be")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error getting overview analytics:", error);
    res.status(500).json({ message: "Failed to get overview analytics" });
  }
};

/**
 * GET /api/analytics/routes
 * Get analytics grouped by route
 */
export const getRouteAnalyticsController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const timeWindow = parseTimeWindow(req.query);

    const routes = await getRouteAnalytics(userId, timeWindow);

    res.json({
      routes,
      timeWindow
    });
  } catch (error) {
    if (error.message.includes("Invalid") || error.message.includes("must be")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error getting route analytics:", error);
    res.status(500).json({ message: "Failed to get route analytics" });
  }
};

/**
 * GET /api/analytics/clients
 * Get analytics grouped by client
 */
export const getClientAnalyticsController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const timeWindow = parseTimeWindow(req.query);

    const clients = await getClientAnalytics(userId, timeWindow);

    res.json({
      clients,
      timeWindow
    });
  } catch (error) {
    if (error.message.includes("Invalid") || error.message.includes("must be")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error getting client analytics:", error);
    res.status(500).json({ message: "Failed to get client analytics" });
  }
};
