// backend/services/reliability/equipmentOperatingExposureService.js


export const OPERATING_EXPOSURE_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


export const OPERATING_EXPOSURE_REASON = {
    CALCULATED:
        "CALCULATED",

    INVALID_REPORTING_WINDOW:
        "INVALID_REPORTING_WINDOW",

    NO_EXPOSURE_EVIDENCE:
        "NO_EXPOSURE_EVIDENCE",

    OPERATING_OBSERVABILITY_NOT_ESTABLISHED:
        "OPERATING_OBSERVABILITY_NOT_ESTABLISHED",

    INVALID_EXPOSURE_INTERVAL:
        "INVALID_EXPOSURE_INTERVAL",

    EQUIPMENT_IDENTITY_UNAVAILABLE:
        "EQUIPMENT_IDENTITY_UNAVAILABLE",
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function asDate(value) {
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


function normalizeText(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const text =
        String(value).trim();

    return text.length > 0
        ? text
        : null;
}


function clipInterval({
    start,
    end,
    periodStart,
    periodEnd,
}) {
    const clippedStart =
        new Date(
            Math.max(
                start.getTime(),
                periodStart.getTime()
            )
        );

    const clippedEnd =
        new Date(
            Math.min(
                end.getTime(),
                periodEnd.getTime()
            )
        );

    if (
        clippedEnd <=
        clippedStart
    ) {
        return null;
    }

    return {
        start:
            clippedStart,

        end:
            clippedEnd,

        durationSeconds:
            (
                clippedEnd -
                clippedStart
            ) /
            1000,
    };
}


/*
|--------------------------------------------------------------------------
| Merge overlapping / touching operating intervals
|--------------------------------------------------------------------------
*/

function mergeIntervals(
    intervals = []
) {
    if (
        intervals.length ===
        0
    ) {
        return [];
    }

    const sorted =
        [...intervals]
            .sort(
                (a, b) =>
                    a.start -
                    b.start
            );

    const merged = [
        {
            ...sorted[0],
        },
    ];

    for (
        let index = 1;
        index < sorted.length;
        index += 1
    ) {
        const current =
            sorted[index];

        const previous =
            merged[
                merged.length -
                1
            ];

        /*
         * Overlap OR touching.
         */
        if (
            current.start <=
            previous.end
        ) {
            if (
                current.end >
                previous.end
            ) {
                previous.end =
                    current.end;
            }

            continue;
        }

        merged.push({
            ...current,
        });
    }

    return merged.map(
        (interval) => ({
            ...interval,

            durationSeconds:
                (
                    interval.end -
                    interval.start
                ) /
                1000,

            durationHours:
                (
                    interval.end -
                    interval.start
                ) /
                3600000,
        })
    );
}


/*
|--------------------------------------------------------------------------
| Evaluate one exposure record
|--------------------------------------------------------------------------
|
| Required semantics:
|
| observable === true
| operating  === true
|
| We deliberately do not infer either condition.
|--------------------------------------------------------------------------
*/

export function evaluateOperatingExposureRecord({
    record,
    periodStart,
    periodEnd,
} = {}) {
    const windowStart =
        asDate(
            periodStart
        );

    const windowEnd =
        asDate(
            periodEnd
        );

    if (
        !windowStart ||
        !windowEnd ||
        windowEnd <=
            windowStart
    ) {
        return {
            eligible:
                false,

            reason:
                OPERATING_EXPOSURE_REASON
                    .INVALID_REPORTING_WINDOW,
        };
    }


    const reliabilityKey =
        normalizeText(
            record
                ?.reliabilityKey
        );

    if (!reliabilityKey) {
        return {
            eligible:
                false,

            reason:
                OPERATING_EXPOSURE_REASON
                    .EQUIPMENT_IDENTITY_UNAVAILABLE,
        };
    }


    if (
        record
            ?.observable !==
        true
    ) {
        return {
            eligible:
                false,

            reason:
                OPERATING_EXPOSURE_REASON
                    .OPERATING_OBSERVABILITY_NOT_ESTABLISHED,

            reliabilityKey,
        };
    }


    /*
     * Observable but explicitly not operating:
     * this is valid evidence, but not operating exposure.
     */
    if (
        record
            ?.operating !==
        true
    ) {
        return {
            eligible:
                false,

            reason:
                "OBSERVED_NOT_OPERATING",

            reliabilityKey,

            observable:
                true,
        };
    }


    const originalStart =
        asDate(
            record
                ?.startTime
        );

    const originalEnd =
        asDate(
            record
                ?.endTime
        );


    if (
        !originalStart ||
        !originalEnd ||
        originalEnd <=
            originalStart
    ) {
        return {
            eligible:
                false,

            reason:
                OPERATING_EXPOSURE_REASON
                    .INVALID_EXPOSURE_INTERVAL,

            reliabilityKey,
        };
    }


    const clipped =
        clipInterval({
            start:
                originalStart,

            end:
                originalEnd,

            periodStart:
                windowStart,

            periodEnd:
                windowEnd,
        });


    if (!clipped) {
        return {
            eligible:
                false,

            reason:
                "OUTSIDE_REPORTING_WINDOW",

            reliabilityKey,
        };
    }


    return {
        eligible:
            true,

        reason:
            OPERATING_EXPOSURE_REASON
                .CALCULATED,

        reliabilityKey,

        originalStart,

        originalEnd,

        start:
            clipped.start,

        end:
            clipped.end,

        durationSeconds:
            clipped.durationSeconds,

        durationHours:
            clipped.durationSeconds /
            3600,

        observable:
            true,

        operating:
            true,

        source:
            normalizeText(
                record
                    ?.source
            ),

        sourceRecordId:
            normalizeText(
                record
                    ?.sourceRecordId
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Aggregate equipment operating exposure
|--------------------------------------------------------------------------
*/

export function calculateEquipmentOperatingExposure({
    records = [],
    periodStart,
    periodEnd,
} = {}) {
    const windowStart =
        asDate(
            periodStart
        );

    const windowEnd =
        asDate(
            periodEnd
        );


    if (
        !windowStart ||
        !windowEnd ||
        windowEnd <=
            windowStart
    ) {
        return {
            status:
                OPERATING_EXPOSURE_STATUS
                    .UNAVAILABLE,

            reason:
                OPERATING_EXPOSURE_REASON
                    .INVALID_REPORTING_WINDOW,

            totalOperatingHours:
                null,

            equipment:
                {},
        };
    }


    if (
        !Array.isArray(
            records
        ) ||
        records.length ===
            0
    ) {
        return {
            status:
                OPERATING_EXPOSURE_STATUS
                    .UNAVAILABLE,

            reason:
                OPERATING_EXPOSURE_REASON
                    .NO_EXPOSURE_EVIDENCE,

            totalOperatingHours:
                null,

            equipment:
                {},
        };
    }


    const evaluations =
        records.map(
            (record) =>
                evaluateOperatingExposureRecord({
                    record,

                    periodStart:
                        windowStart,

                    periodEnd:
                        windowEnd,
                })
        );


    const eligible =
        evaluations.filter(
            (evaluation) =>
                evaluation
                    .eligible ===
                true
        );


    const unobservable =
        evaluations.filter(
            (evaluation) =>
                evaluation
                    .reason ===
                OPERATING_EXPOSURE_REASON
                    .OPERATING_OBSERVABILITY_NOT_ESTABLISHED
        );


    /*
    |--------------------------------------------------------------------------
    | Conservative rule:
    |
    | If any supplied record for the requested exposure population is
    | explicitly unobservable, complete operating exposure is not established.
    |--------------------------------------------------------------------------
    */

    if (
        unobservable.length >
        0
    ) {
        return {
            status:
                OPERATING_EXPOSURE_STATUS
                    .UNAVAILABLE,

            reason:
                OPERATING_EXPOSURE_REASON
                    .OPERATING_OBSERVABILITY_NOT_ESTABLISHED,

            totalOperatingHours:
                null,

            equipment:
                {},

            totalRecordCount:
                records.length,

            eligibleRecordCount:
                eligible.length,

            unobservableRecordCount:
                unobservable.length,

            evaluations,
        };
    }


    if (
        eligible.length ===
        0
    ) {
        return {
            status:
                OPERATING_EXPOSURE_STATUS
                    .UNAVAILABLE,

            reason:
                OPERATING_EXPOSURE_REASON
                    .NO_EXPOSURE_EVIDENCE,

            totalOperatingHours:
                null,

            equipment:
                {},

            totalRecordCount:
                records.length,

            eligibleRecordCount:
                0,

            evaluations,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Group by repairable-item reliability identity
    |--------------------------------------------------------------------------
    */

    const grouped =
        new Map();


    for (
        const evaluation
        of eligible
    ) {
        const key =
            evaluation
                .reliabilityKey;

        if (
            !grouped.has(
                key
            )
        ) {
            grouped.set(
                key,
                []
            );
        }

        grouped
            .get(key)
            .push({
                start:
                    evaluation.start,

                end:
                    evaluation.end,
            });
    }


    const equipment = {};

    let totalOperatingHours =
        0;


    for (
        const [
            reliabilityKey,
            intervals,
        ]
        of grouped.entries()
    ) {
        const merged =
            mergeIntervals(
                intervals
            );

        const operatingHours =
            merged.reduce(
                (
                    total,
                    interval
                ) =>
                    total +
                    interval
                        .durationHours,
                0
            );


        equipment[
            reliabilityKey
        ] = {
            reliabilityKey,

            operatingHours,

            intervalCount:
                merged.length,

            intervals:
                merged,
        };


        totalOperatingHours +=
            operatingHours;
    }


    return {
        status:
            OPERATING_EXPOSURE_STATUS
                .CALCULATED,

        reason:
            OPERATING_EXPOSURE_REASON
                .CALCULATED,

        reportingWindow: {
            start:
                windowStart,

            end:
                windowEnd,

            semantics:
                "[start,end)",
        },

        totalOperatingHours,

        equipmentCount:
            Object.keys(
                equipment
            ).length,

        totalRecordCount:
            records.length,

        eligibleRecordCount:
            eligible.length,

        equipment,

        evaluations,
    };
}