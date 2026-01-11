import Route from "../models/Route.js";

/**
 * Find the best matching route for a given path
 * Uses longest prefix matching
 * @param {string} requestPath - The incoming request path
 * @returns {Promise<Object|null>} - The matched route and remaining path, or null
 */
export async function findMatchingRoute(requestPath) {
  try {
    // Get all active routes, sorted by pathPrefix length (longest first)
    const routes = await Route.find({ isActive: true })
      .sort({ pathPrefix: -1 }); // Sort by length descending would be better, but this is a simple approach

    // Manual sort by pathPrefix length (longest first) for proper longest prefix match
    const sortedRoutes = routes.sort((a, b) => {
      return b.pathPrefix.length - a.pathPrefix.length;
    });

    // Find the first route where the pathPrefix matches the beginning of requestPath
    for (const route of sortedRoutes) {
      const prefix = route.pathPrefix;
      
      // Exact match
      if (requestPath === prefix) {
        return {
          route,
          remainingPath: requestPath  // Forward the full request path
        };
      }
      
      // Prefix match (requestPath starts with prefix/)
      if (requestPath.startsWith(prefix + '/')) {
        return {
          route,
          remainingPath: requestPath  // Forward the full request path
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding matching route:', error);
    return null;
  }
}