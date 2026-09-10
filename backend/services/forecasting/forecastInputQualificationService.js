// services/forecasting/forecastInputQualificationService.js

import {
    FORECASTING_PHASE as FORECASTING_CONTRACT_PHASE,
    FORECASTING_REPORTING_SEMANTICS,
    FORECAST_INPUT_STATUS,
} from "./forecastingContract.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.2 — Forecast Input Qualification
|--------------------------------------------------------------------------
|
| Purpose:
| Qualify observed upstream data for later forecasting checkpoints.
|
| This service does NOT:
| - train a forecasting model
| - select an algorithm
| - engineer predictive features
| - resample observations
| - interpolate missing values
| - remove outliers
| - infer engineering units
| - merge unresolved device topologies
| - persist forecasts
| - expose an API
| - expose a dashboard
|
|--------------------------------------------------------------------------
*/

export const FORECAST_INPUT_QUALIFICATION_PHASE =
    "9.2";

export const FORECAST_INPUT_QUALIFICATION_LAYER =
    "FORECASTING";

export const FORECAST_INPUT_QUALIFICATION_UPSTREAM_PHASE =
    FORECASTING_CONTRACT_PHASE;

export const FORECAST_INPUT_QUALIFICATION_SEMANTICS =
    FORECASTING_REPORTING_SEMANTICS;


export const FORECAST_OBSERVATION_STATUS =
    Object.freeze({
        VALID:
            "VALID",

        INVALID_TIMESTAMP:
            "INVALID_TIMESTAMP",

        OUTSIDE_TRAINING_WINDOW:
            "OUTSIDE_TRAINING_WINDOW",

        FUTURE_LEAKAGE:
            "FUTURE_LEAKAGE",

        INVALID_VALUE:
            "INVALID_VALUE",

        UNIT_MISSING:
            "UNIT_MISSING",

        UNIT_MISMATCH:
            "UNIT_MISMATCH",

        DUPLICATE_TIMESTAMP:
            "DUPLICATE_TIMESTAMP",
    });


export const FORECAST_INPUT_REASON =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        PARTIALLY_QUALIFIED:
            "PARTIALLY_QUALIFIED",

        NO_OBSERVATIONS:
            "NO_OBSERVATIONS",

        NO_VALID_OBSERVATIONS:
            "NO_VALID_OBSERVATIONS",

        UNIT_UNRESOLVED:
            "UNIT_UNRESOLVED",

        TEMPORAL_LEAKAGE_PRESENT:
            "TEMPORAL_LEAKAGE_PRESENT",

        DUPLICATE_TIMESTAMPS_PRESENT:
            "DUPLICATE_TIMESTAMPS_PRESENT",

        COVERAGE_INSUFFICIENT:
            "COVERAGE_INSUFFICIENT",
    });


export const FORECAST_INPUT_BOUNDARIES =
    Object.freeze({
        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        invalidObservationMeansZero:
            false,

        unitInferenceAllowed:
            false,

        resamplingAllowed:
            false,

        interpolationAllowed:
            false,

        outlierRemovalAllowed:
            false,

        topologyMergeAllowed:
            false,

        futureDataAllowed:
            false,

        duplicateTimestampsAutomaticallyMerged:
            false,

        chronologicalSortingChangesSource:
            false,

        sourceMutated:
            false,

        observationsMutated:
            false,

        modelTrainingIncluded:
            false,

        featureEngineeringIncluded:
            false,

        forecastCalculationIncluded:
            false,

        persistenceIncluded:
            false,

        apiIncluded:
            false,

        dashboardIncluded:
            false,

        financialBiIncluded:
            false,

        optimizationDssIncluded:
            false,
    });


function asDate(
    value
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const date =
        value instanceof Date
            ? new Date(
                value.getTime()
            )
            : new Date(
                value
            );

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function finiteNumber(
    value
) {
    return (
        typeof value ===
            "number" &&
        Number.isFinite(
            value
        )
    );
}


function normalizeString(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(
            value
        ).trim();

    return normalized.length
        ? normalized
        : null;
}


function validateTimeContract(
    time
) {
    if (
        !time ||
        typeof time !==
            "object"
    ) {
        throw new Error(
            "Forecast input qualification requires a Phase 9.1 time contract."
        );
    }

    const trainingStart =
        asDate(
            time?.trainingWindow?.start
        );

    const trainingEnd =
        asDate(
            time?.trainingWindow?.end
        );

    const forecastOrigin =
        asDate(
            time?.forecastOrigin
        );

    if (
        !trainingStart ||
        !trainingEnd ||
        !forecastOrigin
    ) {
        throw new Error(
            "Forecast input qualification requires valid trainingStart, trainingEnd and forecastOrigin."
        );
    }

    if (
        time?.trainingWindow?.semantics !==
            FORECAST_INPUT_QUALIFICATION_SEMANTICS
    ) {
        throw new Error(
            "Forecast input qualification requires canonical [start,end) training semantics."
        );
    }

    if (
        trainingEnd.getTime() !==
            forecastOrigin.getTime()
    ) {
        throw new Error(
            "Training window must end exactly at forecast origin."
        );
    }

    if (
        trainingEnd <=
            trainingStart
    ) {
        throw new Error(
            "Training window end must be later than start."
        );
    }

    return {
        trainingStart,
        trainingEnd,
        forecastOrigin,
    };
}


function buildObservationRecord({
    observation,
    index,
    expectedUnit,
    trainingStart,
    trainingEnd,
    seenTimestamps,
} = {}) {
    const timestamp =
        asDate(
            observation?.timestamp
        );

    const value =
        observation?.value;

    const unit =
        normalizeString(
            observation?.unit
        );

    let status =
        FORECAST_OBSERVATION_STATUS.VALID;

    let reason =
        null;

    if (
        !timestamp
    ) {
        status =
            FORECAST_OBSERVATION_STATUS.INVALID_TIMESTAMP;

        reason =
            "INVALID_TIMESTAMP";
    }
    else if (
        timestamp >=
            trainingEnd
    ) {
        status =
            FORECAST_OBSERVATION_STATUS.FUTURE_LEAKAGE;

        reason =
            "TIMESTAMP_AT_OR_AFTER_FORECAST_ORIGIN";
    }
    else if (
        timestamp <
            trainingStart
    ) {
        status =
            FORECAST_OBSERVATION_STATUS.OUTSIDE_TRAINING_WINDOW;

        reason =
            "TIMESTAMP_BEFORE_TRAINING_START";
    }
    else if (
        !finiteNumber(
            value
        )
    ) {
        status =
            FORECAST_OBSERVATION_STATUS.INVALID_VALUE;

        reason =
            "VALUE_NOT_FINITE_NUMBER";
    }
    else if (
        expectedUnit &&
        !unit
    ) {
        status =
            FORECAST_OBSERVATION_STATUS.UNIT_MISSING;

        reason =
            "OBSERVATION_UNIT_MISSING";
    }
    else if (
        expectedUnit &&
        unit !==
            expectedUnit
    ) {
        status =
            FORECAST_OBSERVATION_STATUS.UNIT_MISMATCH;

        reason =
            "OBSERVATION_UNIT_MISMATCH";
    }
    else if (
        timestamp &&
        seenTimestamps.has(
            timestamp.getTime()
        )
    ) {
        status =
            FORECAST_OBSERVATION_STATUS.DUPLICATE_TIMESTAMP;

        reason =
            "DUPLICATE_TIMESTAMP";
    }

    if (
        timestamp
    ) {
        seenTimestamps.add(
            timestamp.getTime()
        );
    }

    return {
        index,
        observation,
        timestamp,
        value:
            finiteNumber(
                value
            )
                ? value
                : null,
        unit,
        status,
        reason,
        valid:
            status ===
                FORECAST_OBSERVATION_STATUS.VALID,
    };
}


function summarizeGaps(
    validRecords
) {
    if (
        validRecords.length <
            2
    ) {
        return {
            calculated:
                false,

            count:
                0,

            minSeconds:
                null,

            maxSeconds:
                null,

            meanSeconds:
                null,

            reason:
                "INSUFFICIENT_VALID_OBSERVATIONS",
        };
    }

    const sorted =
        [
            ...validRecords,
        ].sort(
            (
                a,
                b
            ) =>
                a.timestamp -
                b.timestamp
        );

    const gaps =
        [];

    for (
        let index = 1;
        index <
        sorted.length;
        index +=
            1
    ) {
        gaps.push(
            (
                sorted[
                    index
                ].timestamp -
                sorted[
                    index -
                    1
                ].timestamp
            ) /
                1000
        );
    }

    const total =
        gaps.reduce(
            (
                sum,
                value
            ) =>
                sum +
                value,
            0
        );

    return {
        calculated:
            true,

        count:
            gaps.length,

        minSeconds:
            Math.min(
                ...gaps
            ),

        maxSeconds:
            Math.max(
                ...gaps
            ),

        meanSeconds:
            total /
                gaps.length,

        reason:
            "OBSERVED_GAPS_CALCULATED",
    };
}


function determineInputStatus({
    observations,
    validRecords,
    records,
} = {}) {
    if (
        !observations.length
    ) {
        return {
            status:
                FORECAST_INPUT_STATUS.UNAVAILABLE,

            reason:
                FORECAST_INPUT_REASON.NO_OBSERVATIONS,
        };
    }

    if (
        !validRecords.length
    ) {
        return {
            status:
                FORECAST_INPUT_STATUS.UNAVAILABLE,

            reason:
                FORECAST_INPUT_REASON.NO_VALID_OBSERVATIONS,
        };
    }

    if (
        records.some(
            (
                record
            ) =>
                record.status ===
                    FORECAST_OBSERVATION_STATUS.FUTURE_LEAKAGE
        )
    ) {
        return {
            status:
                FORECAST_INPUT_STATUS.PARTIALLY_QUALIFIED,

            reason:
                FORECAST_INPUT_REASON.TEMPORAL_LEAKAGE_PRESENT,
        };
    }

    if (
        records.some(
            (
                record
            ) =>
                record.status ===
                    FORECAST_OBSERVATION_STATUS.UNIT_MISSING ||
                record.status ===
                    FORECAST_OBSERVATION_STATUS.UNIT_MISMATCH
        )
    ) {
        return {
            status:
                FORECAST_INPUT_STATUS.PARTIALLY_QUALIFIED,

            reason:
                FORECAST_INPUT_REASON.UNIT_UNRESOLVED,
        };
    }

    if (
        records.some(
            (
                record
            ) =>
                record.status ===
                    FORECAST_OBSERVATION_STATUS.DUPLICATE_TIMESTAMP
        )
    ) {
        return {
            status:
                FORECAST_INPUT_STATUS.PARTIALLY_QUALIFIED,

            reason:
                FORECAST_INPUT_REASON.DUPLICATE_TIMESTAMPS_PRESENT,
        };
    }

    if (
        validRecords.length !==
            observations.length
    ) {
        return {
            status:
                FORECAST_INPUT_STATUS.PARTIALLY_QUALIFIED,

            reason:
                FORECAST_INPUT_REASON.PARTIALLY_QUALIFIED,
        };
    }

    return {
        status:
            FORECAST_INPUT_STATUS.QUALIFIED,

        reason:
            FORECAST_INPUT_REASON.QUALIFIED,
    };
}


export function qualifyForecastInput({
    time,
    target,
    source,
    observations = [],
} = {}) {
    const {
        trainingStart,
        trainingEnd,
        forecastOrigin,
    } =
        validateTimeContract(
            time
        );

    if (
        !target ||
        typeof target !==
            "object"
    ) {
        throw new Error(
            "Forecast input qualification requires a Phase 9.1 target."
        );
    }

    if (
        !source ||
        typeof source !==
            "object"
    ) {
        throw new Error(
            "Forecast input qualification requires an upstream source object."
        );
    }

    if (
        !Array.isArray(
            observations
        )
    ) {
        throw new Error(
            "Forecast observations must be an array."
        );
    }

    const expectedUnit =
        normalizeString(
            target?.unit
        );

    const seenTimestamps =
        new Set();

    const records =
        observations.map(
            (
                observation,
                index
            ) =>
                buildObservationRecord({
                    observation,
                    index,
                    expectedUnit,
                    trainingStart,
                    trainingEnd,
                    seenTimestamps,
                })
        );

    const validRecords =
        records.filter(
            (
                record
            ) =>
                record.valid
        );

    const statusHistogram =
        Object.fromEntries(
            Object.values(
                FORECAST_OBSERVATION_STATUS
            ).map(
                (
                    status
                ) =>
                    [
                        status,
                        records.filter(
                            (
                                record
                            ) =>
                                record.status ===
                                    status
                        ).length,
                    ]
            )
        );

    const statusDecision =
        determineInputStatus({
            observations,
            validRecords,
            records,
        });

    const sortedValidRecords =
        [
            ...validRecords,
        ].sort(
            (
                a,
                b
            ) =>
                a.timestamp -
                b.timestamp
        );

    const firstValidTimestamp =
        sortedValidRecords.length
            ? sortedValidRecords[
                0
            ].timestamp
            : null;

    const lastValidTimestamp =
        sortedValidRecords.length
            ? sortedValidRecords[
                sortedValidRecords.length -
                    1
            ].timestamp
            : null;

    return {
        phase:
            FORECAST_INPUT_QUALIFICATION_PHASE,

        layer:
            FORECAST_INPUT_QUALIFICATION_LAYER,

        upstreamPhase:
            FORECAST_INPUT_QUALIFICATION_UPSTREAM_PHASE,

        semantics:
            FORECAST_INPUT_QUALIFICATION_SEMANTICS,

        time,

        target,

        source,

        observations,

        qualification:
            {
                status:
                    statusDecision.status,

                reason:
                    statusDecision.reason,

                totalObservationCount:
                    observations.length,

                validObservationCount:
                    validRecords.length,

                invalidObservationCount:
                    observations.length -
                    validRecords.length,

                firstValidTimestamp,

                lastValidTimestamp,

                forecastOrigin,

                expectedUnit,

                statusHistogram,

                gaps:
                    summarizeGaps(
                        validRecords
                    ),
            },

        records,

        validRecords,

        boundaries:
            FORECAST_INPUT_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECAST_INPUT_QUALIFICATION_PHASE,
    FORECAST_INPUT_QUALIFICATION_LAYER,
    FORECAST_INPUT_QUALIFICATION_UPSTREAM_PHASE,
    FORECAST_INPUT_QUALIFICATION_SEMANTICS,
    FORECAST_OBSERVATION_STATUS,
    FORECAST_INPUT_REASON,
    FORECAST_INPUT_BOUNDARIES,
    qualifyForecastInput,
});
