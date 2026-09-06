import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";

import Device from "../models/Device.js";

dotenv.config();

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

const withRetry = async (
  operation,
  label,
  maxAttempts = 5
) => {
  let lastError;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      console.warn(
        `[Retry] ${label} failed ` +
        `(attempt ${attempt}/${maxAttempts}):`,
        error.code ||
          error.message
      );

      if (attempt < maxAttempts) {
        const delay =
          attempt * 3000;

        console.log(
          `[Retry] Waiting ${delay} ms...`
        );

        await sleep(delay);
      }
    }
  }

  throw lastError;
};

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
    const value =
      device[field];

    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      score += 1;
    }
  }

  if (
    device.raw &&
    typeof device.raw ===
      "object" &&
    Object.keys(
      device.raw
    ).length > 0
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

      if (
        scoreDifference !== 0
      ) {
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

      return (
        bUpdated -
        aUpdated
      );
    }
  )[0];
};

const buildMergedFields = (
  canonical,
  others
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
    const current =
      canonical[field];

    const missing =
      current === null ||
      current === undefined ||
      current === "";

    if (!missing) {
      continue;
    }

    const donor =
      others.find(
        (device) => {
          const value =
            device[field];

          return (
            value !== null &&
            value !== undefined &&
            value !== ""
          );
        }
      );

    if (donor) {
      update[field] =
        donor[field];
    }
  }

  return update;
};

const getDuplicateGroups =
  async () => {
    return Device.aggregate([
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
        $sort: {
          count: -1,
        },
      },
    ]);
  };

const processGroup =
  async (
    group,
    groupNumber,
    totalGroups
  ) => {
    const {
      installation,
      deviceType,
      deviceInstance,
    } = group._id;

    const label =
      `${String(
        installation
      )} | ` +
      `${String(
        deviceType
      )} | ` +
      `${String(
        deviceInstance
      )}`;

    await withRetry(
      async () => {
        /*
         * Query fresh state on
         * every retry.
         *
         * This makes the operation
         * resumable/idempotent.
         */

        const documents =
          await Device.find({
            installation,
            deviceType,
            deviceInstance,
          }).lean();

        if (
          documents.length <= 1
        ) {
          console.log(
            `[${groupNumber}/${totalGroups}] ` +
            `Already clean: ${label}`
          );

          return;
        }

        const canonical =
          pickCanonicalDevice(
            documents
          );

        const others =
          documents.filter(
            (device) =>
              String(
                device._id
              ) !==
              String(
                canonical._id
              )
          );

        const merged =
          buildMergedFields(
            canonical,
            others
          );

        if (
          Object.keys(
            merged
          ).length > 0
        ) {
          await Device.updateOne(
            {
              _id:
                canonical._id,
            },
            {
              $set:
                merged,
            }
          );
        }

        const duplicateIds =
          others.map(
            (device) =>
              device._id
          );

        const result =
          await Device.deleteMany({
            _id: {
              $in:
                duplicateIds,
            },
          });

        console.log(
          `[${groupNumber}/${totalGroups}] ` +
          `${label} -> ` +
          `kept 1, deleted ` +
          `${result.deletedCount}`
        );
      },
      label,
      5
    );
  };

const run = async () => {
  try {
    if (
      !process.env.MONGODB_URI
    ) {
      throw new Error(
        "MONGODB_URI is missing."
      );
    }

    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        serverSelectionTimeoutMS:
          30000,

        socketTimeoutMS:
          120000,

        connectTimeoutMS:
          30000,

        maxPoolSize:
          5,

        retryWrites:
          true,

        retryReads:
          true,
      }
    );

    console.log(
      "MongoDB connected."
    );

    /*
     * --------------------------------
     * CURRENT STATE
     * --------------------------------
     */

    const before =
      await Device.countDocuments();

    console.log(
      "\nCurrent Device documents:",
      before
    );

    const missingIdentity =
      await Device.countDocuments({
        $or: [
          {
            deviceType:
              null,
          },
          {
            deviceInstance:
              null,
          },
          {
            deviceType: {
              $exists: false,
            },
          },
          {
            deviceInstance: {
              $exists: false,
            },
          },
        ],
      });

    console.log(
      "Missing logical identity:",
      missingIdentity
    );

    if (
      missingIdentity > 0
    ) {
      throw new Error(
        `${missingIdentity} Device documents ` +
        `have incomplete logical identity. ` +
        `Unique-index creation is unsafe.`
      );
    }

    /*
     * --------------------------------
     * FIND REMAINING DUPLICATES
     * --------------------------------
     */

    const groups =
      await getDuplicateGroups();

    console.log(
      "Remaining duplicate groups:",
      groups.length
    );

    /*
     * --------------------------------
     * CLEAN EACH GROUP
     * --------------------------------
     */

    for (
      let index = 0;
      index < groups.length;
      index += 1
    ) {
      await processGroup(
        groups[index],
        index + 1,
        groups.length
      );

      /*
       * Small pacing delay.
       * Avoid unnecessary Atlas bursts.
       */

      await sleep(150);
    }

    /*
     * --------------------------------
     * VERIFY DEDUPLICATION
     * --------------------------------
     */

    const remaining =
      await getDuplicateGroups();

    console.log(
      "\nRemaining duplicate groups:",
      remaining.length
    );

    if (
      remaining.length !== 0
    ) {
      throw new Error(
        "Duplicate groups remain. " +
        "Unique index will not be created."
      );
    }

    /*
     * --------------------------------
     * INDEX CLEANUP
     * --------------------------------
     */

    const indexes =
      await Device.collection
        .indexes();

    const oldIndexName =
      "installation_1_deviceInstance_1_deviceType_1";

    const oldIndex =
      indexes.find(
        (index) =>
          index.name ===
          oldIndexName
      );

    if (oldIndex) {
      console.log(
        "\nDropping obsolete " +
        "non-unique index:",
        oldIndexName
      );

      await withRetry(
        () =>
          Device.collection
            .dropIndex(
              oldIndexName
            ),
        "drop obsolete Device index"
      );

      console.log(
        "Old index dropped."
      );
    }

    /*
     * --------------------------------
     * CREATE PERMANENT UNIQUE INDEX
     * --------------------------------
     */

    const uniqueIndexName =
      "uniq_installation_deviceType_deviceInstance";

    const updatedIndexes =
      await Device.collection
        .indexes();

    const existingUnique =
      updatedIndexes.find(
        (index) =>
          index.name ===
          uniqueIndexName
      );

    if (!existingUnique) {
      console.log(
        "Creating unique " +
        "logical-device index..."
      );

      await withRetry(
        () =>
          Device.collection
            .createIndex(
              {
                installation: 1,
                deviceType: 1,
                deviceInstance: 1,
              },
              {
                unique: true,
                name:
                  uniqueIndexName,
              }
            ),
        "create unique Device index"
      );
    }

    /*
     * --------------------------------
     * FINAL VALIDATION
     * --------------------------------
     */

    const finalCount =
      await Device.countDocuments();

    const finalIndexes =
      await Device.collection
        .indexes();

    const identityIndex =
      finalIndexes.find(
        (index) =>
          index.name ===
          uniqueIndexName
      );

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
      "Before resume:",
      before
    );

    console.log(
      "After:",
      finalCount
    );

    console.log(
      "Removed this run:",
      before -
        finalCount
    );

    console.log(
      "Remaining duplicate groups:",
      remaining.length
    );

    console.log(
      "Identity index:"
    );

    console.log(
      identityIndex
    );
  } catch (error) {
    console.error(
      "\nResume deduplication failed:"
    );

    console.error(error);

    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors.
    }

    console.log(
      "\nMongoDB disconnected."
    );
  }
};

run();