import dns from 'node:dns';
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

try {
  const email = process.env.ASHMAAN_RESET_EMAIL?.trim().toLowerCase();
  const password = process.env.ASHMAAN_RESET_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error("Email or password is missing; password must be at least 12 characters.");
  }

  dns.setServers(["1.1.1.1", "8.8.8.8"]);
  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Account not found. No account was changed.");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Account is not ACTIVE. No password was changed.");
  }

  user.passwordHash = await User.hashPassword(password);
  await user.save();

  console.log("PASS: Password hash updated using the application User model.");
  console.log("PASS: Account remains ACTIVE.");
} catch (error) {
  console.error("RESET FAILED:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}


