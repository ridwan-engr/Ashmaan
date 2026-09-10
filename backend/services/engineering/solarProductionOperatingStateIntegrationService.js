// services/engineering/solarProductionOperatingStateIntegrationService.js

import {
    calculateSolarOperatingState,
} from "./solarOperatingStateService.js";

export const SOLAR_PRODUCTION_OPERATING_STATE_PHASE = "8.7H-E";

export const SOLAR_PRODUCTION_OPERATING_STATE_INTEGRATION_STATUS = Object.freeze({
    INTEGRATED: "INTEGRATED",
    NOT_INTEGRATED: "NOT_INTEGRATED",
});

export const SOLAR_PRODUCTION_OPERATING_STATE_REASON = Object.freeze({
    INTEGRATION_COMPLETE: "INTEGRATION_COMPLETE",
    PRODUCTION_SOLAR_SITE_RESULT_REQUIRED: "PRODUCTION_SOLAR_SITE_RESULT_REQUIRED",
    INVALID_SOLAR_FAMILY: "INVALID_SOLAR_FAMILY",
    INVALID_PRODUCTION_LAYER: "INVALID_PRODUCTION_LAYER",
    INVALID_H_D_PHASE: "INVALID_H_D_PHASE",
    POWER_INTEGRATION_REQUIRED: "POWER_INTEGRATION_REQUIRED",
    ENERGY_INTEGRATION_REQUIRED: "ENERGY_INTEGRATION_REQUIRED",
    INVALID_REPORTING_WINDOW: "INVALID_REPORTING_WINDOW",
    INVALID_REPORTING_WINDOW_SEMANTICS: "INVALID_REPORTING_WINDOW_SEMANTICS",
    PRODUCTION_EVIDENCE_REQUIRED: "PRODUCTION_EVIDENCE_REQUIRED",
    PRODUCTION_RECORDS_REQUIRED: "PRODUCTION_RECORDS_REQUIRED",
});

function asDate(value) {
    if (value === null || value === undefined) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeDeviceInstance(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return null;
    }
    return String(value);
}

export function validateProductionSolarOperatingStateInput(siteResult) {
    if (!siteResult || typeof siteResult !== "object") {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.PRODUCTION_SOLAR_SITE_RESULT_REQUIRED };
    }
    if (siteResult.family !== "SOLAR") {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.INVALID_SOLAR_FAMILY };
    }
    if (siteResult.layer !== "PRODUCTION") {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.INVALID_PRODUCTION_LAYER };
    }
    if (siteResult.phase !== "8.7H-D") {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.INVALID_H_D_PHASE };
    }
    if (siteResult?.analytics?.power?.integrationStatus !== "INTEGRATED") {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.POWER_INTEGRATION_REQUIRED };
    }
    if (siteResult?.analytics?.energy?.integrationStatus !== "INTEGRATED") {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.ENERGY_INTEGRATION_REQUIRED };
    }

    const start = asDate(siteResult?.reportingWindow?.start);
    const end = asDate(siteResult?.reportingWindow?.end);
    if (!start || !end || start >= end) {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.INVALID_REPORTING_WINDOW };
    }
    if (siteResult?.reportingWindow?.semantics !== "[start,end)") {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.INVALID_REPORTING_WINDOW_SEMANTICS };
    }
    if (!siteResult.evidence || typeof siteResult.evidence !== "object") {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.PRODUCTION_EVIDENCE_REQUIRED };
    }
    if (!Array.isArray(siteResult.evidence.records)) {
        return { valid: false, reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.PRODUCTION_RECORDS_REQUIRED };
    }

    return {
        valid: true,
        reason: null,
        reportingWindow: { start, end, semantics: "[start,end)" },
    };
}

export function buildProductionSolarOperatingStateDiagnostics({
    records = [],
    operatingState = null,
    selectedDeviceInstance = null,
    config = {},
} = {}) {
    const actualRecords = Array.isArray(records) ? records : [];
    const counts = new Map();

    for (const record of actualRecords) {
        const id = Number(record?.vrmAttributeId);
        if (!Number.isFinite(id)) continue;
        counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return {
        productionRecordCount: actualRecords.length,
        attr84ModeRecordCount: counts.get(84) ?? 0,
        attr85ChargerStateRecordCount: counts.get(85) ?? 0,
        attr518MpptStateRecordCount: counts.get(518) ?? 0,
        attr98ErrorCodeRecordCount: counts.get(98) ?? 0,
        attr583OffReasonRecordCount: counts.get(583) ?? 0,
        selectedDeviceInstance: normalizeDeviceInstance(selectedDeviceInstance),
        calculatorStatus: operatingState?.status ?? null,
        calculatorReason: operatingState?.reason ?? null,
        requireValidQuality: config?.requireValidQuality ?? true,
        requireRawAggregation: config?.requireRawAggregation ?? true,
    };
}

export function calculateProductionSolarOperatingState({
    records = [],
    start,
    end,
    selectedDeviceInstance = null,
    config = {},
    solarOperatingStateCalculator = calculateSolarOperatingState,
} = {}) {
    if (typeof solarOperatingStateCalculator !== "function") {
        throw new Error("solarOperatingStateCalculator must be a function.");
    }

    return solarOperatingStateCalculator({
        records,
        start,
        end,
        selectedDeviceInstance,
        config,
    });
}

export function integrateProductionSolarOperatingState({
    siteResult,
    selectedDeviceInstance = null,
    config = {},
    solarOperatingStateCalculator = calculateSolarOperatingState
} = {}) {
    const validation = validateProductionSolarOperatingStateInput(siteResult);
    if (validation.valid !== true) {
        throw new Error(`Invalid H-D production Solar result: ${validation.reason}`);
    }
    if (typeof solarOperatingStateCalculator !== "function") {
        throw new Error("solarOperatingStateCalculator must be a function.");
    }

    const records = siteResult.evidence.records;
    const operatingState = calculateProductionSolarOperatingState({
        records,
        start: siteResult.reportingWindow.start,
        end: siteResult.reportingWindow.end,
        selectedDeviceInstance,
        config,
        solarOperatingStateCalculator,
    });

    return {
        ...siteResult,
        phase: SOLAR_PRODUCTION_OPERATING_STATE_PHASE,
        analytics: {
            ...(siteResult.analytics ?? {}),
            operatingState: {
                integrationStatus: SOLAR_PRODUCTION_OPERATING_STATE_INTEGRATION_STATUS.INTEGRATED,
                phase: SOLAR_PRODUCTION_OPERATING_STATE_PHASE,
                reason: SOLAR_PRODUCTION_OPERATING_STATE_REASON.INTEGRATION_COMPLETE,
                value: operatingState,
                diagnostics: buildProductionSolarOperatingStateDiagnostics({
                    records,
                    operatingState,
                    selectedDeviceInstance,
                    config,
                }),
            },
        },
        boundaries: {
            ...(siteResult.boundaries ?? {}),
            solarOperatingStateIntegrated: true,
            operatingStateCalculated:
                operatingState?.status === "CALCULATED" ||
                operatingState?.status === "PARTIALLY_CALCULATED",
            modeOnEstablishesAvailability: false,
            errorCodeZeroEstablishesAvailability: false,
            mpptStateEstablishesIrradiance: false,
            offReasonAutomaticallyAttributesDowntime: false,
            numericStateCodeAutomaticallyNamed: false,
            multipleSolarChargersAutomaticallyAggregated: false,
            missingOperatingStateMeansFailure: false,
            missingOperatingStateMeansUnavailableSolarInstallation: false,
            operatingStateOverridesPowerEvidence: false,
            operatingStateOverridesEnergyEvidence: false,
            performanceCalculated: false,
            availabilityCalculated: false,
            installedCapacityInferred: false,
            irradianceInferred: false,
        },
    };
}

export function isProductionSolarOperatingStateAvailable(result) {
    const status = result?.analytics?.operatingState?.value?.status;
    return status === "CALCULATED" || status === "PARTIALLY_CALCULATED";
}

export function isProductionSolarOperatingStateUnavailable(result) {
    return result?.analytics?.operatingState?.value?.status === "UNAVAILABLE";
}

export function auditProductionSolarOperatingStateBoundaries(result) {
    return {
        integrationExecuted:
            result?.analytics?.operatingState?.integrationStatus ===
            SOLAR_PRODUCTION_OPERATING_STATE_INTEGRATION_STATUS.INTEGRATED,
        phaseAdvancedToHE: result?.phase === SOLAR_PRODUCTION_OPERATING_STATE_PHASE,
        reportingWindowSemanticsPreserved: result?.reportingWindow?.semantics === "[start,end)",
        powerPreserved: result?.analytics?.power?.integrationStatus === "INTEGRATED",
        energyPreserved: result?.analytics?.energy?.integrationStatus === "INTEGRATED",
        modeOnNotAvailability: result?.boundaries?.modeOnEstablishesAvailability === false,
        errorCodeZeroNotAvailability: result?.boundaries?.errorCodeZeroEstablishesAvailability === false,
        mpptStateNotIrradiance: result?.boundaries?.mpptStateEstablishesIrradiance === false,
        offReasonNotAutomaticDowntime: result?.boundaries?.offReasonAutomaticallyAttributesDowntime === false,
        numericStateNotAutomaticallyNamed: result?.boundaries?.numericStateCodeAutomaticallyNamed === false,
        multipleDevicesNotAutomaticallyAggregated:
            result?.boundaries?.multipleSolarChargersAutomaticallyAggregated === false,
        missingStateNotFailure: result?.boundaries?.missingOperatingStateMeansFailure === false,
        missingStateNotNoSolar:
            result?.boundaries?.missingOperatingStateMeansUnavailableSolarInstallation === false,
        operatingStateDoesNotOverridePower:
            result?.boundaries?.operatingStateOverridesPowerEvidence === false,
        operatingStateDoesNotOverrideEnergy:
            result?.boundaries?.operatingStateOverridesEnergyEvidence === false,
        performanceStillReserved: result?.boundaries?.performanceCalculated === false,
        availabilityStillReserved: result?.boundaries?.availabilityCalculated === false,
        capacityNotInferred: result?.boundaries?.installedCapacityInferred === false,
        irradianceNotInferred: result?.boundaries?.irradianceInferred === false,
    };
}

export default Object.freeze({
    SOLAR_PRODUCTION_OPERATING_STATE_PHASE,
    SOLAR_PRODUCTION_OPERATING_STATE_INTEGRATION_STATUS,
    SOLAR_PRODUCTION_OPERATING_STATE_REASON,
    validateProductionSolarOperatingStateInput,
    buildProductionSolarOperatingStateDiagnostics,
    calculateProductionSolarOperatingState,
    integrateProductionSolarOperatingState,
    isProductionSolarOperatingStateAvailable,
    isProductionSolarOperatingStateUnavailable,
    auditProductionSolarOperatingStateBoundaries,
});
