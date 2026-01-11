import mongoose from "mongoose";

const apiClientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  hashedKey: {
    type: String,
    required: true,
    unique: true,
    index: true
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

export default mongoose.model("ApiClient", apiClientSchema);