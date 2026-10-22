
import dns from "dns";
import mongoose from "mongoose";
import env from "./env.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDatabase = async () => {
  try {
    const testMode = process.env.L3E_TEST_MODE === "true";
    const testUri = process.env.L3E_TEST_MONGODB_URI;

    if (testMode) {
      if (
        !testUri ||
        !/^mongodb:\/\/(127\.0\.0\.1|localhost):27017\/ashmaan_l3e_test(?:\?|$)/.test(
          testUri
        )
      ) {
        throw new Error(
          "L3E test mode requires the isolated local ashmaan_l3e_test database."
        );
      }
    }

    const uri = testMode ? testUri : env.mongodbUri;

    if (!uri) {
      throw new Error("MONGODB_URI is not configured.");
    }

    const connection = await mongoose.connect(uri, {
      autoIndex: env.nodeEnv !== "production",
      serverSelectionTimeoutMS: testMode ? 5000 : 30000,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );

    if (testMode) {
      console.log(
        `Isolated test database: ${connection.connection.name}`
      );
    }
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);
    throw error;
  }
};

export default connectDatabase;
