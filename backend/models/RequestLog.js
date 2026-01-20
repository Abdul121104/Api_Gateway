import mongoose from "mongoose";

const requestLogSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
  },
  path: {
    type: String,
    required: true
  },
  statusCode: {
    type: Number,
    required: true
  },
  responseTime: {
    type: Number,
    required: true // in milliseconds
  },
  apiKey: {
    type: String,
    required: false,
    select: false // Don't expose API keys by default
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ApiClient",
    required: false
  },
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Route",
    required: false
  },
  ip: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
requestLogSchema.index({ createdAt: -1 });
requestLogSchema.index({ clientId: 1, createdAt: -1 });
requestLogSchema.index({ routeId: 1, createdAt: -1 });
requestLogSchema.index({ statusCode: 1, createdAt: -1 });

export default mongoose.model("RequestLog", requestLogSchema);