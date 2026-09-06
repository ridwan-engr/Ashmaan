// backend/scripts/validateEquipmentOperatingExposure.js

import {
    calculateEquipmentOperatingExposure,
} from "../services/reliability/equipmentOperatingExposureService.js";


function assertEqual(
    actual,
    expected,
    label
) {
    if (
        actual !==
        expected
    ) {
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
        !Number.isFinite(
            actual
        ) ||
        Math.abs(
            actual -
            expected
        ) >
        tolerance
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function run() {
    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN EQUIPMENT OPERATING EXPOSURE VALIDATION"
    );

    console.log(
        "================================================"
    );


    const periodStart =
        new Date(
            "2026-09-05T00:00:00.000Z"
        );

    const periodEnd =
        new Date(
            "2026-09-06T00:00:00.000Z"
        );


    /*
    |--------------------------------------------------------------------------
    | CASE 1
    |
    | GEN-01:
    | 00:00 -> 06:00 = 6 h
    | 05:00 -> 10:00 overlaps = merged to 10 h total
    |
    | GEN-02:
    | 12:00 -> 20:00 = 8 h
    |
    | Fleet operating exposure = 18 equipment-hours
    |--------------------------------------------------------------------------
    */

    const result =
        calculateEquipmentOperatingExposure({
            periodStart,
            periodEnd,

            records: [
                {
                    reliabilityKey:
                        "DEVICE:GEN-01",

                    startTime:
                        "2026-09-05T00:00:00.000Z",

                    endTime:
                        "2026-09-05T06:00:00.000Z",

                    observable:
                        true,

                    operating:
                        true,

                    source:
                        "SYNTHETIC",
                },

                {
                    reliabilityKey:
                        "DEVICE:GEN-01",

                    startTime:
                        "2026-09-05T05:00:00.000Z",

                    endTime:
                        "2026-09-05T10:00:00.000Z",

                    observable:
                        true,

                    operating:
                        true,

                    source:
                        "SYNTHETIC",
                },

                {
                    reliabilityKey:
                        "DEVICE:GEN-02",

                    startTime:
                        "2026-09-05T12:00:00.000Z",

                    endTime:
                        "2026-09-05T20:00:00.000Z",

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
        result.status,
        "CALCULATED",
        "Validated operating exposure is calculated"
    );


    assertClose(
        result
            .equipment[
                "DEVICE:GEN-01"
            ]
            .operatingHours,
        10,
        0.000001,
        "Overlapping GEN-01 intervals merge to ten operating hours"
    );


    assertClose(
        result
            .equipment[
                "DEVICE:GEN-02"
            ]
            .operatingHours,
        8,
        0.000001,
        "GEN-02 contributes eight operating hours"
    );


    assertClose(
        result.totalOperatingHours,
        18,
        0.000001,
        "Total equipment operating exposure equals eighteen equipment-hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — reporting-window clipping
    |--------------------------------------------------------------------------
    */

    const clipped =
        calculateEquipmentOperatingExposure({
            periodStart,
            periodEnd,

            records: [
                {
                    reliabilityKey:
                        "DEVICE:GEN-03",

                    startTime:
                        "2026-09-04T20:00:00.000Z",

                    endTime:
                        "2026-09-05T04:00:00.000Z",

                    observable:
                        true,

                    operating:
                        true,
                },
            ],
        });


    assertClose(
        clipped.totalOperatingHours,
        4,
        0.000001,
        "Exposure crossing period start is clipped to four hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — touching intervals merge
    |--------------------------------------------------------------------------
    */

    const touching =
        calculateEquipmentOperatingExposure({
            periodStart,
            periodEnd,

            records: [
                {
                    reliabilityKey:
                        "DEVICE:GEN-04",

                    startTime:
                        "2026-09-05T01:00:00.000Z",

                    endTime:
                        "2026-09-05T03:00:00.000Z",

                    observable:
                        true,

                    operating:
                        true,
                },

                {
                    reliabilityKey:
                        "DEVICE:GEN-04",

                    startTime:
                        "2026-09-05T03:00:00.000Z",

                    endTime:
                        "2026-09-05T05:00:00.000Z",

                    observable:
                        true,

                    operating:
                        true,
                },
            ],
        });


    assertEqual(
        touching
            .equipment[
                "DEVICE:GEN-04"
            ]
            .intervalCount,
        1,
        "Touching operating intervals form one exposure episode"
    );


    assertClose(
        touching.totalOperatingHours,
        4,
        0.000001,
        "Touching intervals contribute four hours without double counting"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — no evidence
    |--------------------------------------------------------------------------
    */

    const none =
        calculateEquipmentOperatingExposure({
            periodStart,
            periodEnd,

            records:
                [],
        });


    assertEqual(
        none.status,
        "UNAVAILABLE",
        "No operating evidence produces unavailable exposure"
    );


    assertEqual(
        none.reason,
        "NO_EXPOSURE_EVIDENCE",
        "Missing exposure evidence receives correct reason"
    );


    assertEqual(
        none.totalOperatingHours,
        null,
        "Missing exposure is not interpreted as zero operating hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — unobservable record blocks complete exposure
    |--------------------------------------------------------------------------
    */

    const unobservable =
        calculateEquipmentOperatingExposure({
            periodStart,
            periodEnd,

            records: [
                {
                    reliabilityKey:
                        "DEVICE:GEN-05",

                    startTime:
                        "2026-09-05T00:00:00.000Z",

                    endTime:
                        "2026-09-05T10:00:00.000Z",

                    observable:
                        false,

                    operating:
                        true,
                },
            ],
        });


    assertEqual(
        unobservable.status,
        "UNAVAILABLE",
        "Unobservable operating state blocks exposure calculation"
    );


    assertEqual(
        unobservable.reason,
        "OPERATING_OBSERVABILITY_NOT_ESTABLISHED",
        "Unobservable exposure receives correct reason"
    );


    assertEqual(
        unobservable.totalOperatingHours,
        null,
        "Unobservable period does not become zero exposure"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — observed not operating
    |--------------------------------------------------------------------------
    */

    const stopped =
        calculateEquipmentOperatingExposure({
            periodStart,
            periodEnd,

            records: [
                {
                    reliabilityKey:
                        "DEVICE:GEN-06",

                    startTime:
                        "2026-09-05T00:00:00.000Z",

                    endTime:
                        "2026-09-05T04:00:00.000Z",

                    observable:
                        true,

                    operating:
                        false,
                },
            ],
        });


    assertEqual(
        stopped.status,
        "UNAVAILABLE",
        "Observed non-operating interval does not create operating exposure"
    );


    assertEqual(
        stopped.totalOperatingHours,
        null,
        "Observed stopped equipment does not fabricate operating hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — invalid window
    |--------------------------------------------------------------------------
    */

    const invalidWindow =
        calculateEquipmentOperatingExposure({
            periodStart:
                periodEnd,

            periodEnd:
                periodStart,

            records: [
                {
                    reliabilityKey:
                        "DEVICE:GEN-07",

                    startTime:
                        periodStart,

                    endTime:
                        periodEnd,

                    observable:
                        true,

                    operating:
                        true,
                },
            ],
        });


    assertEqual(
        invalidWindow.status,
        "UNAVAILABLE",
        "Invalid reporting window blocks exposure calculation"
    );


    assertEqual(
        invalidWindow.reason,
        "INVALID_REPORTING_WINDOW",
        "Invalid reporting window receives correct reason"
    );


    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "EQUIPMENT OPERATING EXPOSURE VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");

    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- MTBF exposure is explicit equipment operating time"
    );

    console.log(
        "- overlapping and touching intervals are not double counted"
    );

    console.log(
        "- intervals are clipped to the reporting window"
    );

    console.log(
        "- telemetry silence is not interpreted as operating time"
    );

    console.log(
        "- unobservable periods do not become zero exposure"
    );

    console.log(
        "- equipment-hours remain tied to repairable-item identity"
    );
}


try {
    run();
}
catch (error) {
    console.error("");

    console.error(
        "Equipment operating exposure validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}