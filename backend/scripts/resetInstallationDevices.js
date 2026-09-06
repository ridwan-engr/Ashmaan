import mongoose from "mongoose";

import connectDatabase from "../config/database.js";

import {
  Device,
  Installation,
} from "../models/index.js";


const run = async () => {
  try {
    await connectDatabase();

    const installation =
      await Installation.findOne({
        vrmSiteId: "243097",
      });

    if (!installation) {
      throw new Error(
        "Installation 243097 was not found."
      );
    }

    const result =
      await Device.deleteMany({
        installation:
          installation._id,
      });

    console.log(
      `Deleted ${result.deletedCount} device records for installation 243097.`
    );

    await mongoose.connection.close();
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};


run();