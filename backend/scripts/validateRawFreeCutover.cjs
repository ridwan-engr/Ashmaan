const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const telemetry =
        mongoose.connection.db.collection("telemetries");

    const cutover =
        new Date("2026-09-08T20:10:12.7250834Z");

    const [
        total,
        rawPresent,
        rawMissing
    ] = await Promise.all([
        telemetry.countDocuments({
            createdAt: { $gte: cutover }
        }),

        telemetry.countDocuments({
            createdAt: { $gte: cutover },
            raw: { $exists: true }
        }),

        telemetry.countDocuments({
            createdAt: { $gte: cutover },
            raw: { $exists: false }
        })
    ]);

    console.log("RAW-FREE CUTOVER VALIDATION");
    console.log("==========================");
    console.log(
        "Cutover:",
        cutover.toISOString()
    );
    console.log(
        "Post-cutover documents:",
        total
    );
    console.log(
        "raw present:",
        rawPresent
    );
    console.log(
        "raw missing:",
        rawMissing
    );

    if (total === 0) {
        console.log("");
        console.log(
            "RESULT: No post-cutover documents yet."
        );
        return;
    }

    if (
        rawPresent === 0 &&
        rawMissing === total
    ) {
        console.log("");
        console.log(
            "PASS: All post-cutover telemetry is raw-free."
        );
    } else {
        console.log("");
        console.log(
            "FAIL: Some post-cutover telemetry still contains raw."
        );
        process.exitCode = 2;
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
