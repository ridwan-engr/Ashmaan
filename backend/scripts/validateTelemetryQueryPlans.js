import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);

const ENGINEERING_INDEX =
    "installation_1_vrmAttributeId_1_timestamp_1";

const SITE_INDEX =
    "installation_1_timestamp_-1";

const TIMESTAMP_INDEX =
    "timestamp_1";

const collectPlanIndexNames = (
    value,
    output = new Set()
) => {
    if (
        value === null ||
        value === undefined
    ) {
        return output;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectPlanIndexNames(
                item,
                output
            );
        }

        return output;
    }

    if (typeof value !== "object") {
        return output;
    }

    if (
        typeof value.indexName ===
        "string"
    ) {
        output.add(
            value.indexName
        );
    }

    for (
        const nested of
        Object.values(value)
    ) {
        collectPlanIndexNames(
            nested,
            output
        );
    }

    return output;
};

const collectPlanStages = (
    value,
    output = new Set()
) => {
    if (
        value === null ||
        value === undefined
    ) {
        return output;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectPlanStages(
                item,
                output
            );
        }

        return output;
    }

    if (typeof value !== "object") {
        return output;
    }

    if (
        typeof value.stage ===
        "string"
    ) {
        output.add(
            value.stage
        );
    }

    for (
        const nested of
        Object.values(value)
    ) {
        collectPlanStages(
            nested,
            output
        );
    }

    return output;
};

const getWinningPlans = (
    explain
) => {
    const plans = [];

    if (
        explain?.queryPlanner
            ?.winningPlan
    ) {
        plans.push(
            explain
                .queryPlanner
                .winningPlan
        );
    }

    if (
        explain?.shards &&
        typeof explain.shards ===
            "object"
    ) {
        for (
            const shard of
            Object.values(
                explain.shards
            )
        ) {
            const winningPlan =
                shard
                    ?.queryPlanner
                    ?.winningPlan;

            if (winningPlan) {
                plans.push(
                    winningPlan
                );
            }
        }
    }

    return plans;
};

const getExecutionStats = (
    explain
) => {
    if (
        explain?.executionStats
    ) {
        return explain
            .executionStats;
    }

    if (
        explain?.shards &&
        typeof explain.shards ===
            "object"
    ) {
        let totalKeysExamined = 0;
        let totalDocsExamined = 0;
        let nReturned = 0;
        let executionTimeMillis = 0;

        for (
            const shard of
            Object.values(
                explain.shards
            )
        ) {
            const stats =
                shard
                    ?.executionStats;

            if (!stats) {
                continue;
            }

            totalKeysExamined +=
                Number(
                    stats
                        .totalKeysExamined ??
                        0
                );

            totalDocsExamined +=
                Number(
                    stats
                        .totalDocsExamined ??
                        0
                );

            nReturned +=
                Number(
                    stats.nReturned ??
                        0
                );

            executionTimeMillis +=
                Number(
                    stats
                        .executionTimeMillis ??
                        0
                );
        }

        return {
            totalKeysExamined,
            totalDocsExamined,
            nReturned,
            executionTimeMillis,
        };
    }

    return {};
};

const summarizeExplain = (
    label,
    explain,
    expectedIndex
) => {
    const winningPlans =
        getWinningPlans(
            explain
        );

    const indexes =
        new Set();

    const stages =
        new Set();

    for (
        const plan of
        winningPlans
    ) {
        collectPlanIndexNames(
            plan,
            indexes
        );

        collectPlanStages(
            plan,
            stages
        );
    }

    const indexNames = [
        ...indexes,
    ];

    const stageNames = [
        ...stages,
    ];

    const stats =
        getExecutionStats(
            explain
        );

    const expectedUsed =
        indexNames.includes(
            expectedIndex
        );

    const collectionScan =
        stageNames.includes(
            "COLLSCAN"
        );

    console.log(
        `\n${label}`
    );

    console.log(
        "-".repeat(
            label.length
        )
    );

    console.log(
        `Winning index(es)  : ${
            indexNames.length
                ? indexNames.join(
                      ", "
                  )
                : "NONE"
        }`
    );

    console.log(
        `Winning stages     : ${
            stageNames.length
                ? stageNames.join(
                      ", "
                  )
                : "UNKNOWN"
        }`
    );

    console.log(
        `Expected index     : ${expectedIndex}`
    );

    console.log(
        `Expected index used: ${
            expectedUsed
                ? "YES"
                : "NO"
        }`
    );

    console.log(
        `COLLSCAN           : ${
            collectionScan
                ? "YES"
                : "NO"
        }`
    );

    console.log(
        `Keys examined      : ${
            stats
                .totalKeysExamined ??
            "N/A"
        }`
    );

    console.log(
        `Docs examined      : ${
            stats
                .totalDocsExamined ??
            "N/A"
        }`
    );

    console.log(
        `Returned           : ${
            stats.nReturned ??
            "N/A"
        }`
    );

    console.log(
        `Execution ms       : ${
            stats
                .executionTimeMillis ??
            "N/A"
        }`
    );

    return {
        expectedUsed,
        collectionScan,
        indexNames,
        stageNames,
        stats,
    };
};

try {
    if (
        !process.env.MONGODB_URI
    ) {
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
                30000,
            maxPoolSize: 2,
            autoIndex: false,
        }
    );

    const collection =
        mongoose.connection.db
            .collection(
                "telemetries"
            );

    console.log(
        "\n==============================================="
    );

    console.log(
        "ASHMAAN TELEMETRY WINNING-PLAN VALIDATION"
    );

    console.log(
        "===============================================\n"
    );

    console.log(
        "Mode: READ-ONLY"
    );

    const sample =
        await collection.findOne(
            {
                installation: {
                    $exists: true,
                },

                vrmAttributeId: {
                    $type: "number",
                },

                timestamp: {
                    $type: "date",
                },
            },
            {
                sort: {
                    timestamp: -1,
                },

                projection: {
                    installation: 1,
                    vrmAttributeId: 1,
                    timestamp: 1,
                },
            }
        );

    if (!sample) {
        throw new Error(
            "No suitable telemetry sample was found."
        );
    }

    const sampleTimestamp =
        new Date(
            sample.timestamp
        );

    const windowStart =
        new Date(
            sampleTimestamp.getTime() -
                24 *
                    60 *
                    60 *
                    1000
        );

    const windowEnd =
        new Date(
            sampleTimestamp.getTime() +
                1
        );

    console.log(
        `Sample installation : ${sample.installation}`
    );

    console.log(
        `Sample attribute    : ${sample.vrmAttributeId}`
    );

    console.log(
        `Sample timestamp    : ${sampleTimestamp.toISOString()}`
    );

    const engineeringExplain =
        await collection
            .find({
                installation:
                    sample.installation,

                vrmAttributeId: {
                    $in: [
                        sample
                            .vrmAttributeId,
                    ],
                },

                timestamp: {
                    $gte:
                        windowStart,
                    $lt:
                        windowEnd,
                },
            })
            .sort({
                timestamp: 1,
            })
            .limit(1000)
            .explain(
                "executionStats"
            );

    const engineeringResult =
        summarizeExplain(
            "TEST 1 — Engineering Analytics",
            engineeringExplain,
            ENGINEERING_INDEX
        );

    const siteExplain =
        await collection
            .find({
                installation:
                    sample.installation,
            })
            .sort({
                timestamp: -1,
            })
            .limit(1000)
            .explain(
                "executionStats"
            );

    const siteResult =
        summarizeExplain(
            "TEST 2 — Site Dashboard",
            siteExplain,
            SITE_INDEX
        );

    const fleetExplain =
        await collection
            .find({
                source: "VRM",
            })
            .sort({
                timestamp: -1,
            })
            .limit(1)
            .explain(
                "executionStats"
            );

    const fleetResult =
        summarizeExplain(
            "TEST 3 — Fleet Latest Telemetry",
            fleetExplain,
            TIMESTAMP_INDEX
        );

    console.log(
        "\n==============================================="
    );

    console.log(
        "VALIDATION SUMMARY"
    );

    console.log(
        "===============================================\n"
    );

    const engineeringPass =
        engineeringResult
            .expectedUsed &&
        !engineeringResult
            .collectionScan;

    const sitePass =
        siteResult
            .expectedUsed &&
        !siteResult
            .collectionScan;

    const fleetPass =
        fleetResult
            .expectedUsed &&
        !fleetResult
            .collectionScan;

    console.log(
        `Engineering winning plan : ${
            engineeringPass
                ? "PASS"
                : "FAIL"
        }`
    );

    console.log(
        `Site winning plan        : ${
            sitePass
                ? "PASS"
                : "FAIL"
        }`
    );

    console.log(
        `Fleet winning plan       : ${
            fleetPass
                ? "PASS"
                : "FAIL"
        }`
    );

    const passed =
        engineeringPass &&
        sitePass &&
        fleetPass;

    console.log("");

    console.log(
        `OVERALL: ${
            passed
                ? "PASS"
                : "REVIEW REQUIRED"
        }`
    );

    console.log(
        "\nREAD-ONLY: no documents or indexes were modified."
    );

    if (!passed) {
        process.exitCode = 2;
    }
} catch (error) {
    console.error(
        "\nWinning-plan validation failed:",
        error instanceof Error
            ? error.message
            : error
    );

    process.exitCode = 1;
} finally {
    await mongoose
        .disconnect()
        .catch(() => {});
}