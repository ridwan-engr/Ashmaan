// services/engineering/generatorAvailabilitySemantics.js

/*
|--------------------------------------------------------------------------
| Phase 8.5H-A
| Generator Availability / Failure Semantic Qualification
|--------------------------------------------------------------------------
|
| Availability is NOT generator runtime.
|
| Availability answers:
|
|     "Was the generator capable of performing its required function
|      when that function was required?"
|
| Therefore:
|
| - RUNNING does not automatically prove availability
| - STOPPED does not automatically prove unavailability
| - zero generator power does not prove failure
| - active source != generator does not prove failure
| - an alarm does not automatically prove functional failure
| - communication loss does not automatically prove generator failure
|
| Current production evidence:
|
| - generator operating-state evidence exists
| - generator runtime evidence exists
| - generator power evidence exists
| - alarm/diagnostic evidence exists
| - generator demand/request evidence is NOT yet established
| - confirmed functional failure intervals are NOT yet established
|
| Therefore production availability remains unavailable.
|--------------------------------------------------------------------------
*/


export const GENERATOR_AVAILABILITY_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_FUNCTIONAL_STATE =
    Object.freeze({

        AVAILABLE:
            "AVAILABLE",

        UNAVAILABLE:
            "UNAVAILABLE",

        UNKNOWN:
            "UNKNOWN",
    });


export const GENERATOR_DEMAND_STATE =
    Object.freeze({

        REQUIRED:
            "REQUIRED",

        NOT_REQUIRED:
            "NOT_REQUIRED",

        UNKNOWN:
            "UNKNOWN",
    });


export const GENERATOR_FAILURE_CLASSIFICATION =
    Object.freeze({

        CONFIRMED_FUNCTIONAL_FAILURE:
            "CONFIRMED_FUNCTIONAL_FAILURE",

        SUSPECTED_FAILURE:
            "SUSPECTED_FAILURE",

        ALARM_ONLY:
            "ALARM_ONLY",

        COMMUNICATION_LOSS:
            "COMMUNICATION_LOSS",

        NORMAL_STOPPED:
            "NORMAL_STOPPED",

        UNKNOWN:
            "UNKNOWN",
    });


export const GENERATOR_AVAILABILITY_REASON =
    Object.freeze({

        AVAILABILITY_QUALIFIED:
            "AVAILABILITY_QUALIFIED",

        AVAILABILITY_PARTIAL:
            "AVAILABILITY_PARTIAL",

        GENERATOR_DEMAND_NOT_ESTABLISHED:
            "GENERATOR_DEMAND_NOT_ESTABLISHED",

        FUNCTIONAL_CAPABILITY_NOT_ESTABLISHED:
            "FUNCTIONAL_CAPABILITY_NOT_ESTABLISHED",

        FAILURE_INTERVALS_NOT_ESTABLISHED:
            "FAILURE_INTERVALS_NOT_ESTABLISHED",

        EXPOSURE_TIME_NOT_ESTABLISHED:
            "EXPOSURE_TIME_NOT_ESTABLISHED",

        NO_QUALIFIED_REQUIRED_INTERVALS:
            "NO_QUALIFIED_REQUIRED_INTERVALS",
    });


export const GENERATOR_AVAILABILITY_SEMANTICS =
    Object.freeze({

        availabilityDefinition:
            "CAPABILITY_WHEN_REQUIRED",

        availabilityFormula:
            "AVAILABLE_REQUIRED_TIME / TOTAL_REQUIRED_TIME",

        requiresDemandEvidence:
            true,

        requiresFunctionalCapabilityEvidence:
            true,

        requiresQualifiedExposureTime:
            true,

        requiresFailureIntervalEvidence:
            true,

        runtimeEqualsAvailability:
            false,

        stoppedEqualsUnavailable:
            false,

        runningEqualsAvailable:
            false,

        zeroPowerEqualsUnavailable:
            false,

        nonGeneratorActiveSourceEqualsUnavailable:
            false,

        alarmEqualsFailure:
            false,

        communicationLossEqualsFailure:
            false,

        maintenanceEqualsFailure:
            false,

        manualStopEqualsFailure:
            false,

        standbyStateEqualsFailure:
            false,
    });


export const GENERATOR_AVAILABILITY_BOUNDARIES =
    Object.freeze({

        GENERATOR_DEMAND_SIGNAL_ESTABLISHED:
            false,

        CONFIRMED_FUNCTIONAL_FAILURE_INTERVALS_ESTABLISHED:
            false,

        QUALIFIED_REQUIRED_EXPOSURE_ESTABLISHED:
            false,

        PRODUCTION_AVAILABILITY_CALCULABLE:
            false,

        PRODUCTION_FAILURE_RATE_CALCULABLE:
            false,

        PRODUCTION_REPAIR_RATE_CALCULABLE:
            false,

        STOPPED_STATE_IS_FAILURE:
            false,

        RUNNING_STATE_IS_AVAILABILITY:
            false,

        ZERO_POWER_IS_FAILURE:
            false,

        ACTIVE_SOURCE_NOT_GENERATOR_IS_FAILURE:
            false,

        ATTR_471_IS_AVAILABILITY:
            false,

        ATTR_416_STOPPED_IS_FAILURE:
            false,

        ATTR_416_RUNNING_IS_AVAILABILITY:
            false,

        ATTR_1166_IS_AVAILABILITY:
            false,

        ALARM_CONDITION_IS_AUTOMATIC_FAILURE:
            false,

        DIAGNOSTIC_ERROR_IS_AUTOMATIC_FAILURE:
            false,

        SERVICE_INTERVAL_IS_FAILURE:
            false,

        COMMUNICATION_LOSS_IS_FUNCTIONAL_FAILURE:
            false,

        MISSING_TELEMETRY_IS_DOWNTIME:
            false,

        GENERATOR_RUNTIME_IS_EXPOSURE_TIME:
            false,

        GENERATOR_RUNTIME_IS_AVAILABLE_TIME:
            false,

        GENERATOR_RUNTIME_IS_REQUIRED_TIME:
            false,

        HEALTHY_STANDBY_CAN_BE_AVAILABLE:
            true,
    });


export function canCalculateGeneratorAvailability({
    demandEvidenceQualified = false,
    functionalCapabilityEvidenceQualified = false,
    exposureTimeQualified = false,
    failureIntervalsQualified = false,
} = {}) {

    return (
        demandEvidenceQualified ===
            true &&
        functionalCapabilityEvidenceQualified ===
            true &&
        exposureTimeQualified ===
            true &&
        failureIntervalsQualified ===
            true
    );
}


export function classifyGeneratorFailureEvidence({
    confirmedFunctionalFailure = false,
    suspectedFailure = false,
    alarmOnly = false,
    communicationLoss = false,
    normalStopped = false,
} = {}) {

    if (
        confirmedFunctionalFailure ===
        true
    ) {

        return GENERATOR_FAILURE_CLASSIFICATION
            .CONFIRMED_FUNCTIONAL_FAILURE;
    }


    if (
        suspectedFailure ===
        true
    ) {

        return GENERATOR_FAILURE_CLASSIFICATION
            .SUSPECTED_FAILURE;
    }


    if (
        alarmOnly ===
        true
    ) {

        return GENERATOR_FAILURE_CLASSIFICATION
            .ALARM_ONLY;
    }


    if (
        communicationLoss ===
        true
    ) {

        return GENERATOR_FAILURE_CLASSIFICATION
            .COMMUNICATION_LOSS;
    }


    if (
        normalStopped ===
        true
    ) {

        return GENERATOR_FAILURE_CLASSIFICATION
            .NORMAL_STOPPED;
    }


    return GENERATOR_FAILURE_CLASSIFICATION
        .UNKNOWN;
}


export function classifyGeneratorFunctionalState({
    generatorRequired = false,
    confirmedFunctionalFailure = false,
    confirmedFunctionalCapability = false,
} = {}) {

    if (
        generatorRequired !==
        true
    ) {

        return GENERATOR_FUNCTIONAL_STATE
            .UNKNOWN;
    }


    if (
        confirmedFunctionalFailure ===
        true
    ) {

        return GENERATOR_FUNCTIONAL_STATE
            .UNAVAILABLE;
    }


    if (
        confirmedFunctionalCapability ===
        true
    ) {

        return GENERATOR_FUNCTIONAL_STATE
            .AVAILABLE;
    }


    return GENERATOR_FUNCTIONAL_STATE
        .UNKNOWN;
}


export default {

    GENERATOR_AVAILABILITY_STATUS,

    GENERATOR_FUNCTIONAL_STATE,

    GENERATOR_DEMAND_STATE,

    GENERATOR_FAILURE_CLASSIFICATION,

    GENERATOR_AVAILABILITY_REASON,

    GENERATOR_AVAILABILITY_SEMANTICS,

    GENERATOR_AVAILABILITY_BOUNDARIES,

    canCalculateGeneratorAvailability,

    classifyGeneratorFailureEvidence,

    classifyGeneratorFunctionalState,
};