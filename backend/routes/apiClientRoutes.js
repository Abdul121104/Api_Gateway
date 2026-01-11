import express from "express";
import { authMiddleware as auth } from "../middleware/auth.js";
import {
  createClient,
  getClients,
  revokeClient
} from "../controllers/apiClientController.js";

const router = express.Router();

router.post("/", auth, createClient);
router.get("/", auth, getClients);
router.delete("/:id", auth, revokeClient);

export default router;

