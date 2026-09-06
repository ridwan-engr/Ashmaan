import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";

import Device from "../models/Device.js";

dotenv.config();

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const scoreDevice = (device) => {
  let score = 0;

  const usefulFields = [
    "vrmDeviceId",
    "name",
    "productName",
    "productId",
    "firmwareVersion",
    "serialNumber",
    "lastSeenAt",
    "site",
  ];

  for (const field of usefulFields) {
    if (
      device[field] !== null &&
      device[field] !== undefined &&
      device[field] !== ""
    ) {
      score += 1;
    }
  }

  if (
    device.raw &&
    typeof device.raw === "object" &&
    Object.keys(device.raw).length
  ) {
    score += 2;
  }

  return score;
};

const pickCanonicalDevice = (
  devices
) => {
  return [...devices].sort(
    (a, b) => {
      const scoreDifference =
        scoreDevice(b) -
        scoreDevice(a);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const bUpdated =
        new Date(
          b.updatedAt || 0
        ).getTime();

      const aUpdated =
        new Date(
          a.updatedAt || 0
        ).getTime();

      return bUpdated - aUpdated;
    }
  )[0];
};

const mergeMissingFields = (
  canonical,
  duplicates
) => {
  const fields = [
    "site",
    "vrmDeviceId",
    "name",
    "productName",
    "productId",
    "firmwareVersion",
    "serialNumber",
    "status",
    "lastSeenAt",
    "source",
    "raw",
  ];

  const update = {};

  for (const field of fields) {
    const currentValue =
      canonical[field];

    const missing =
      currentValue === null ||
      currentValue === undefined ||
      currentValue === "";

    if (!missing) {
      continue;
    }

    const donor =
      duplicates.find(
        (device) =>
          device[field] !== null &&
          device[field] !== undefined &&
          device[field] !== ""
      );

    if (donor) {
      update[field] =
        donor[field];
    }
  }

  return update;
};

const run = async () => {
  let backupCollectionName;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing."
      );
    }

    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log(
      "MongoDB connected."
    );

    /*
     * ====================================
     * 1. BACKUP CURRENT DEVICE COLLECTION
     * ====================================
     */

    const timestamp =
      new Date()
        .toISOString()
        .replace(
          /[-:.TZ]/g,
          ""
        );

    backupCollectionName =
      `devices_backup_${timestamp}`;

    const allDevices =
      await Device.collection
        .find({})
        .toArray();

    console.log(
      "Current Device documents:",
      allDevices.length
    );

    const backupCollection =
      mongoose.connection.collection(
        backupCollectionName
      );

    if (allDevices.length) {
      await backupCollection.insertMany(
        allDevices,
        {
          ordered: false,
        }
      );
    }

    console.log(
      "Backup created:",
      backupCollectionName
    );

    /*
     * ====================================
     * 2. FIND DUPLICATE IDENTITY GROUPS
     * ====================================
     */

    const duplicateGroups =
      await Device.aggregate([
        {
          $group: {
            _id: {
              installation:
                "$installation",

              deviceType:
                "$deviceType",

              deviceInstance:
                "$deviceInstance",
            },

            ids: {
              $push: "$_id",
            },

            count: {
              $sum: 1,
            },
          },
        },

        {
          $match: {
            count: {
              $gt: 1,
            },
          },
        },
      ]);

    console.log(
      "Duplicate groups found:",
      duplicateGroups.length
    );

    let deletedDocuments = 0;
    let processedGroups = 0;

    /*
     * ====================================
     * 3. CONSOLIDATE EACH DUPLICATE GROUP
     * ====================================
     */

    for (
      const group of duplicateGroups
    ) {
      const documents =
        await Device.find({
          _id: {
            $in: group.ids,
          },
        }).lean();

      if (documents.length <= 1) {
        continue;
      }

      const canonical =
        pickCanonicalDevice(
          documents
        );

      const others =
        documents.filter(
          (document) =>
            String(document._id) !==
            String(canonical._id)
        );

      const mergedFields =
        mergeMissingFields(
          canonical,
          others
        );

      if (
        Object.keys(
          mergedFields
        ).length
      ) {
        await Device.updateOne(
          {
            _id: canonical._id,
          },
          {
            $set: mergedFields,
          }
        );
      }

      const duplicateIds =
        others.map(
          (document) =>
            document._id
        );

      if (duplicateIds.length) {
        const result =
          await Device.deleteMany({
            _id: {
              $in: duplicateIds,
            },
          });

        deletedDocuments +=
          result.deletedCount;
      }

      processedGroups += 1;
    }

    console.log(
      "\nDeduplication complete."
    );

    console.log(
      "Groups processed:",
      processedGroups
    );

    console.log(
      "Documents deleted:",
      deletedDocuments
    );

    /*
     * ====================================
     * 4. VERIFY NO DUPLICATES REMAIN
     * ====================================
     */

    const remainingDuplicates =
      await Device.aggregate([
        {
          $group: {
            _id: {
              installation:
                "$installation",

              deviceType:
                "$deviceType",

              deviceInstance:
                "$deviceInstance",
            },

            count: {
              $sum: 1,
            },
          },
        },

        {
          $match: {
            count: {
              $gt: 1,
            },
          },
        },

        {
          $count:
            "duplicateGroups",
        },
      ]);

    const duplicateCount =
      remainingDuplicates[0]
        ?.duplicateGroups || 0;

    console.log(
      "Remaining duplicate groups:",
      duplicateCount
    );

    if (duplicateCount !== 0) {
      throw new Error(
        "Duplicates remain. Unique index will not be created."
      );
    }

    /*
     * ====================================
     * 5. CREATE UNIQUE IDENTITY INDEX
     * ====================================
     */

    const existingIndexes =
      await Device.collection
        .indexes();

    const obsoleteIndex =
      existingIndexes.find(
        (index) =>
          index.name ===
          "installation_1_deviceInstance_1_deviceType_1"
      );

    if (obsoleteIndex) {
      console.log(
        "Dropping obsolete non-unique index..."
      );

      await Device.collection
        .dropIndex(
          obsoleteIndex.name
        );

      console.log(
        "Obsolete index dropped."
      );
    }

    await Device.collection
      .createIndex(
        {
          installation: 1,
          deviceType: 1,
          deviceInstance: 1,
        },
        {
          unique: true,

          name:
            "uniq_installation_deviceType_deviceInstance",
        }
      );

    console.log(
      "Unique logical-device index created."
    );

    /*
     * ====================================
     * 6. FINAL COUNTS
     * ====================================
     */

    const finalCount =
      await Device.countDocuments();

    console.log(
      "\n=============================="
    );

    console.log(
      "FINAL DEVICE STATE"
    );

    console.log(
      "=============================="
    );

    console.log(
      "Before:",
      allDevices.length
    );

    console.log(
      "After:",
      finalCount
    );

    console.log(
      "Removed:",
      allDevices.length -
        finalCount
    );

    console.log(
      "Backup:",
      backupCollectionName
    );

    const indexes =
      await Device.collection
        .indexes();

    const identityIndex =
      indexes.find(
        (index) =>
          index.name ===
          "uniq_installation_deviceType_deviceInstance"
      );

    console.log(
      "Identity index:",
      identityIndex
    );
  } catch (error) {
    console.error(
      "\nDevice deduplication failed:"
    );

    console.error(error);

    if (backupCollectionName) {
      console.error(
        "Backup collection:",
        backupCollectionName
      );
    }

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log(
      "\nMongoDB disconnected."
    );
  }
};

run();