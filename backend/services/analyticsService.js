import mongoose from "mongoose";
import RequestLog from "../models/RequestLog.js";
import ApiClient from "../models/ApiClient.js";
import Route from "../models/Route.js";

/**
 * Get default time window (last 24 hours)
 */
function getDefaultTimeWindow() {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  return { from, to };
}

/**
 * Parse and validate time window from query params
 */
export function parseTimeWindow(query) {
  const now = new Date();
  let from, to;

  if (query.from) {
    from = new Date(parseInt(query.from));
    if (isNaN(from.getTime())) {
      throw new Error("Invalid 'from' timestamp");
    }
  } else {
    // Default: 24 hours ago
    from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  if (query.to) {
    to = new Date(parseInt(query.to));
    if (isNaN(to.getTime())) {
      throw new Error("Invalid 'to' timestamp");
    }
  } else {
    to = now;
  }

  if (from > to) {
    throw new Error("'from' must be before 'to'");
  }

  return { from, to };
}

/**
 * Get user's client IDs and route IDs for filtering
 */
async function getUserResources(userId) {
  const [clients, routes] = await Promise.all([
    ApiClient.find({ owner: userId }).select("_id"),
    Route.find({ owner: userId }).select("_id")
  ]);

  return {
    clientIds: clients.map(c => c._id),
    routeIds: routes.map(r => r._id)
  };
}

/**
 * Get analytics overview
 */
export async function getOverview(userId, timeWindow) {
  const { from, to } = timeWindow;
  const { clientIds } = await getUserResources(userId);

  // Filter: user's clients only, within time window
  const matchStage = {
    clientId: { $in: clientIds },
    createdAt: { $gte: from, $lte: to }
  };

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalResponseTime: { $sum: "$responseTime" },
        errorCount: {
          $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] }
        },
        rateLimitCount: {
          $sum: { $cond: [{ $eq: ["$statusCode", 429] }, 1, 0] }
        },
        minCreatedAt: { $min: "$createdAt" },
        maxCreatedAt: { $max: "$createdAt" }
      }
    },
    {
      $project: {
        _id: 0,
        totalRequests: 1,
        avgResponseTime: {
          $cond: [
            { $eq: ["$totalRequests", 0] },
            0,
            { $divide: ["$totalResponseTime", "$totalRequests"] }
          ]
        },
        errorRate: {
          $cond: [
            { $eq: ["$totalRequests", 0] },
            0,
            {
              $multiply: [
                { $divide: ["$errorCount", "$totalRequests"] },
                100
              ]
            }
          ]
        },
        rateLimitCount: 1,
        timeWindow: {
          from: "$minCreatedAt",
          to: "$maxCreatedAt"
        }
      }
    }
  ];

  const result = await RequestLog.aggregate(pipeline);
  const overview = result[0] || {
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    rateLimitCount: 0,
    timeWindow: { from, to }
  };

  // Calculate requests per minute
  const timeDiffMs = to.getTime() - from.getTime();
  const timeDiffMinutes = timeDiffMs / (1000 * 60);
  overview.requestsPerMinute =
    timeDiffMinutes > 0 ? overview.totalRequests / timeDiffMinutes : 0;

  return {
    ...overview,
    timeWindow: { from, to }
  };
}

/**
 * Get analytics by route
 */
export async function getRouteAnalytics(userId, timeWindow) {
  const { from, to } = timeWindow;
  const { routeIds } = await getUserResources(userId);

  if (routeIds.length === 0) {
    return [];
  }

  // Lookup route information
  const pipeline = [
    {
      $match: {
        routeId: { $in: routeIds },
        createdAt: { $gte: from, $lte: to }
      }
    },
    {
      $lookup: {
        from: "routes",
        localField: "routeId",
        foreignField: "_id",
        as: "route"
      }
    },
    { $unwind: { path: "$route", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$routeId",
        path: { $first: "$route.pathPrefix" },
        totalRequests: { $sum: 1 },
        totalResponseTime: { $sum: "$responseTime" },
        errorCount: {
          $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        routeId: "$_id",
        path: { $ifNull: ["$path", "Unknown"] },
        totalRequests: 1,
        avgResponseTime: {
          $cond: [
            { $eq: ["$totalRequests", 0] },
            0,
            { $divide: ["$totalResponseTime", "$totalRequests"] }
          ]
        },
        errorRate: {
          $cond: [
            { $eq: ["$totalRequests", 0] },
            0,
            {
              $multiply: [
                { $divide: ["$errorCount", "$totalRequests"] },
                100
              ]
            }
          ]
        }
      }
    },
    { $sort: { totalRequests: -1 } }
  ];

  return await RequestLog.aggregate(pipeline);
}

/**
 * Get analytics by client
 */
export async function getClientAnalytics(userId, timeWindow) {
  const { from, to } = timeWindow;
  const { clientIds } = await getUserResources(userId);

  if (clientIds.length === 0) {
    return [];
  }

  // Lookup client information
  const pipeline = [
    {
      $match: {
        clientId: { $in: clientIds },
        createdAt: { $gte: from, $lte: to }
      }
    },
    {
      $lookup: {
        from: "apiclients",
        localField: "clientId",
        foreignField: "_id",
        as: "client"
      }
    },
    { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$clientId",
        totalRequests: { $sum: 1 },
        errorCount: {
          $sum: { $cond: [{ $gte: ["$statusCode", 400] }, 1, 0] }
        },
        lastRequestAt: { $max: "$createdAt" }
      }
    },
    {
      $project: {
        _id: 0,
        clientId: "$_id",
        totalRequests: 1,
        errorRate: {
          $cond: [
            { $eq: ["$totalRequests", 0] },
            0,
            {
              $multiply: [
                { $divide: ["$errorCount", "$totalRequests"] },
                100
              ]
            }
          ]
        },
        lastRequestAt: 1
      }
    },
    { $sort: { totalRequests: -1 } }
  ];

  return await RequestLog.aggregate(pipeline);
}
