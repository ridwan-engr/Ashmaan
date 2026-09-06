// backend/scripts/validateTechnicalReliabilityPipeline.js

import {
    evaluateFailureEvents,
} from "../services/reliability/failureEventEligibilityService.js";

import {
    calculateMttr,
} from "../services/reliability/mttrCalculationService.js";

import {
    calculateEquipmentOperatingExposure,
} from "../services/reliability/equipmentOperatingExposureService.js";

import {
    calculateMtbf,
} from "../services/reliability/mtbfCalculationService.js";

import {
    calculateTechnicalAvailability,
} from "../services/reliability/technicalAvailabilityCalculationService.js";

import {
    calculateFailureRepairRates,
} from "../services/reliability/failureRepairRateCalculationService.js";

import {
    calculateReliabilityFunction,
} from "../services/reliability/reliabilityFunctionCalculationService.js";


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


function assertClose(
    actual,
    expected,
    tolerance,
    label
) {
    if (
        !Number.isFinite(actual) ||
        Math.abs(actual - expected) > tolerance
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function syntheticFailure({
    id,
    installation,
    device,
    failureStart,
    repairStart,
    repairEnd,
    restorationTime,
} = {}) {
    return {
        _id: id,

        installation,

        device,

        equipmentType:
            "GENERATOR",

        failureType:
            "GENERATOR_FAILURE",

        source:
            "DERIVED",

        status:
            "RESTORED",

        startTime:
            new Date(
                failureStart
            ),

        detectionTime:
            new Date(
                failureStart
            ),

        repairStartTime:
            new Date(
                repairStart
            ),

        repairEndTime:
            new Date(
                repairEnd
            ),

        restorationTime:
            new Date(
                restorationTime
            ),

        failureConfirmed:
            true,

        eligibleForMtbf:
            true,

        eligibleForMttr:
            true,

        confidence:
            1,
    };
}


function run() {
    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN TECHNICAL RELIABILITY PIPELINE VALIDATION"
    );

    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | Synthetic repairable item
    |--------------------------------------------------------------------------
    */

    const installationId =
        "64f000000000000000000001";

    const deviceId =
        "64f000000000000000000101";

    const reliabilityKey =
        `DEVICE:${deviceId}`;


    /*
    |--------------------------------------------------------------------------
    | Two validated failures
    |
    | Failure 1 repair:
    | 01:30 -> 02:30 = 1 hour
    |
    | Failure 2 repair:
    | 11:30 -> 14:30 = 3 hours
    |
    | MTTR = (1 + 3) / 2
    |      = 2 hours
    |--------------------------------------------------------------------------
    */

    const failures = [
        syntheticFailure({
            id:
                "64f000000000000000001001",

            installation:
                installationId,

            device:
                deviceId,

            failureStart:
                "2026-09-01T01:00:00.000Z",

            repairStart:
                "2026-09-01T01:30:00.000Z",

            repairEnd:
                "2026-09-01T02:30:00.000Z",

            restorationTime:
                "2026-09-01T02:40:00.000Z",
        }),

        syntheticFailure({
            id:
                "64f000000000000000001002",

            installation:
                installationId,

            device:
                deviceId,

            failureStart:
                "2026-09-03T11:00:00.000Z",

            repairStart:
                "2026-09-03T11:30:00.000Z",

            repairEnd:
                "2026-09-03T14:30:00.000Z",

            restorationTime:
                "2026-09-03T14:45:00.000Z",
        }),
    ];


    /*
    |--------------------------------------------------------------------------
    | 1. Failure eligibility
    |--------------------------------------------------------------------------
    */

    const evaluated =
        evaluateFailureEvents(
            failures
        );

    console.log("");
    console.log("FAILURE ELIGIBILITY RESULT SHAPE:");
    console.dir(
        evaluated,
        {
            depth: null,
            colors: true,
        }
    );
    console.log("");

    assertEqual(
        evaluated.totalFailureEventCount,
        2,
        "Two synthetic failure events are evaluated"
    );


    assertEqual(
        evaluated.mtbf.eligibleCount,
        2,
        "Both failures qualify for MTBF"
    );


    assertEqual(
        evaluated.mttr.eligibleCount,
        2,
        "Both completed repairs qualify for MTTR"
    );


    /*
    |--------------------------------------------------------------------------
    | 2. MTTR
    |--------------------------------------------------------------------------
    */

    const mttr =
        calculateMttr({
            mttrEvaluations:
                evaluated
                    .mttr
                    .eligible,
        });


    assertEqual(
        mttr.status,
        "CALCULATED",
        "MTTR pipeline result is calculated"
    );


    assertEqual(
        mttr.completedRepairCount,
        2,
        "Two completed repairs enter MTTR"
    );


    assertClose(
        mttr.totalRepairHours,
        4,
        0.000001,
        "Total repair duration equals four hours"
    );


    assertClose(
        mttr.mttrHours,
        2,
        0.000001,
        "MTTR equals two hours"
    );


    /*
    |--------------------------------------------------------------------------
    | 3. Operating exposure
    |
    | Two adjacent intervals:
    |
    | 2026-09-01 00:00 -> 2026-09-03 00:00 = 48 h
    | 2026-09-03 00:00 -> 2026-09-05 04:00 = 52 h
    |
    | Total validated operating exposure = 100 h
    |--------------------------------------------------------------------------
    */

    const periodStart =
        new Date(
            "2026-09-01T00:00:00.000Z"
        );

    const periodEnd =
        new Date(
            "2026-09-05T04:00:00.000Z"
        );


    const exposure =
        calculateEquipmentOperatingExposure({
            periodStart,
            periodEnd,

            records: [
                {
                    reliabilityKey,

                    startTime:
                        "2026-09-01T00:00:00.000Z",

                    endTime:
                        "2026-09-03T00:00:00.000Z",

                    observable:
                        true,

                    operating:
                        true,

                    source:
                        "SYNTHETIC",
                },

                {
                    reliabilityKey,

                    startTime:
                        "2026-09-03T00:00:00.000Z",

                    endTime:
                        "2026-09-05T04:00:00.000Z",

                    observable:
                        true,

                    operating:
                        true,

                    source:
                        "SYNTHETIC",
                },
            ],
        });


    assertEqual(
        exposure.status,
        "CALCULATED",
        "Operating exposure is calculated"
    );


    assertClose(
        exposure.totalOperatingHours,
        100,
        0.000001,
        "Validated operating exposure equals 100 hours"
    );


    assertEqual(
        exposure.equipmentCount,
        1,
        "Operating exposure belongs to one repairable item"
    );


    /*
    |--------------------------------------------------------------------------
    | 4. MTBF
    |
    | MTBF = 100 h / 2 failures
    |      = 50 h
    |--------------------------------------------------------------------------
    */

    const mtbf =
        calculateMtbf({
            failures:
                evaluated
                    .mtbf
                    .eligible,

            exposure,
        });


    assertEqual(
        mtbf.status,
        "CALCULATED",
        "MTBF pipeline result is calculated"
    );


    assertEqual(
        mtbf.failureCount,
        2,
        "Two unique failures enter MTBF"
    );


    assertClose(
        mtbf.operatingExposureHours,
        100,
        0.000001,
        "MTBF uses 100 validated operating hours"
    );


    assertClose(
        mtbf.mtbfHours,
        50,
        0.000001,
        "MTBF equals 50 hours"
    );


    /*
    |--------------------------------------------------------------------------
    | 5. Failure / repair rates
    |
    | λ = 1 / 50 = 0.02 h^-1
    | μ = 1 / 2  = 0.5 h^-1
    |--------------------------------------------------------------------------
    */

    const rates =
        calculateFailureRepairRates({
            mtbf,
            mttr,
        });


    assertEqual(
        rates.status,
        "CALCULATED",
        "Failure and repair rates are calculated"
    );


    assertClose(
        rates
            .failureRate
            .lambdaPerHour,
        0.02,
        0.000000001,
        "Failure rate λ equals 0.02 per hour"
    );


    assertClose(
        rates
            .repairRate
            .muPerHour,
        0.5,
        0.000000001,
        "Repair rate μ equals 0.5 per hour"
    );


    /*
    |--------------------------------------------------------------------------
    | 6. Technical availability
    |
    | A = 50 / (50 + 2)
    |   = 50 / 52
    |--------------------------------------------------------------------------
    */

    const availability =
        calculateTechnicalAvailability({
            mtbf,
            mttr,
        });


    assertEqual(
        availability.status,
        "CALCULATED",
        "Technical availability is calculated"
    );


    assertClose(
        availability.availability,
        50 / 52,
        0.000000001,
        "Technical availability equals 50 / 52"
    );


    assertClose(
        availability.availabilityPercent,
        (
            50 /
            52
        ) *
        100,
        0.0000001,
        "Technical availability percentage is correct"
    );


    /*
    |--------------------------------------------------------------------------
    | Cross-check:
    |
    | A = μ / (λ + μ)
    |--------------------------------------------------------------------------
    */

    const rateBasedAvailability =
        rates
            .repairRate
            .muPerHour /
        (
            rates
                .failureRate
                .lambdaPerHour +
            rates
                .repairRate
                .muPerHour
        );


    assertClose(
        availability.availability,
        rateBasedAvailability,
        0.000000001,
        "MTBF/MTTR and λ/μ availability formulations agree"
    );


    /*
    |--------------------------------------------------------------------------
    | 7. Reliability
    |
    | t = 10 h
    |
    | R(10)
    | = exp(-0.02 × 10)
    | = exp(-0.2)
    |--------------------------------------------------------------------------
    */

    const reliability =
        calculateReliabilityFunction({
            failureRate:
                rates.failureRate,

            horizonHours:
                10,
        });


    assertEqual(
        reliability.status,
        "CALCULATED",
        "Reliability function is calculated"
    );


    assertClose(
        reliability.reliability,
        Math.exp(
            -0.2
        ),
        0.000000001,
        "R(10) equals exp(-0.2)"
    );


    assertClose(
        reliability.failureProbability,
        1 -
        Math.exp(
            -0.2
        ),
        0.000000001,
        "Ten-hour failure probability equals 1 - R(10)"
    );


    /*
    |--------------------------------------------------------------------------
    | 8. Full arithmetic identities
    |--------------------------------------------------------------------------
    */

    assertClose(
        mttr.mttrHours *
        mttr.completedRepairCount,
        mttr.totalRepairHours,
        0.000000001,
        "MTTR arithmetic identity holds"
    );


    assertClose(
        mtbf.mtbfHours *
        mtbf.failureCount,
        mtbf.operatingExposureHours,
        0.000000001,
        "MTBF arithmetic identity holds"
    );


    assertClose(
        rates
            .failureRate
            .lambdaPerHour *
        mtbf.mtbfHours,
        1,
        0.000000001,
        "λ × MTBF equals one"
    );


    assertClose(
        rates
            .repairRate
            .muPerHour *
        mttr.mttrHours,
        1,
        0.000000001,
        "μ × MTTR equals one"
    );


    assertClose(
        reliability.reliability +
        reliability.failureProbability,
        1,
        0.000000001,
        "Reliability plus failure probability equals one"
    );


    /*
    |--------------------------------------------------------------------------
    | 9. Semantic separation
    |--------------------------------------------------------------------------
    */

    assertEqual(
        availability
            .semanticGuards
            .technicalAvailabilityIsNotAsai,
        true,
        "Technical availability remains separate from ASAI"
    );


    assertEqual(
        reliability
            .semanticGuards
            .reliabilityIsNotAvailability,
        true,
        "Reliability remains separate from availability"
    );


    assertEqual(
        reliability
            .assumptions
            .constantFailureRate,
        true,
        "Exponential reliability assumption remains explicit"
    );


    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "TECHNICAL RELIABILITY PIPELINE VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");

    console.log(
        "End-to-end synthetic results:"
    );

    console.log(
        `- Failure count: ${mtbf.failureCount}`
    );

    console.log(
        `- Completed repairs: ${mttr.completedRepairCount}`
    );

    console.log(
        `- Operating exposure: ${mtbf.operatingExposureHours} h`
    );

    console.log(
        `- MTBF: ${mtbf.mtbfHours} h`
    );

    console.log(
        `- MTTR: ${mttr.mttrHours} h`
    );

    console.log(
        `- λ: ${rates.failureRate.lambdaPerHour} /h`
    );

    console.log(
        `- μ: ${rates.repairRate.muPerHour} /h`
    );

    console.log(
        `- Technical availability: ${availability.availabilityPercent.toFixed(6)}%`
    );

    console.log(
        `- R(10 h): ${reliability.reliabilityPercent.toFixed(6)}%`
    );


    console.log("");

    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- FailureEvent eligibility drives MTBF and MTTR qualification"
    );

    console.log(
        "- MTTR uses actual completed repair intervals"
    );

    console.log(
        "- MTBF uses validated equipment operating exposure"
    );

    console.log(
        "- λ and μ derive only from validated MTBF and MTTR"
    );

    console.log(
        "- technical availability uses a matched repairable-item scope"
    );

    console.log(
        "- reliability requires an explicit future operating horizon"
    );

    console.log(
        "- exponential reliability assumptions remain explicit"
    );

    console.log(
        "- service reliability and equipment reliability remain separate"
    );
}


try {
    run();
}
catch (error) {
    console.error("");

    console.error(
        "Technical reliability pipeline validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}