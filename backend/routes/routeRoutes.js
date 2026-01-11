import express from "express";
import { authMiddleware as auth } from "../middleware/auth.js";
import {
  createRoute,
  getRoutes,
  deleteRoute
} from "../controllers/routeController.js";

const router = express.Router();

router.post("/", auth, createRoute);
router.get("/", auth, getRoutes);
router.delete("/:id", auth, deleteRoute);

export default router;