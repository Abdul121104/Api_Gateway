import mongoose from "mongoose";
import ApiClient from "../models/ApiClient.js";
import generateApiKey from "../utils/generateApiKey.js";
import { hashApiKey } from "../services/apiKeyService.js";

export const createClient = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Client name required" });
    }

    const apiKey = generateApiKey();
    const hashedKey = hashApiKey(apiKey);

    const client = await ApiClient.create({
      name,
      hashedKey,
      owner: req.user.userId
    });

    res.status(201).json({
      clientId: client._id,
      apiKey // ⚠️ shown ONLY once
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create API client" });
  }
};

export const getClients = async (req, res) => {
  const clients = await ApiClient.find({ owner: req.user.userId }).select(
    "-hashedKey"
  );
  res.json(clients);
};

export const revokeClient = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Client not found" });
    }

    const client = await ApiClient.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    client.isActive = false;
    await client.save();

    res.json({ message: "API key revoked" });
  } catch (err) {
    res.status(500).json({ message: "Failed to revoke API client" });
  }
};
