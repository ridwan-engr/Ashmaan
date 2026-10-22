// services/engineering/engineeringAnalyticsApiService.js

import {
    FLEET_ENGINEERING_AGGREGATION_PHASE,
    FLEET_ENGINEERING_FAMILIES,
    extractExplicitEngineeringStatuses,
} from "./fleetEngineeringAggregationService.js";

import {
    PRODUCTION_ENGINEERING_SITE_FAMILY_PROVIDER_PHASE,
} from "./productionEngineeringSiteFamilyProvider.js";


export const ENGINEERING_ANALYTICS_API_PHASE =
    "8.9";

export const ENGINEERING_ANALYTICS_API_VERSION =
    "v1";

export const ENGINEERING_ANALYTICS_API_BASE_PATH =
    "/api/v1/engineering-analytics";

export const ENGINEERING_ANALYTICS_API_STATUS =
    Object.freeze({
        READY:
            "READY",

        EMPTY:
            "EMPTY",
    });

export const ENGINEERING_ANALYTICS_API_BOUNDARIES =
    Object.freeze({
        recalculatesEngineeringMetrics:
            false,

        mutatesEngineeringAggregate:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        infersEngineeringUnits:
            false,

        mergesDeviceTopologies:
            false,

        infersInstalledCapacity:
            false,

        infersIrradiance:
            false,

        infersBatterySoh:
            false,

        infersGeneratorFuel:
            false,

        infersGridDirection:
            false,

        infersCustomerInterruption:
            false,

        infersStandardsCompliance:
            false,

        persistsTelemetry:
            false,

        mutatesEvents:
            false,

        forecastingIncluded:
            false,

        financialBiIncluded:
            false,

        optimizationIncluded:
            false,
    });


function isObject(
    value
) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(
            value
        )
    );
}


export function validateEngineeringAggregate(
    aggregate
) {
    if (
        !isObject(
            aggregate
        )
    ) {
        return {
            valid:
                false,

            reason:
                "ENGINEERING_AGGREGATE_REQUIRED",
        };
    }

    if (
        aggregate.phase !==
        FLEET_ENGINEERING_AGGREGATION_PHASE
    ) {
        return {
            valid:
                false,

            reason:
                "PHASE_8_8_AGGREGATE_REQUIRED",
        };
    }

    if (
        aggregate.layer !==
        "ENGINEERING_ANALYTICS"
    ) {
        return {
            valid:
                false,

            reason:
                "ENGINEERING_ANALYTICS_LAYER_REQUIRED",
        };
    }

    if (
        aggregate.scope !==
        "FLEET"
    ) {
        return {
            valid:
                false,

            reason:
                "FLEET_SCOPE_REQUIRED",
        };
    }

    if (
        !Array.isArray(
            aggregate.siteViews
        )
    ) {
        return {
            valid:
                false,

            reason:
                "SITE_VIEWS_REQUIRED",
        };
    }

    if (
        !isObject(
            aggregate.families
        )
    ) {
        return {
            valid:
                false,

            reason:
                "FAMILY_AGGREGATES_REQUIRED",
        };
    }

    return {
        valid:
            true,

        reason:
            null,
    };
}


function requireAggregate(
    aggregate
) {
    const validation =
        validateEngineeringAggregate(
            aggregate
        );

    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid Phase 8.8 engineering aggregate: ${validation.reason}`
        );
    }

    return aggregate;
}


export function normalizeEngineeringFamily(
    family
) {
    const normalized =
        String(
            family ??
            ""
        )
            .trim();

    return FLEET_ENGINEERING_FAMILIES.includes(
        normalized
    )
        ? normalized
        : null;
}


export function normalizeVrmSiteId(
    value
) {
    const normalized =
        String(
            value ??
            ""
        )
            .trim();

    return normalized.length >
        0
        ? normalized
        : null;
}


function installationSiteId(
    installation
) {
    return normalizeVrmSiteId(
        installation
            ?.vrmSiteId
    );
}


function buildApiEnvelope({
    resource,
    data,
    aggregate,
    metadata = {},
} = {}) {
    const validated =
        requireAggregate(
            aggregate
        );

    return {
        phase:
            ENGINEERING_ANALYTICS_API_PHASE,

        apiVersion:
            ENGINEERING_ANALYTICS_API_VERSION,

        resource,

        status:
            validated
                .eligibleSiteCount >
                0
                ? ENGINEERING_ANALYTICS_API_STATUS.READY
                : ENGINEERING_ANALYTICS_API_STATUS.EMPTY,

        reportingWindow:
            validated
                .reportingWindow,

        generatedFrom: {
            phase:
                validated.phase,

            layer:
                validated.layer,

            scope:
                validated.scope,
        },

        metadata,

        data,

        boundaries: {
            ...ENGINEERING_ANALYTICS_API_BOUNDARIES,

            aggregateReadOnly:
                true,

            reportingWindowPreserved:
                true,

            engineeringStatusesPreserved:
                true,
        },
    };
}


export function getEngineeringApiHealth(
    aggregate
) {
    const validated =
        requireAggregate(
            aggregate
        );

    return buildApiEnvelope({
        resource:
            "health",

        aggregate:
            validated,

        metadata: {
            endpoint:
                "health",
        },

        data: {
            ready:
                true,

            aggregatePhase:
                validated.phase,

            eligibleSiteCount:
                validated
                    .eligibleSiteCount,

            familyCount:
                validated
                    .familyCount,

            supportedFamilies:
                [
                    ...FLEET_ENGINEERING_FAMILIES,
                ],
        },
    });
}


export function getFleetEngineeringApiView(
    aggregate
) {
    const validated =
        requireAggregate(
            aggregate
        );

    return buildApiEnvelope({
        resource:
            "fleet",

        aggregate:
            validated,

        metadata: {
            eligibleSiteCount:
                validated
                    .eligibleSiteCount,

            familyCount:
                validated
                    .familyCount,
        },

        data: {
            eligibleSiteCount:
                validated
                    .eligibleSiteCount,

            familyCount:
                validated
                    .familyCount,

            families:
                validated
                    .families,

            boundaries:
                validated
                    .boundaries,
        },
    });
}

export function getTargetedEngineeringSiteFamilyApiView(
    targeted
) {
    if (
        targeted === null ||
        typeof targeted !== "object" ||
        Array.isArray(targeted)
    ) {
        throw new TypeError(
            "Targeted Engineering site-family result is required."
        );
    }


    const normalizedSiteId =
        normalizeVrmSiteId(
            targeted.vrmSiteId
        );


    if (
        !normalizedSiteId
    ) {
        const error =
            new Error(
                "VRM site ID is required."
            );

        error.statusCode =
            400;

        error.code =
            "VRM_SITE_ID_REQUIRED";

        throw error;
    }


    const normalizedFamily =
        normalizeEngineeringFamily(
            targeted.family
        );


    if (
        !normalizedFamily
    ) {
        const error =
            new Error(
                `Unsupported engineering family: ${targeted.family}`
            );

        error.statusCode =
            400;

        error.code =
            "UNSUPPORTED_ENGINEERING_FAMILY";

        throw error;
    }


    const reportingWindow =
        targeted.reportingWindow;


    if (
        reportingWindow === null ||
        typeof reportingWindow !== "object" ||
        Array.isArray(reportingWindow) ||
        !reportingWindow.start ||
        !reportingWindow.end ||
        reportingWindow.semantics !== "[start,end)"
    ) {
        const error =
            new Error(
                "Targeted Engineering reporting window is invalid."
            );

        error.statusCode =
            400;

        error.code =
            "ENGINEERING_REPORTING_WINDOW_INVALID";

        throw error;
    }


    const result =
        targeted.result ??
        null;


    if (
        result !== null &&
        (
            typeof result !== "object" ||
            Array.isArray(result)
        )
    ) {
        throw new TypeError(
            "Targeted Engineering family result is invalid."
        );
    }


    const familyView = {
        present:
            result !== null,

        result,

        explicitStatuses:
            extractExplicitEngineeringStatuses(
                result
            ),
    };


    return {
        phase:
            ENGINEERING_ANALYTICS_API_PHASE,

        apiVersion:
            ENGINEERING_ANALYTICS_API_VERSION,

        resource:
            "site-family",

        status:
            ENGINEERING_ANALYTICS_API_STATUS.READY,

        reportingWindow,

        generatedFrom: {
            phase:
                PRODUCTION_ENGINEERING_SITE_FAMILY_PROVIDER_PHASE,

            layer:
                "ENGINEERING_ANALYTICS",

            scope:
                "SITE_FAMILY",
        },

        metadata: {
            vrmSiteId:
                normalizedSiteId,

            family:
                normalizedFamily,

            present:
                familyView.present,
        },

        data: {
            vrmSiteId:
                normalizedSiteId,

            family:
                normalizedFamily,

            familyView,
        },

        boundaries: {
            ...ENGINEERING_ANALYTICS_API_BOUNDARIES,

            aggregateReadOnly:
                true,

            reportingWindowPreserved:
                true,

            engineeringStatusesPreserved:
                true,

            targetedExecution:
                true,

            fleetAggregationPerformed:
                false,
        },
    };
}


export function getEngineeringFamiliesApiView(
    aggregate
) {
    const validated =
        requireAggregate(
            aggregate
        );

    const families =
        FLEET_ENGINEERING_FAMILIES.map(
            (
                family
            ) => {
                const value =
                    validated
                        .families
                        ?.[family] ??
                    null;

                return {
                    family,

                    present:
                        value !==
                        null,

                    aggregate:
                        value,
                };
            }
        );

    return buildApiEnvelope({
        resource:
            "families",

        aggregate:
            validated,

        metadata: {
            familyCount:
                FLEET_ENGINEERING_FAMILIES
                    .length,
        },

        data: {
            families,
        },
    });
}


export function getEngineeringFamilyApiView(
    aggregate,
    family
) {
    const validated =
        requireAggregate(
            aggregate
        );

    const normalizedFamily =
        normalizeEngineeringFamily(
            family
        );

    if (
        !normalizedFamily
    ) {
        const error =
            new Error(
                `Unsupported engineering family: ${family}`
            );

        error.statusCode =
            400;

        error.code =
            "UNSUPPORTED_ENGINEERING_FAMILY";

        throw error;
    }

    const familyAggregate =
        validated
            .families
            ?.[normalizedFamily] ??
        null;

    return buildApiEnvelope({
        resource:
            "family",

        aggregate:
            validated,

        metadata: {
            family:
                normalizedFamily,

            present:
                familyAggregate !==
                null,
        },

        data: {
            family:
                normalizedFamily,

            aggregate:
                familyAggregate,
        },
    });
}


export function getEngineeringSitesApiView(
    aggregate
) {
    const validated =
        requireAggregate(
            aggregate
        );

    return buildApiEnvelope({
        resource:
            "sites",

        aggregate:
            validated,

        metadata: {
            siteCount:
                validated
                    .siteViews
                    .length,
        },

        data: {
            sites:
                validated
                    .siteViews,
        },
    });
}


export function findEngineeringSiteView(
    aggregate,
    vrmSiteId
) {
    const validated =
        requireAggregate(
            aggregate
        );

    const normalizedSiteId =
        normalizeVrmSiteId(
            vrmSiteId
        );

    if (
        !normalizedSiteId
    ) {
        return null;
    }

    return (
        validated
            .siteViews
            .find(
                (
                    siteView
                ) =>
                    installationSiteId(
                        siteView
                            ?.installation
                    ) ===
                    normalizedSiteId
            ) ??
        null
    );
}


export function getEngineeringSiteApiView(
    aggregate,
    vrmSiteId
) {
    const validated =
        requireAggregate(
            aggregate
        );

    const normalizedSiteId =
        normalizeVrmSiteId(
            vrmSiteId
        );

    if (
        !normalizedSiteId
    ) {
        const error =
            new Error(
                "VRM site ID is required."
            );

        error.statusCode =
            400;

        error.code =
            "VRM_SITE_ID_REQUIRED";

        throw error;
    }

    const siteView =
        findEngineeringSiteView(
            validated,
            normalizedSiteId
        );

    if (
        !siteView
    ) {
        const error =
            new Error(
                `Engineering site not found: ${normalizedSiteId}`
            );

        error.statusCode =
            404;

        error.code =
            "ENGINEERING_SITE_NOT_FOUND";

        throw error;
    }

    return buildApiEnvelope({
        resource:
            "site",

        aggregate:
            validated,

        metadata: {
            vrmSiteId:
                normalizedSiteId,
        },

        data: {
            site:
                siteView,
        },
    });
}


export function getEngineeringSiteFamilyApiView(
    aggregate,
    vrmSiteId,
    family
) {
    const validated =
        requireAggregate(
            aggregate
        );

    const normalizedFamily =
        normalizeEngineeringFamily(
            family
        );

    if (
        !normalizedFamily
    ) {
        const error =
            new Error(
                `Unsupported engineering family: ${family}`
            );

        error.statusCode =
            400;

        error.code =
            "UNSUPPORTED_ENGINEERING_FAMILY";

        throw error;
    }

    const normalizedSiteId =
        normalizeVrmSiteId(
            vrmSiteId
        );

    if (
        !normalizedSiteId
    ) {
        const error =
            new Error(
                "VRM site ID is required."
            );

        error.statusCode =
            400;

        error.code =
            "VRM_SITE_ID_REQUIRED";

        throw error;
    }

    const siteView =
        findEngineeringSiteView(
            validated,
            normalizedSiteId
        );

    if (
        !siteView
    ) {
        const error =
            new Error(
                `Engineering site not found: ${normalizedSiteId}`
            );

        error.statusCode =
            404;

        error.code =
            "ENGINEERING_SITE_NOT_FOUND";

        throw error;
    }

    const familyView =
        siteView
            ?.families
            ?.[normalizedFamily] ??
        {
            present:
                false,

            result:
                null,

            explicitStatuses:
                [],
        };

    return buildApiEnvelope({
        resource:
            "site-family",

        aggregate:
            validated,

        metadata: {
            vrmSiteId:
                normalizedSiteId,

            family:
                normalizedFamily,

            present:
                familyView
                    .present ===
                true,
        },

        data: {
            vrmSiteId:
                normalizedSiteId,

            family:
                normalizedFamily,

            familyView,
        },
    });
}


export function buildEngineeringAnalyticsApiSnapshot(
    aggregate
) {
    const validated =
        requireAggregate(
            aggregate
        );

    return {
        health:
            getEngineeringApiHealth(
                validated
            ),

        fleet:
            getFleetEngineeringApiView(
                validated
            ),

        families:
            getEngineeringFamiliesApiView(
                validated
            ),

        sites:
            getEngineeringSitesApiView(
                validated
            ),
    };
}


export function auditEngineeringAnalyticsApiBoundaries(
    envelope
) {
    return {
        phaseCorrect:
            envelope
                ?.phase ===
            ENGINEERING_ANALYTICS_API_PHASE,

        generatedFrom88:
            envelope
                ?.generatedFrom
                ?.phase ===
            "8.8",

        aggregateReadOnly:
            envelope
                ?.boundaries
                ?.aggregateReadOnly ===
            true,

        noRecalculation:
            envelope
                ?.boundaries
                ?.recalculatesEngineeringMetrics ===
            false,

        noMutation:
            envelope
                ?.boundaries
                ?.mutatesEngineeringAggregate ===
            false,

        missingNotZero:
            envelope
                ?.boundaries
                ?.missingMeansZero ===
            false,

        unavailableNotZero:
            envelope
                ?.boundaries
                ?.unavailableMeansZero ===
            false,

        noUnitInference:
            envelope
                ?.boundaries
                ?.infersEngineeringUnits ===
            false,

        noTopologyMerge:
            envelope
                ?.boundaries
                ?.mergesDeviceTopologies ===
            false,

        noEngineeringInference:
            envelope
                ?.boundaries
                ?.infersInstalledCapacity ===
                false &&
            envelope
                ?.boundaries
                ?.infersIrradiance ===
                false &&
            envelope
                ?.boundaries
                ?.infersBatterySoh ===
                false &&
            envelope
                ?.boundaries
                ?.infersGeneratorFuel ===
                false &&
            envelope
                ?.boundaries
                ?.infersGridDirection ===
                false &&
            envelope
                ?.boundaries
                ?.infersCustomerInterruption ===
                false &&
            envelope
                ?.boundaries
                ?.infersStandardsCompliance ===
                false,

        noPersistence:
            envelope
                ?.boundaries
                ?.persistsTelemetry ===
                false &&
            envelope
                ?.boundaries
                ?.mutatesEvents ===
                false,

        laterPhasesExcluded:
            envelope
                ?.boundaries
                ?.forecastingIncluded ===
                false &&
            envelope
                ?.boundaries
                ?.financialBiIncluded ===
                false &&
            envelope
                ?.boundaries
                ?.optimizationIncluded ===
                false,
    };
}


export default Object.freeze({
    ENGINEERING_ANALYTICS_API_PHASE,
    ENGINEERING_ANALYTICS_API_VERSION,
    ENGINEERING_ANALYTICS_API_BASE_PATH,
    ENGINEERING_ANALYTICS_API_STATUS,
    ENGINEERING_ANALYTICS_API_BOUNDARIES,

    validateEngineeringAggregate,
    normalizeEngineeringFamily,
    normalizeVrmSiteId,
    getEngineeringApiHealth,
    getFleetEngineeringApiView,
    getEngineeringFamiliesApiView,
    getEngineeringFamilyApiView,
    getEngineeringSitesApiView,
    findEngineeringSiteView,
    getEngineeringSiteApiView,
    getEngineeringSiteFamilyApiView,
    buildEngineeringAnalyticsApiSnapshot,
    auditEngineeringAnalyticsApiBoundaries,
});
