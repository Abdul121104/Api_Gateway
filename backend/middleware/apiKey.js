import ApiClient from "../models/ApiClient.js";
import { hashApiKey } from "../services/apiKeyService.js";

export default async function apiKeyMiddleware(req, res, next) {
  try {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
      return res.status(401).json({ message: "API key missing" });
    }

    const hashedKey = hashApiKey(apiKey);

    const client = await ApiClient.findOne({ hashedKey });

    if (!client) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    if (!client.isActive) {
      return res.status(403).json({ message: "API key revoked" });
    }

    req.apiClient = client;
    next();
  } catch (err) {
    res.status(500).json({ message: "API key validation failed" });
  }
};
