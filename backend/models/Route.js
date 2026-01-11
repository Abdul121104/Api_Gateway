import mongoose from "mongoose";

const routeSchema = new mongoose.Schema({
  pathPrefix: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return v.startsWith('/');
      },
      message: 'pathPrefix must start with /'
    }
  },
  targetUrl: {
    type: String,
    required: true,
    trim: true
  },
  methods: {
    type: [String],
    default: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient route matching
routeSchema.index({ pathPrefix: 1, isActive: 1 });
routeSchema.index({ owner: 1 });

export default mongoose.model("Route", routeSchema);