// config/db.js
import mongoose from "mongoose";
import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI);

    console.log(
      `MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1); // exit app if DB fails
  }
};
