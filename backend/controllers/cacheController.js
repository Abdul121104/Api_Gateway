import { clearCacheByPrefix } from '../services/cacheService.js';
import { authMiddleware } from '../middleware/auth.js';

/**
 * Clear cache by prefix
 * POST /api/cache/clear
 * Body: { prefix: "cache:GET:/users" }
 */
export const clearCache = async (req, res) => {
  try {
    const { prefix } = req.body;

    if (!prefix) {
      return res.status(400).json({ message: "prefix is required" });
    }

    const deletedCount = await clearCacheByPrefix(prefix);

    res.json({
      message: "Cache cleared successfully",
      prefix,
      deletedKeys: deletedCount
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ message: "Failed to clear cache" });
  }
};