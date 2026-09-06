// backend/services/reliability/mtbfCalculationService.js


export const MTBF_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


export const MTBF_REASON = {
    CALCULATED:
        "CALCULATED",

    OPERATING_EXPOSURE_UNAVAILABLE:
        "OPERATING_EXPOSURE_UNAVAILABLE",

    NO_ELIGIBLE_FAILURES:
        "NO_ELIGIBLE_FAILURES",

    INVALID_FAILURE_COUNT:
        "INVALID_FAILURE_COUNT",

    FAILURE_EXPOSURE_SCOPE_MISMATCH:
        "FAILURE_EXPOSURE_SCOPE_MISMATCH",

    INVALID_OPERATING_EXPOSURE:
        "INVALID_OPERATING_EXPOSURE",
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeText(
    value
) {
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


function normalizeId(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value === "object" &&
        value._id
    ) {
        return String(
            value._id
        );
    }

    return String(value);
}


function finitePositiveNumber(
    value
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const numeric =
        Number(value);

    if (
        !Number.isFinite(
            numeric
        ) ||
        numeric <= 0
    ) {
        return null;
    }

    return numeric;
}


function unavailableResult(
    reason,
    extra = {}
) {
    return {
        status:
            MTBF_STATUS
                .UNAVAILABLE,

        reason,

        mtbfHours:
            null,

        failureCount:
            null,

        operatingExposureHours:
            null,

        ...extra,
    };
}


/*
|--------------------------------------------------------------------------
| Extract reliability key from eligible MTBF failure evaluation
|--------------------------------------------------------------------------
*/

function getFailureReliabilityKey(
    failure
) {
    return normalizeText(
        failure
            ?.equipmentIdentity
            ?.reliabilityKey
    );
}


/*
|--------------------------------------------------------------------------
| Deduplicate eligible failures
|--------------------------------------------------------------------------
|
| Preferred physical identity:
|
|     sourceEventId
|
| Fallback:
|
|     reliabilityKey + failureStart
|--------------------------------------------------------------------------
*/

function buildFailureKey(
    failure,
    index
) {
    const sourceEventId =
        normalizeId(
            failure
                ?.sourceEventId
        );

    if (sourceEventId) {
        return `EVENT:${sourceEventId}`;
    }


    const reliabilityKey =
        getFailureReliabilityKey(
            failure
        );


    const failureStart =
        failure
            ?.failureStart instanceof Date &&
        !Number.isNaN(
            failure
                .failureStart
                .getTime()
        )
            ? failure
                .failureStart
                .toISOString()
            : null;


    if (
        reliabilityKey &&
        failureStart
    ) {
        return [
            "FAILURE",
            reliabilityKey,
            failureStart,
        ].join(":");
    }


    return `UNRESOLVED:${index}`;
}


/*
|--------------------------------------------------------------------------
| MTBF calculation
|--------------------------------------------------------------------------
|
| failures:
|     already-qualified MTBF evaluations from:
|
|     evaluateFailureEvents(...).mtbf.eligible
|
| exposure:
|     result from:
|
|     calculateEquipmentOperatingExposure(...)
|--------------------------------------------------------------------------
*/

export function calculateMtbf({
    failures = [],
    exposure = null,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | Exposure must already be validated
    |--------------------------------------------------------------------------
    */

    if (
        exposure
            ?.status !==
        "CALCULATED"
    ) {
        return unavailableResult(
            MTBF_REASON
                .OPERATING_EXPOSURE_UNAVAILABLE,
            {
                exposureStatus:
                    exposure
                        ?.status ??
                    null,

                exposureReason:
                    exposure
                        ?.reason ??
                    null,
            }
        );
    }


    const totalOperatingHours =
        finitePositiveNumber(
            exposure
                ?.totalOperatingHours
        );


    if (
        totalOperatingHours ===
        null
    ) {
        return unavailableResult(
            MTBF_REASON
                .INVALID_OPERATING_EXPOSURE
        );
    }


    if (
        !Array.isArray(
            failures
        )
    ) {
        return unavailableResult(
            MTBF_REASON
                .NO_ELIGIBLE_FAILURES,
            {
                operatingExposureHours:
                    totalOperatingHours,

                observedFailureCount:
                    0,
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Only already-qualified MTBF failures participate
    |--------------------------------------------------------------------------
    */

    const eligibleFailures =
        failures.filter(
            (failure) =>
                failure
                    ?.eligible ===
                true &&
                failure
                    ?.metric ===
                "MTBF"
        );


    /*
    |--------------------------------------------------------------------------
    | Important censoring rule
    |--------------------------------------------------------------------------
    |
    | Zero observed failures does NOT become infinite MTBF.
    |
    | With finite exposure and no failures, we only know that no validated
    | failure occurred during the observed exposure.
    |--------------------------------------------------------------------------
    */

    if (
        eligibleFailures.length ===
        0
    ) {
        return unavailableResult(
            MTBF_REASON
                .NO_ELIGIBLE_FAILURES,
            {
                operatingExposureHours:
                    totalOperatingHours,

                observedFailureCount:
                    0,

                zeroFailureInterpretation:
                    "CENSORED_NO_FAILURE_OBSERVED",
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Build exposure-key set
    |--------------------------------------------------------------------------
    */

    const exposureKeys =
        new Set(
            Object.keys(
                exposure
                    ?.equipment ??
                {}
            )
        );


    if (
        exposureKeys.size ===
        0
    ) {
        return unavailableResult(
            MTBF_REASON
                .INVALID_OPERATING_EXPOSURE
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Deduplicate physical failures
    |--------------------------------------------------------------------------
    */

    const seenFailures =
        new Set();

    const uniqueFailures = [];

    let duplicateFailureCount =
        0;


    eligibleFailures.forEach(
        (
            failure,
            index
        ) => {
            const key =
                buildFailureKey(
                    failure,
                    index
                );


            if (
                seenFailures.has(
                    key
                )
            ) {
                duplicateFailureCount +=
                    1;

                return;
            }


            seenFailures.add(
                key
            );

            uniqueFailures.push(
                failure
            );
        }
    );


    if (
        uniqueFailures.length ===
        0
    ) {
        return unavailableResult(
            MTBF_REASON
                .NO_ELIGIBLE_FAILURES,
            {
                operatingExposureHours:
                    totalOperatingHours,

                observedFailureCount:
                    0,

                duplicateFailureCount,
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Every failure must belong to equipment represented by exposure
    |--------------------------------------------------------------------------
    */

    const mismatchedFailures =
        uniqueFailures.filter(
            (failure) => {
                const reliabilityKey =
                    getFailureReliabilityKey(
                        failure
                    );

                return (
                    !reliabilityKey ||
                    !exposureKeys.has(
                        reliabilityKey
                    )
                );
            }
        );


    if (
        mismatchedFailures.length >
        0
    ) {
        return unavailableResult(
            MTBF_REASON
                .FAILURE_EXPOSURE_SCOPE_MISMATCH,
            {
                operatingExposureHours:
                    totalOperatingHours,

                observedFailureCount:
                    uniqueFailures.length,

                mismatchedFailureCount:
                    mismatchedFailures.length,

                duplicateFailureCount,
            }
        );
    }


    const failureCount =
        uniqueFailures.length;


    if (
        !Number.isInteger(
            failureCount
        ) ||
        failureCount <=
            0
    ) {
        return unavailableResult(
            MTBF_REASON
                .INVALID_FAILURE_COUNT,
            {
                operatingExposureHours:
                    totalOperatingHours,
            }
        );
    }


    const mtbfHours =
        totalOperatingHours /
        failureCount;


    if (
        !Number.isFinite(
            mtbfHours
        ) ||
        mtbfHours <=
            0
    ) {
        return unavailableResult(
            MTBF_REASON
                .INVALID_OPERATING_EXPOSURE
        );
    }


    return {
        status:
            MTBF_STATUS
                .CALCULATED,

        reason:
            MTBF_REASON
                .CALCULATED,

        mtbfHours,

        failureCount,

        operatingExposureHours:
            totalOperatingHours,

        equipmentCount:
            exposureKeys.size,

        inputFailureCount:
            failures.length,

        eligibleFailureCount:
            eligibleFailures.length,

        uniqueFailureCount:
            uniqueFailures.length,

        duplicateFailureCount,

        reliabilityKeys:
            [...exposureKeys],

        calculation: {
            numerator:
                totalOperatingHours,

            denominator:
                failureCount,

            formula:
                "MTBF = validated operating exposure hours / validated failure count",
        },
    };
}