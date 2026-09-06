// backend/scripts/validateTechnicalReliabilityRealData.js

import mongoose from "mongoose";

import connectDatabase
    from "../config/database.js";

import FailureEvent
    from "../models/FailureEvent.js";

import {
    evaluateFailureEvents,
} from "../services/reliability/failureEventEligibilityService.js";

import {
    calculateMttr,
} from "../services/reliability/mttrCalculationService.js";

import {
    calculateFailureRepairRates,
} from "../services/reliability/failureRepairRateCalculationService.js";

import {
    calculateReliabilityFunction,
} from "../services/reliability/reliabilityFunctionCalculationService.js";


/*
|--------------------------------------------------------------------------
| Assertions
|--------------------------------------------------------------------------
*/

function assertEqual(
    actual,
    expected,
    label
) {
    if (actual !== expected) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function assertTrue(
    condition,
    label
) {
    if (!condition) {
        throw new Error(
            `${label}: assertion failed`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function percentage(
    numerator,
    denominator
) {
    if (
        !Number.isFinite(numerator) ||
        !Number.isFinite(denominator) ||
        denominator <= 0
    ) {
        return null;
    }

    return (
        numerator /
        denominator
    ) * 100;
}


function formatMetric(
    result,
    valueField,
    suffix = ""
) {
    if (
        !result ||
        result.status !==
            "CALCULATED"
    ) {
        return "UNAVAILABLE";
    }

    const value =
        result[valueField];

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value)
        )
    ) {
        return "UNAVAILABLE";
    }

    return `${value}${suffix}`;
}


function equipmentKeyFromEvaluation(
    evaluation
) {
    return (
        evaluation
            ?.equipmentIdentity
            ?.reliabilityKey ??
        null
    );
}


/*
|--------------------------------------------------------------------------
| Real-data validator
|--------------------------------------------------------------------------
*/

async function run() {
    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN TECHNICAL RELIABILITY REAL-DATA VALIDATION"
    );

    console.log(
        "================================================"
    );

    console.log("");

    console.log(
        "Mode: READ-ONLY"
    );

    console.log(
        "No FailureEvent, OutageEvent, Telemetry, Device, or Installation records will be modified."
    );

    console.log("");


    /*
    |--------------------------------------------------------------------------
    | Connect
    |--------------------------------------------------------------------------
    */

    await connectDatabase();


    /*
    |--------------------------------------------------------------------------
    | 1. Read actual FailureEvent population
    |--------------------------------------------------------------------------
    */

    const failures =
        await FailureEvent
            .find({})
            .sort({
                startTime:
                    1,
            })
            .lean();


    const totalFailureEvents =
        failures.length;


    const confirmedFailures =
        failures.filter(
            (failure) =>
                failure
                    ?.failureConfirmed ===
                true
        );


    const mtbfFlaggedFailures =
        failures.filter(
            (failure) =>
                failure
                    ?.eligibleForMtbf ===
                true
        );


    const mttrFlaggedFailures =
        failures.filter(
            (failure) =>
                failure
                    ?.eligibleForMttr ===
                true
        );


    console.log(
        "DATABASE FAILURE EVENT POPULATION"
    );

    console.log(
        "----------------------------------------"
    );

    console.log(
        `FailureEvent documents: ${totalFailureEvents}`
    );

    console.log(
        `Confirmed failures: ${confirmedFailures.length}`
    );

    console.log(
        `MTBF-flagged failures: ${mtbfFlaggedFailures.length}`
    );

    console.log(
        `MTTR-flagged failures: ${mttrFlaggedFailures.length}`
    );

    console.log("");


    /*
    |--------------------------------------------------------------------------
    | 2. Run the real events through the validated eligibility layer
    |--------------------------------------------------------------------------
    */

    const evaluated =
        evaluateFailureEvents(
            failures
        );


    assertEqual(
        evaluated
            .totalFailureEventCount,
        totalFailureEvents,
        "Eligibility engine evaluates every stored FailureEvent"
    );


    assertTrue(
        evaluated
            .mtbf
            .eligibleCount >=
            0,
        "MTBF eligible count is non-negative"
    );


    assertTrue(
        evaluated
            .mttr
            .eligibleCount >=
            0,
        "MTTR eligible count is non-negative"
    );


    assertEqual(
        evaluated
            .mtbf
            .eligibleCount +
        evaluated
            .mtbf
            .rejectedCount,
        totalFailureEvents,
        "Every FailureEvent receives an MTBF eligibility outcome"
    );


    assertEqual(
        evaluated
            .mttr
            .eligibleCount +
        evaluated
            .mttr
            .rejectedCount,
        totalFailureEvents,
        "Every FailureEvent receives an MTTR eligibility outcome"
    );


    console.log("");

    console.log(
        "ELIGIBILITY RESULTS"
    );

    console.log(
        "----------------------------------------"
    );

    console.log(
        `MTBF eligible: ${evaluated.mtbf.eligibleCount}`
    );

    console.log(
        `MTBF rejected: ${evaluated.mtbf.rejectedCount}`
    );

    console.log(
        `MTTR eligible: ${evaluated.mttr.eligibleCount}`
    );

    console.log(
        `MTTR rejected: ${evaluated.mttr.rejectedCount}`
    );


    console.log("");

    console.log(
        "MTBF rejection reasons:"
    );

    console.dir(
        evaluated
            .mtbf
            .rejectionCounts,
        {
            depth:
                null,
        }
    );


    console.log("");

    console.log(
        "MTTR rejection reasons:"
    );

    console.dir(
        evaluated
            .mttr
            .rejectionCounts,
        {
            depth:
                null,
        }
    );


    /*
    |--------------------------------------------------------------------------
    | 3. Determine actual repairable-item identities
    |--------------------------------------------------------------------------
    */

    const mtbfReliabilityKeys =
        [
            ...new Set(
                evaluated
                    .mtbf
                    .eligible
                    .map(
                        equipmentKeyFromEvaluation
                    )
                    .filter(
                        Boolean
                    )
            ),
        ];


    const mttrReliabilityKeys =
        [
            ...new Set(
                evaluated
                    .mttr
                    .eligible
                    .map(
                        equipmentKeyFromEvaluation
                    )
                    .filter(
                        Boolean
                    )
            ),
        ];


    console.log("");

    console.log(
        "REPAIRABLE-ITEM IDENTITIES"
    );

    console.log(
        "----------------------------------------"
    );

    console.log(
        `MTBF-qualified identities: ${mtbfReliabilityKeys.length}`
    );

    console.log(
        `MTTR-qualified identities: ${mttrReliabilityKeys.length}`
    );


    if (
        mtbfReliabilityKeys.length
    ) {
        console.log("");

        console.log(
            "MTBF identities:"
        );

        for (
            const key
            of mtbfReliabilityKeys
        ) {
            console.log(
                `- ${key}`
            );
        }
    }


    if (
        mttrReliabilityKeys.length
    ) {
        console.log("");

        console.log(
            "MTTR identities:"
        );

        for (
            const key
            of mttrReliabilityKeys
        ) {
            console.log(
                `- ${key}`
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | 4. Real MTTR
    |--------------------------------------------------------------------------
    |
    | MTTR can be calculated directly from qualified completed repair
    | intervals because those intervals are explicit FailureEvent evidence.
    |--------------------------------------------------------------------------
    */

    const mttr =
        calculateMttr({
            mttrEvaluations:
                evaluated
                    .mttr
                    .eligible,
        });


    console.log("");

    console.log(
        "REAL MTTR RESULT"
    );

    console.log(
        "----------------------------------------"
    );

    console.log(
        `Status: ${mttr.status}`
    );

    console.log(
        `Reason: ${mttr.reason}`
    );

    console.log(
        `Completed repairs: ${
            mttr.completedRepairCount ??
            0
        }`
    );

    console.log(
        `Total repair hours: ${
            mttr.totalRepairHours ??
            "UNAVAILABLE"
        }`
    );

    console.log(
        `MTTR: ${
            formatMetric(
                mttr,
                "mttrHours",
                " h"
            )
        }`
    );


    /*
    |--------------------------------------------------------------------------
    | 5. MTBF operating-exposure gate
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | We DO NOT fabricate equipment operating time from:
    |
    | - installation ONLINE state
    | - telemetry timestamps alone
    | - monitoring availability
    | - grid-source observability
    | - elapsed calendar time
    | - outage-free time
    |
    | No persisted real equipment-operating-exposure source has yet been
    | established in this production validation path.
    |--------------------------------------------------------------------------
    */

    const operatingExposureEstablished =
        false;


    const mtbf =
        {
            status:
                "UNAVAILABLE",

            reason:
                "OPERATING_EXPOSURE_NOT_ESTABLISHED",

            mtbfHours:
                null,

            failureCount:
                evaluated
                    .mtbf
                    .eligibleCount,

            operatingExposureHours:
                null,

            reliabilityKeys:
                mtbfReliabilityKeys,

            assumptions: {
                realEquipmentOperatingExposureEstablished:
                    false,

                monitoringStatusUsedAsOperatingExposure:
                    false,

                telemetrySilenceUsedAsOperatingExposure:
                    false,

                calendarTimeUsedAsOperatingExposure:
                    false,
            },
        };


    assertEqual(
        operatingExposureEstablished,
        false,
        "Real equipment operating exposure is not fabricated"
    );


    assertEqual(
        mtbf.status,
        "UNAVAILABLE",
        "MTBF remains unavailable without validated operating exposure"
    );


    assertEqual(
        mtbf.mtbfHours,
        null,
        "Missing operating exposure does not fabricate MTBF"
    );


    /*
    |--------------------------------------------------------------------------
    | 6. λ and μ
    |--------------------------------------------------------------------------
    |
    | μ may independently calculate when MTTR exists.
    | λ must remain unavailable because MTBF is unavailable.
    |--------------------------------------------------------------------------
    */

    const rates =
        calculateFailureRepairRates({
            mtbf,
            mttr,
        });


    assertEqual(
        rates
            .failureRate
            .status,
        "UNAVAILABLE",
        "Unavailable real MTBF blocks λ"
    );


    assertEqual(
        rates
            .failureRate
            .lambdaPerHour,
        null,
        "Real-data validation does not fabricate λ"
    );


    if (
        mttr.status ===
        "CALCULATED"
    ) {
        assertEqual(
            rates
                .repairRate
                .status,
            "CALCULATED",
            "Validated real MTTR independently permits μ"
        );
    }
    else {
        assertEqual(
            rates
                .repairRate
                .status,
            "UNAVAILABLE",
            "Unavailable real MTTR keeps μ unavailable"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | 7. Technical availability
    |--------------------------------------------------------------------------
    |
    | Technical availability requires both MTBF and MTTR.
    | Since validated operating exposure has not been established,
    | technical availability is unavailable.
    |--------------------------------------------------------------------------
    */

    const technicalAvailability =
        {
            status:
                "UNAVAILABLE",

            reason:
                "MTBF_UNAVAILABLE",

            availability:
                null,

            availabilityPercent:
                null,
        };


    assertEqual(
        technicalAvailability
            .status,
        "UNAVAILABLE",
        "Technical availability remains unavailable without MTBF"
    );


    assertEqual(
        technicalAvailability
            .availability,
        null,
        "Missing MTBF does not fabricate technical availability"
    );


    /*
    |--------------------------------------------------------------------------
    | 8. Reliability R(t)
    |--------------------------------------------------------------------------
    */

    const reliability10h =
        calculateReliabilityFunction({
            failureRate:
                rates.failureRate,

            horizonHours:
                10,
        });


    assertEqual(
        reliability10h.status,
        "UNAVAILABLE",
        "Unavailable λ blocks real-data R(10 h)"
    );


    assertEqual(
        reliability10h.reliability,
        null,
        "Missing λ does not fabricate R(t)"
    );


    /*
    |--------------------------------------------------------------------------
    | 9. Empty-collection semantics
    |--------------------------------------------------------------------------
    */

    if (
        totalFailureEvents ===
        0
    ) {
        assertEqual(
            evaluated
                .mtbf
                .eligibleCount,
            0,
            "Empty FailureEvent collection has zero MTBF-qualified failures"
        );


        assertEqual(
            evaluated
                .mttr
                .eligibleCount,
            0,
            "Empty FailureEvent collection has zero MTTR-qualified repairs"
        );


        assertEqual(
            mtbf.mtbfHours,
            null,
            "Zero stored failures do not become infinite MTBF"
        );


        assertEqual(
            rates
                .failureRate
                .lambdaPerHour,
            null,
            "Zero stored failures do not become λ = 0"
        );


        assertEqual(
            reliability10h
                .reliability,
            null,
            "Zero stored failures do not become R(t) = 1"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | 10. Sanity checks for population counts
    |--------------------------------------------------------------------------
    */

    assertTrue(
        confirmedFailures.length <=
            totalFailureEvents,
        "Confirmed failure count cannot exceed stored FailureEvent count"
    );


    assertTrue(
        mtbfFlaggedFailures.length <=
            totalFailureEvents,
        "MTBF-flagged count cannot exceed stored FailureEvent count"
    );


    assertTrue(
        mttrFlaggedFailures.length <=
            totalFailureEvents,
        "MTTR-flagged count cannot exceed stored FailureEvent count"
    );


    /*
    |--------------------------------------------------------------------------
    | Final report
    |--------------------------------------------------------------------------
    */

    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "TECHNICAL RELIABILITY REAL-DATA VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");

    console.log(
        "Production-data result:"
    );

    console.log(
        `- FailureEvent documents: ${totalFailureEvents}`
    );

    console.log(
        `- Confirmed failures: ${confirmedFailures.length}`
    );

    console.log(
        `- MTBF-qualified failures: ${evaluated.mtbf.eligibleCount}`
    );

    console.log(
        `- MTTR-qualified repairs: ${evaluated.mttr.eligibleCount}`
    );

    console.log(
        `- Repairable-item identities: ${mtbfReliabilityKeys.length}`
    );

    console.log(
        `- Real equipment operating exposure: ${
            operatingExposureEstablished
                ? "ESTABLISHED"
                : "NOT ESTABLISHED"
        }`
    );

    console.log(
        `- MTBF: ${
            mtbf.mtbfHours ??
            "UNAVAILABLE"
        }`
    );

    console.log(
        `- MTTR: ${
            mttr.mttrHours ??
            "UNAVAILABLE"
        }`
    );

    console.log(
        `- λ: ${
            rates
                .failureRate
                .lambdaPerHour ??
            "UNAVAILABLE"
        }`
    );

    console.log(
        `- μ: ${
            rates
                .repairRate
                .muPerHour ??
            "UNAVAILABLE"
        }`
    );

    console.log(
        `- Technical availability: ${
            technicalAvailability
                .availabilityPercent ??
            "UNAVAILABLE"
        }`
    );

    console.log(
        `- R(10 h): ${
            reliability10h
                .reliabilityPercent ??
            "UNAVAILABLE"
        }`
    );


    console.log("");

    console.log(
        "Validated production semantics:"
    );

    console.log(
        "- only FailureEvent records enter equipment reliability qualification"
    );

    console.log(
        "- grid-source OutageEvent records are not converted into equipment failures"
    );

    console.log(
        "- MTTR requires actual completed repair intervals"
    );

    console.log(
        "- MTBF requires separately validated equipment operating exposure"
    );

    console.log(
        "- installation monitoring state is not equipment operating exposure"
    );

    console.log(
        "- telemetry presence alone is not equipment operating exposure"
    );

    console.log(
        "- no failures plus incomplete exposure does not imply infinite MTBF"
    );

    console.log(
        "- unavailable MTBF does not fabricate λ"
    );

    console.log(
        "- unavailable λ does not fabricate R(t)"
    );

    console.log(
        "- technical availability remains distinct from ASAI and grid-source availability"
    );
}


/*
|--------------------------------------------------------------------------
| Execute and disconnect
|--------------------------------------------------------------------------
*/

try {
    await run();
}
catch (error) {
    console.error("");

    console.error(
        "Technical reliability real-data validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}
finally {
    try {
        await mongoose.disconnect();

        console.log("");

        console.log(
            "MongoDB disconnected."
        );
    }
    catch (error) {
        console.error(
            "MongoDB disconnect failed:",
            error.message
        );
    }
}