// backend/services/events/ensEstimatorService.js

const PRIMARY_LOAD_ATTRIBUTES = {
    1: 131,
    2: 132,
    3: 133,
};

const OUTPUT_LOAD_ATTRIBUTES = {
    1: 567,
    2: 568,
    3: 569,
};


const DEFAULT_CONFIG = {
    baselineMinutes: 30,

    minimumBaselineSamples: 2,

    minimumOutageSamples: 1,

    /*
     * Avoid treating normal small load variation as ENS.
     */
    interruptionFractionThreshold: 0.20,

    /*
     * Below 50 W we treat the output as effectively zero
     * for interruption classification.
     */
    nearZeroPowerWatts: 50,
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function numericValue(record) {
    const value =
        record?.numericValue ??
        record?.value;


    /*
     * Important:
     *
     * Number(null) and Number("") both produce 0.
     * Missing telemetry must therefore be rejected explicitly
     * rather than being interpreted as measured zero power.
     */
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }


    const numeric =
        Number(value);


    return Number.isFinite(
        numeric
    )
        ? numeric
        : null;
}


function validDate(value) {
    if (!value) {
        return null;
    }


    const date =
        value instanceof Date
            ? value
            : new Date(value);


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function median(values = []) {
    const clean =
        values
            .filter(
                Number.isFinite
            )
            .sort(
                (a, b) =>
                    a - b
            );


    if (!clean.length) {
        return null;
    }


    const middle =
        Math.floor(
            clean.length / 2
        );


    if (
        clean.length % 2 === 0
    ) {
        return (
            clean[middle - 1] +
            clean[middle]
        ) / 2;
    }


    return clean[middle];
}


function clampNonNegative(value) {
    if (
        !Number.isFinite(
            value
        )
    ) {
        return null;
    }


    return Math.max(
        0,
        value
    );
}


/*
|--------------------------------------------------------------------------
| Signal selection
|--------------------------------------------------------------------------
*/

function getAttributeForPhase(
    phase,
    family = "PRIMARY"
) {
    if (
        family === "OUTPUT"
    ) {
        return OUTPUT_LOAD_ATTRIBUTES[
            phase
        ];
    }


    return PRIMARY_LOAD_ATTRIBUTES[
        phase
    ];
}


function recordsForAttribute(
    records,
    attributeId
) {
    return records
        .filter(
            (record) =>
                Number(
                    record.vrmAttributeId
                ) ===
                Number(
                    attributeId
                )
        )
        .map(
            (record) => ({
                timestamp:
                    validDate(
                        record.timestamp
                    ),

                watts:
                    numericValue(
                        record
                    ),

                telemetryId:
                    record._id ??
                    null,
            })
        )
        .filter(
            (record) =>
                record.timestamp &&
                Number.isFinite(
                    record.watts
                )
        )
        .sort(
            (a, b) =>
                a.timestamp -
                b.timestamp
        );
}


/*
|--------------------------------------------------------------------------
| Determine available phases
|--------------------------------------------------------------------------
*/

function determinePhases(
    records,
    family = "PRIMARY"
) {
    const phases = [];


    for (
        const phase
        of [1, 2, 3]
    ) {
        const attributeId =
            getAttributeForPhase(
                phase,
                family
            );


        const count =
            recordsForAttribute(
                records,
                attributeId
            ).length;


        if (count > 0) {
            phases.push(
                phase
            );
        }
    }


    return phases;
}


/*
|--------------------------------------------------------------------------
| Build timestamped total served-load series
|--------------------------------------------------------------------------
|
| VRM phase records are usually emitted at approximately the same timestamp.
|
| We group records into a 60-second bucket and sum available phases.
|
| For a multi-phase installation, all detected phases must exist in the
| bucket before the sample is considered complete.
|--------------------------------------------------------------------------
*/

function buildTotalPowerSeries(
    records,
    {
        family = "PRIMARY",
    } = {}
) {
    const phases =
        determinePhases(
            records,
            family
        );


    if (!phases.length) {
        return {
            phases: [],
            samples: [],
        };
    }


    const buckets =
        new Map();


    for (
        const phase
        of phases
    ) {
        const attributeId =
            getAttributeForPhase(
                phase,
                family
            );


        const phaseRecords =
            recordsForAttribute(
                records,
                attributeId
            );


        for (
            const record
            of phaseRecords
        ) {
            const bucketMs =
                Math.floor(
                    record.timestamp.getTime() /
                    60000
                ) * 60000;


            const key =
                String(
                    bucketMs
                );


            if (
                !buckets.has(
                    key
                )
            ) {
                buckets.set(
                    key,
                    {
                        timestamp:
                            new Date(
                                bucketMs
                            ),

                        phases: {},
                    }
                );
            }


            buckets
                .get(
                    key
                )
                .phases[
                    phase
                ] =
                record.watts;
        }
    }


    const samples = [];


    for (
        const bucket
        of buckets.values()
    ) {
        /*
         * Require all phases known for that installation.
         *
         * This prevents under-counting a 3-phase site's load
         * when one phase measurement is missing.
         */
        const complete =
            phases.every(
                (phase) =>
                    Number.isFinite(
                        bucket.phases[
                            phase
                        ]
                    )
            );


        if (!complete) {
            continue;
        }


        const totalWatts =
            phases.reduce(
                (
                    total,
                    phase
                ) =>
                    total +
                    bucket.phases[
                        phase
                    ],
                0
            );


        samples.push({
            timestamp:
                bucket.timestamp,

            watts:
                totalWatts,

            phases:
                {
                    ...bucket.phases,
                },
        });
    }


    samples.sort(
        (a, b) =>
            a.timestamp -
            b.timestamp
    );


    return {
        phases,
        samples,
    };
}


/*
|--------------------------------------------------------------------------
| Expected-load baseline
|--------------------------------------------------------------------------
*/

function calculateBaseline(
    samples,
    eventStart,
    baselineMinutes
) {
    const baselineStart =
        new Date(
            eventStart.getTime() -
            baselineMinutes *
            60 *
            1000
        );


    const baselineSamples =
        samples.filter(
            (sample) =>
                sample.timestamp >=
                baselineStart &&
                sample.timestamp <
                eventStart
        );


    const expectedWatts =
        median(
            baselineSamples.map(
                (sample) =>
                    sample.watts
            )
        );


    return {
        expectedWatts,
        baselineSamples,
        baselineStart,
    };
}


/*
|--------------------------------------------------------------------------
| ENS integration
|--------------------------------------------------------------------------
|
| Piecewise-constant approximation:
|
| ENS = Σ max(Pexpected - Pserved, 0) × Δt
|
| Watts × hours / 1000 = kWh
|
| IMPORTANT:
|
| These generated intervals are used for numerical integration only.
| They must NOT be used later as proof of telemetry coverage.
| Temporal coverage must be evaluated from actual outage sample timestamps.
|--------------------------------------------------------------------------
*/

function integrateEns(
    outageSamples,
    expectedWatts,
    eventStart,
    eventEnd
) {
    if (
        !Number.isFinite(
            expectedWatts
        ) ||
        !outageSamples.length
    ) {
        return {
            ensKwh: null,
            intervals: [],
        };
    }


    const samples =
        [...outageSamples]
            .sort(
                (a, b) =>
                    a.timestamp -
                    b.timestamp
            );


    const intervals = [];

    let ensWh = 0;


    for (
        let index = 0;
        index < samples.length;
        index += 1
    ) {
        const current =
            samples[index];


        /*
         * The estimator uses a piecewise-constant approximation.
         *
         * The first observed outage load value is extended back
         * to the event boundary. The qualification service therefore
         * independently checks actual telemetry sample gaps before
         * permitting the result to become qualified ENS.
         */
        const intervalStart =
            index === 0
                ? eventStart
                : current.timestamp;


        const intervalEnd =
            index <
                samples.length - 1
                ? samples[
                    index + 1
                ].timestamp
                : eventEnd;


        const boundedStart =
            new Date(
                Math.max(
                    intervalStart.getTime(),
                    eventStart.getTime()
                )
            );


        const boundedEnd =
            new Date(
                Math.min(
                    intervalEnd.getTime(),
                    eventEnd.getTime()
                )
            );


        const durationHours =
            (
                boundedEnd -
                boundedStart
            ) /
            3600000;


        if (
            durationHours <= 0
        ) {
            continue;
        }


        const unservedWatts =
            clampNonNegative(
                expectedWatts -
                current.watts
            );


        const intervalWh =
            unservedWatts *
            durationHours;


        ensWh +=
            intervalWh;


        intervals.push({
            start:
                boundedStart,

            end:
                boundedEnd,

            durationHours,

            expectedWatts,

            servedWatts:
                current.watts,

            unservedWatts,

            energyNotSuppliedWh:
                intervalWh,
        });
    }


    return {
        ensKwh:
            ensWh / 1000,

        intervals,
    };
}


/*
|--------------------------------------------------------------------------
| Public estimator
|--------------------------------------------------------------------------
*/

export function estimateEnsForGridEvent({
    event,
    telemetryRecords = [],
    config = {},
} = {}) {
    const settings = {
        ...DEFAULT_CONFIG,
        ...config,
    };


    const eventStart =
        validDate(
            event?.startTime
        );


    const eventEnd =
        validDate(
            event?.restorationTime ??
            event?.endTime
        );


    /*
    |--------------------------------------------------------------------------
    | Validate event
    |--------------------------------------------------------------------------
    */

    if (!eventStart) {
        return {
            status:
                "INVALID_EVENT",

            reason:
                "Event startTime is invalid.",

            ensKwh:
                null,
        };
    }


    /*
     * Do not finalize ENS for an OPEN event.
     */
    if (
        event?.status !==
            "RESTORED" ||
        !eventEnd
    ) {
        return {
            status:
                "OPEN_EVENT",

            reason:
                "ENS is not finalized until the grid interruption is restored.",

            ensKwh:
                null,
        };
    }


    if (
        eventEnd <=
        eventStart
    ) {
        return {
            status:
                "INVALID_EVENT",

            reason:
                "Event restoration/end time must be later than startTime.",

            ensKwh:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Primary family
    |--------------------------------------------------------------------------
    |
    | 131 / 132 / 133
    | /Ac/Consumption/Lx/Power
    |--------------------------------------------------------------------------
    */

    let family =
        "PRIMARY";


    let series =
        buildTotalPowerSeries(
            telemetryRecords,
            {
                family,
            }
        );


    /*
    |--------------------------------------------------------------------------
    | Fallback family
    |--------------------------------------------------------------------------
    |
    | 567 / 568 / 569
    | /Ac/ConsumptionOnOutput/Lx/Power
    |
    | Never sum PRIMARY and OUTPUT together.
    |--------------------------------------------------------------------------
    */

    if (
        !series.samples.length
    ) {
        family =
            "OUTPUT";


        series =
            buildTotalPowerSeries(
                telemetryRecords,
                {
                    family,
                }
            );
    }


    if (
        !series.samples.length
    ) {
        return {
            status:
                "NO_LOAD_SIGNAL",

            reason:
                "No verified AC consumption power signal was available.",

            ensKwh:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Baseline
    |--------------------------------------------------------------------------
    */

    const baseline =
        calculateBaseline(
            series.samples,
            eventStart,
            settings.baselineMinutes
        );


    if (
        baseline
            .baselineSamples
            .length <
            settings
                .minimumBaselineSamples ||
        !Number.isFinite(
            baseline.expectedWatts
        )
    ) {
        return {
            status:
                "INSUFFICIENT_BASELINE",

            reason:
                "Insufficient pre-event load samples to estimate expected load.",

            family,

            phases:
                series.phases,

            baselineSampleCount:
                baseline
                    .baselineSamples
                    .length,

            outageSampleCount:
                0,

            outageSampleTimestamps:
                [],

            ensKwh:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Actual interruption-period telemetry samples
    |--------------------------------------------------------------------------
    */

    const outageSamples =
        series.samples.filter(
            (sample) =>
                sample.timestamp >=
                    eventStart &&
                sample.timestamp <=
                    eventEnd
        );


    if (
        outageSamples.length <
        settings
            .minimumOutageSamples
    ) {
        return {
            status:
                "INSUFFICIENT_OUTAGE_DATA",

            reason:
                "No adequate served-load samples exist during the interruption.",

            family,

            phases:
                series.phases,

            expectedLoadWatts:
                baseline.expectedWatts,

            baselineSampleCount:
                baseline
                    .baselineSamples
                    .length,

            outageSampleCount:
                outageSamples.length,

            outageSampleTimestamps:
                outageSamples.map(
                    (sample) =>
                        sample.timestamp
                ),

            eventStart,

            eventEnd,

            ensKwh:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Served-load behaviour
    |--------------------------------------------------------------------------
    */

    const averageServedWatts =
        outageSamples.reduce(
            (
                total,
                sample
            ) =>
                total +
                sample.watts,
            0
        ) /
        outageSamples.length;


    const servedFraction =
        baseline.expectedWatts >
            0
            ? averageServedWatts /
                baseline.expectedWatts
            : null;


    const reductionFraction =
        baseline.expectedWatts >
            0
            ? Math.max(
                0,
                1 -
                servedFraction
            )
            : null;


    const nearZeroSamples =
        outageSamples.filter(
            (sample) =>
                sample.watts <=
                settings
                    .nearZeroPowerWatts
        ).length;


    const nearZeroFraction =
        outageSamples.length
            ? nearZeroSamples /
                outageSamples.length
            : 0;


    const reductionEvidence =
        Number.isFinite(
            reductionFraction
        ) &&
        reductionFraction >=
            settings
                .interruptionFractionThreshold;


    const nearZeroEvidence =
        nearZeroFraction >=
        0.50;


    const loadInterruptionDetected =
        reductionEvidence ||
        nearZeroEvidence;


    /*
    |--------------------------------------------------------------------------
    | Analytical ENS integration
    |--------------------------------------------------------------------------
    */

    const integration =
        integrateEns(
            outageSamples,
            baseline.expectedWatts,
            eventStart,
            eventEnd
        );


    /*
    |--------------------------------------------------------------------------
    | Successful analytical estimate
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | This is still only an analytical estimate.
    |
    | The qualification service must determine whether:
    | - baseline sample count is sufficient
    | - outage sample count is sufficient
    | - load interruption evidence exists
    | - actual telemetry time coverage is adequate
    |
    | Only then may ENS be persisted as a qualified value.
    |--------------------------------------------------------------------------
    */

    return {
        status:
            "ESTIMATED",

        method:
            "PRE_EVENT_BASELINE_MINUS_SERVED_LOAD",

        family,

        phases:
            series.phases,

        expectedLoadWatts:
            baseline.expectedWatts,

        averageServedLoadWatts:
            averageServedWatts,

        servedFraction,

        reductionFraction,

        nearZeroFraction,

        loadInterruptionDetected,

        ensKwh:
            integration.ensKwh,

        /*
         * These names intentionally match
         * ensQualificationService.js.
         */
        baselineSampleCount:
            baseline
                .baselineSamples
                .length,

        outageSampleCount:
            outageSamples.length,

        baselineStart:
            baseline.baselineStart,

        /*
         * Actual telemetry observations.
         *
         * These timestamps—not integration intervals—must be
         * used for temporal coverage qualification.
         */
        outageSampleTimestamps:
            outageSamples.map(
                (sample) =>
                    sample.timestamp
            ),

        eventStart,

        eventEnd,

        /*
         * Synthetic / numerical integration intervals.
         *
         * Diagnostic only for coverage purposes.
         */
        intervals:
            integration.intervals,

        /*
         * Important:
         *
         * this is an analytical estimate,
         * not directly metered unserved energy.
         */
        estimated:
            true,
    };
}