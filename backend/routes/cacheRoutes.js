import express from "express";
import { authMiddleware as auth } from "../middleware/auth.js";
import { clearCache } from "../controllers/cacheController.js";

const router = express.Router();

// Clear cache endpoint (JWT protected)
router.post("/clear", auth, clearCache);

export default router;