import mongoose from "mongoose";
import Route from "../models/Route.js";

export const createRoute = async (req, res) => {
  try {
    const { pathPrefix, targetUrl, methods } = req.body;

    // Validation
    if (!pathPrefix || !targetUrl) {
      return res.status(400).json({ message: "pathPrefix and targetUrl are required" });
    }

    if (!pathPrefix.startsWith('/')) {
      return res.status(400).json({ message: "pathPrefix must start with /" });
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch (error) {
      return res.status(400).json({ message: "Invalid targetUrl format" });
    }

    const route = await Route.create({
      pathPrefix,
      targetUrl,
      methods: methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      owner: req.user.userId
    });

    res.status(201).json({
      routeId: route._id,
      pathPrefix: route.pathPrefix,
      targetUrl: route.targetUrl,
      methods: route.methods,
      isActive: route.isActive
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create route" });
  }
};

export const getRoutes = async (req, res) => {
  try {
    const routes = await Route.find({ owner: req.user.userId }).select('-__v');
    res.json(routes);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch routes" });
  }
};

export const deleteRoute = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Route not found" });
    }

    const route = await Route.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }

    await Route.deleteOne({ _id: route._id });

    res.json({ message: "Route deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete route" });
  }
};