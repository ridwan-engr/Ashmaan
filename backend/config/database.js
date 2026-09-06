import dns from "dns";
import mongoose from "mongoose";
import env from "./env.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDatabase = async () => {
  try {
    if (!env.mongodbUri) {
      throw new Error("MONGODB_URI is not configured.");
    }

    const connection = await mongoose.connect(env.mongodbUri);

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);

    process.exit(1);
  }
};

export default connectDatabase;