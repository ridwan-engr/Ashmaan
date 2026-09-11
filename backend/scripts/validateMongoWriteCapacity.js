import dns from "node:dns";
import crypto from "node:crypto";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);

const COLLECTION =
    "release_write_capacity_checks";

const marker =
    `ashmaan-release-${crypto.randomUUID()}`;

let insertedId = null;

try {
    if (!process.env.MONGODB_URI) {
        throw new Error(
            "MONGODB_URI is missing."
        );
    }

    await mongoose.connect(
        process.env.MONGODB_URI,
        {
            serverSelectionTimeoutMS:
                10000,
            connectTimeoutMS:
                10000,
            socketTimeoutMS:
                15000,
            maxPoolSize: 1,
            autoIndex: false,
        }
    );

    const db =
        mongoose.connection.db;

    const collection =
        db.collection(
            COLLECTION
        );

    console.log(
        "\n==============================================="
    );
    console.log(
        "ASHMAAN ATLAS WRITE-CAPACITY VALIDATION"
    );
    console.log(
        "===============================================\n"
    );

    console.log(
        "Performing one controlled temporary write..."
    );

    const result =
        await collection.insertOne({
            marker,
            createdAt:
                new Date(),
            purpose:
                "release-write-capacity-validation",
        });

    insertedId =
        result.insertedId;

    console.log(
        `WRITE       : PASS`
    );

    console.log(
        `Inserted id : ${insertedId}`
    );

    const found =
        await collection.findOne({
            _id: insertedId,
        });

    if (!found) {
        throw new Error(
            "Inserted validation record could not be read back."
        );
    }

    console.log(
        "READ BACK   : PASS"
    );

    const deletion =
        await collection.deleteOne({
            _id: insertedId,
        });

    if (
        deletion.deletedCount !==
        1
    ) {
        throw new Error(
            "Temporary validation record was not deleted."
        );
    }

    insertedId = null;

    console.log(
        "CLEANUP     : PASS"
    );

    console.log(
        "\nATLAS WRITE CAPACITY: PASS"
    );
} catch (error) {
    console.error(
        "\nATLAS WRITE CAPACITY: FAIL"
    );

    console.error(
        error instanceof Error
            ? error.message
            : error
    );

    process.exitCode = 1;
} finally {
    /*
     * Best-effort cleanup if
     * failure occurred after insert.
     */
    if (
        insertedId &&
        mongoose.connection
            .readyState === 1
    ) {
        try {
            await mongoose.connection.db
                .collection(
                    COLLECTION
                )
                .deleteOne({
                    _id:
                        insertedId,
                });

            console.log(
                "Emergency cleanup: PASS"
            );
        } catch {
            console.error(
                "Emergency cleanup: FAILED"
            );
        }
    }

    await mongoose
        .disconnect()
        .catch(() => {});
}