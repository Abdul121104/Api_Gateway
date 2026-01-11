import express from "express";
import { connectDB } from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { ENV } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import apiClientRoutes from "./routes/apiClientRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import cacheRoutes from "./routes/cacheRoutes.js";
import gatewayProxy from "./routes/gatewayProxy.js";

const app = express();

// parse JSON
app.use(express.json());

// Health check (before gateway proxy)
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// API routes (before gateway proxy)
app.use("/auth", authRoutes);
app.use("/api/clients", apiClientRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/cache", cacheRoutes);

// Gateway proxy (catch-all - must be last)
app.use("/", gatewayProxy);


const startServer = async () => {
  await connectDB();
  await connectRedis();
  app.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT}`);
  });
};

startServer();
