// services/engineering/fleetEngineeringAggregationService.js

/*
|--------------------------------------------------------------------------
| Phase 8.8
| Fleet Engineering Aggregation
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Compose already-validated per-site Engineering Analytics results into a
| fleet-level engineering view without recalculating or reinterpreting any
| upstream engineering metric.
|
| ARCHITECTURAL POSITION
|
| VRM
|   -> ingestion
|   -> raw telemetry
|   -> normalized telemetry
|   -> events
|   -> aggregated time-series
|   -> analytics
|   -> KPI database
|   -> REST API
|   -> React
|
| This service belongs to the Engineering Analytics layer. It DOES NOT:
|
| - query VRM
| - query raw or normalized telemetry
| - mutate Phase 7 events
| - calculate per-site electrical metrics
| - infer engineering units
| - infer source direction
| - infer installed Solar capacity
| - infer irradiance
| - infer Battery capacity / SOH / cycle life
| - fabricate Generator fuel or runtime semantics
| - fabricate Grid availability / customer interruption
| - merge incompatible device topologies
| - silently coerce missing family results to zero
| - persist telemetry
|
| INPUT CONTRACT
|
| {
|   sites: [
|     {
|       installation: <stable installation object>,
|       families: {
|         siteElectrical: <validated upstream result | null>,
|         energySource:   <validated upstream result | null>,
|         battery:        <validated upstream result | null>,
|         generator:      <validated upstream result | null>,
|         grid:           <validated upstream result | null>,
|         solar:          <validated upstream result | null>,
|       }
|     }
|   ],
|   reportingWindow: {
|     start,
|     end,
|     semantics: "[start,end)"
|   }
| }
|
| OUTPUT
|
| - preserves each upstream family object by reference
| - preserves installation objects by reference
| - counts explicit engineering statuses only
| - reports missing family results separately
| - exposes fleet coverage / qualification, not fabricated engineering values
|
*/

export const FLEET_ENGINEERING_AGGREGATION_PHASE =
    "8.8";

export const FLEET_ENGINEERING_AGGREGATION_LAYER =
    "ENGINEERING_ANALYTICS";

export const FLEET_ENGINEERING_AGGREGATION_SCOPE =
    "FLEET";

export const FLEET_ENGINEERING_REPORTING_SEMANTICS =
    "[start,end)";

export const FLEET_ENGINEERING_FAMILIES =
    Object.freeze([
        "siteElectrical",
        "energySource",
        "battery",
        "generator",
        "grid",
        "solar",
    ]);

export const FLEET_ENGINEERING_EXPLICIT_STATUSES =
    Object.freeze([
        "CALCULATED",
        "PARTIALLY_CALCULATED",
        "UNAVAILABLE",
    ]);

export const FLEET_ENGINEERING_AGGREGATION_STATUS =
    Object.freeze({
        AGGREGATED: "AGGREGATED",
        EMPTY_FLEET: "EMPTY_FLEET",
    });

export const FLEET_ENGINEERING_REASON =
    Object.freeze({
        AGGREGATION_COMPLETE:
            "AGGREGATION_COMPLETE",

        EMPTY_SITE_POPULATION:
            "EMPTY_SITE_POPULATION",
    });

export const FLEET_ENGINEERING_BOUNDARIES =
    Object.freeze({
        upstreamResultsRecalculated:
            false,

        upstreamResultsMutated:
            false,

        missingFamilyMeansZero:
            false,

        missingFamilyMeansUnavailable:
            false,

        unavailableMeansZero:
            false,

        unresolvedUnitsCombined:
            false,

        incompatibleTopologiesMerged:
            false,

        installedSolarCapacityInferred:
            false,

        irradianceInferred:
            false,

        batteryCapacityInferred:
            false,

        batterySohInferred:
            false,

        generatorFuelSemanticsInferred:
            false,

        gridDirectionInferred:
            false,

        customerInterruptionInferred:
            false,

        standardsComplianceInferred:
            false,

        telemetryPersisted:
            false,

        eventsMutated:
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


function asDate(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );

    return Number.isFinite(
        date.getTime()
    )
        ? date
        : null;
}


export function validateFleetEngineeringReportingWindow(
    reportingWindow
) {
    if (
        !isObject(
            reportingWindow
        )
    ) {
        return {
            valid:
                false,

            reason:
                "REPORTING_WINDOW_REQUIRED",
        };
    }

    const start =
        asDate(
            reportingWindow
                .start
        );

    const end =
        asDate(
            reportingWindow
                .end
        );

    if (
        !start ||
        !end ||
        end.getTime() <=
            start.getTime()
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_REPORTING_WINDOW",
        };
    }

    if (
        reportingWindow
            .semantics !==
        FLEET_ENGINEERING_REPORTING_SEMANTICS
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_REPORTING_WINDOW_SEMANTICS",
        };
    }

    return {
        valid:
            true,

        reason:
            null,

        start,

        end,
    };
}


export function validateFleetEngineeringSiteEntry(
    site
) {
    if (
        !isObject(
            site
        )
    ) {
        return {
            valid:
                false,

            reason:
                "SITE_ENTRY_REQUIRED",
        };
    }

    if (
        !isObject(
            site.installation
        )
    ) {
        return {
            valid:
                false,

            reason:
                "INSTALLATION_REQUIRED",
        };
    }

    if (
        !isObject(
            site.families
        )
    ) {
        return {
            valid:
                false,

            reason:
                "FAMILIES_REQUIRED",
        };
    }

    return {
        valid:
            true,

        reason:
            null,
    };
}


export function isExplicitEngineeringStatus(
    value
) {
    return FLEET_ENGINEERING_EXPLICIT_STATUSES.includes(
        value
    );
}


function collectExplicitStatuses(
    value,
    output,
    visited
) {
    if (
        value === null ||
        value === undefined
    ) {
        return;
    }

    if (
        typeof value !==
        "object"
    ) {
        return;
    }

    if (
        visited.has(
            value
        )
    ) {
        return;
    }

    visited.add(
        value
    );

    if (
        isExplicitEngineeringStatus(
            value.status
        )
    ) {
        output.push({
            status:
                value.status,

            reason:
                value.reason ??
                null,
        });
    }

    if (
        Array.isArray(
            value
        )
    ) {
        for (
            const item
            of value
        ) {
            collectExplicitStatuses(
                item,
                output,
                visited
            );
        }

        return;
    }

    for (
        const nested
        of Object.values(
            value
        )
    ) {
        collectExplicitStatuses(
            nested,
            output,
            visited
        );
    }
}


export function extractExplicitEngineeringStatuses(
    familyResult
) {
    if (
        familyResult ===
            null ||
        familyResult ===
            undefined
    ) {
        return [];
    }

    const output =
        [];

    collectExplicitStatuses(
        familyResult,
        output,
        new WeakSet()
    );

    return output;
}


export function buildEngineeringStatusHistogram(
    statuses = []
) {
    const histogram = {
        CALCULATED:
            0,

        PARTIALLY_CALCULATED:
            0,

        UNAVAILABLE:
            0,
    };

    for (
        const entry
        of statuses
    ) {
        const status =
            typeof entry ===
                "string"
                ? entry
                : entry
                    ?.status;

        if (
            isExplicitEngineeringStatus(
                status
            )
        ) {
            histogram[
                status
            ] +=
                1;
        }
    }

    return histogram;
}


export function aggregateFleetEngineeringFamily(
    sites = [],
    family
) {
    if (
        !FLEET_ENGINEERING_FAMILIES.includes(
            family
        )
    ) {
        throw new Error(
            `Unsupported engineering family: ${family}`
        );
    }

    const statusEntries =
        [];

    const siteResults =
        [];

    let presentSiteCount =
        0;

    let missingSiteCount =
        0;

    let sitesWithExplicitStatus =
        0;

    let sitesWithoutExplicitStatus =
        0;

    for (
        const site
        of sites
    ) {
        const familyResult =
            site
                ?.families
                ?.[family] ??
            null;

        if (
            familyResult ===
            null
        ) {
            missingSiteCount +=
                1;

            siteResults.push({
                installation:
                    site.installation,

                family,

                present:
                    false,

                explicitStatuses:
                    [],

                result:
                    null,
            });

            continue;
        }

        presentSiteCount +=
            1;

        const explicitStatuses =
            extractExplicitEngineeringStatuses(
                familyResult
            );

        if (
            explicitStatuses.length >
            0
        ) {
            sitesWithExplicitStatus +=
                1;
        }
        else {
            sitesWithoutExplicitStatus +=
                1;
        }

        for (
            const status
            of explicitStatuses
        ) {
            statusEntries.push(
                status
            );
        }

        siteResults.push({
            installation:
                site.installation,

            family,

            present:
                true,

            explicitStatuses,

            result:
                familyResult,
        });
    }

    return {
        family,

        eligibleSiteCount:
            sites.length,

        presentSiteCount,

        missingSiteCount,

        sitesWithExplicitStatus,

        sitesWithoutExplicitStatus,

        explicitStatusCount:
            statusEntries.length,

        statusHistogram:
            buildEngineeringStatusHistogram(
                statusEntries
            ),

        siteResults,

        boundaries: {
            missingFamilyMeansZero:
                false,

            missingFamilyMeansUnavailable:
                false,

            unavailableMeansZero:
                false,

            valuesAggregated:
                false,

            unitsCombined:
                false,

            topologyMerged:
                false,

            upstreamResultsPreserved:
                true,
        },
    };
}


export function buildFleetEngineeringSiteView(
    site
) {
    const validation =
        validateFleetEngineeringSiteEntry(
            site
        );

    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid fleet engineering site entry: ${validation.reason}`
        );
    }

    const families =
        {};

    let presentFamilyCount =
        0;

    let missingFamilyCount =
        0;

    for (
        const family
        of FLEET_ENGINEERING_FAMILIES
    ) {
        const result =
            site
                .families
                [family] ??
            null;

        const present =
            result !==
            null;

        if (
            present
        ) {
            presentFamilyCount +=
                1;
        }
        else {
            missingFamilyCount +=
                1;
        }

        families[
            family
        ] = {
            present,

            result,

            explicitStatuses:
                extractExplicitEngineeringStatuses(
                    result
                ),
        };
    }

    return {
        installation:
            site.installation,

        presentFamilyCount,

        missingFamilyCount,

        families,

        boundaries: {
            missingFamilyMeansZero:
                false,

            missingFamilyMeansUnavailable:
                false,

            familyValuesRecalculated:
                false,

            familyResultsPreserved:
                true,
        },
    };
}


export function aggregateFleetEngineering({
    sites = [],
    reportingWindow,
} = {}) {
    if (
        !Array.isArray(
            sites
        )
    ) {
        throw new Error(
            "Fleet engineering sites must be an array."
        );
    }

    const windowValidation =
        validateFleetEngineeringReportingWindow(
            reportingWindow
        );

    if (
        windowValidation.valid !==
        true
    ) {
        throw new Error(
            `Invalid fleet engineering reporting window: ${windowValidation.reason}`
        );
    }

    for (
        const site
        of sites
    ) {
        const validation =
            validateFleetEngineeringSiteEntry(
                site
            );

        if (
            validation.valid !==
            true
        ) {
            throw new Error(
                `Invalid fleet engineering site entry: ${validation.reason}`
            );
        }
    }

    const siteViews =
        sites.map(
            buildFleetEngineeringSiteView
        );

    const families =
        {};

    for (
        const family
        of FLEET_ENGINEERING_FAMILIES
    ) {
        families[
            family
        ] =
            aggregateFleetEngineeringFamily(
                sites,
                family
            );
    }

    const status =
        sites.length >
            0
            ? FLEET_ENGINEERING_AGGREGATION_STATUS.AGGREGATED
            : FLEET_ENGINEERING_AGGREGATION_STATUS.EMPTY_FLEET;

    const reason =
        sites.length >
            0
            ? FLEET_ENGINEERING_REASON.AGGREGATION_COMPLETE
            : FLEET_ENGINEERING_REASON.EMPTY_SITE_POPULATION;

    return {
        phase:
            FLEET_ENGINEERING_AGGREGATION_PHASE,

        layer:
            FLEET_ENGINEERING_AGGREGATION_LAYER,

        scope:
            FLEET_ENGINEERING_AGGREGATION_SCOPE,

        status,

        reason,

        reportingWindow,

        eligibleSiteCount:
            sites.length,

        familyCount:
            FLEET_ENGINEERING_FAMILIES.length,

        siteViews,

        families,

        boundaries: {
            ...FLEET_ENGINEERING_BOUNDARIES,

            reportingWindowSemanticsPreserved:
                reportingWindow
                    .semantics ===
                FLEET_ENGINEERING_REPORTING_SEMANTICS,

            installationsPreserved:
                true,

            familyResultsPreserved:
                true,

            statusAggregationOnly:
                true,

            engineeringValuesAggregated:
                false,
        },
    };
}


export function auditFleetEngineeringAggregationBoundaries(
    result
) {
    return {
        phaseCorrect:
            result
                ?.phase ===
            FLEET_ENGINEERING_AGGREGATION_PHASE,

        layerCorrect:
            result
                ?.layer ===
            FLEET_ENGINEERING_AGGREGATION_LAYER,

        scopeCorrect:
            result
                ?.scope ===
            FLEET_ENGINEERING_AGGREGATION_SCOPE,

        reportingWindowPreserved:
            result
                ?.boundaries
                ?.reportingWindowSemanticsPreserved ===
            true,

        installationsPreserved:
            result
                ?.boundaries
                ?.installationsPreserved ===
            true,

        familyResultsPreserved:
            result
                ?.boundaries
                ?.familyResultsPreserved ===
            true,

        upstreamNotRecalculated:
            result
                ?.boundaries
                ?.upstreamResultsRecalculated ===
            false,

        upstreamNotMutated:
            result
                ?.boundaries
                ?.upstreamResultsMutated ===
            false,

        missingNotZero:
            result
                ?.boundaries
                ?.missingFamilyMeansZero ===
            false,

        missingNotUnavailable:
            result
                ?.boundaries
                ?.missingFamilyMeansUnavailable ===
            false,

        unavailableNotZero:
            result
                ?.boundaries
                ?.unavailableMeansZero ===
            false,

        unitsNotCombined:
            result
                ?.boundaries
                ?.unresolvedUnitsCombined ===
            false,

        topologyNotMerged:
            result
                ?.boundaries
                ?.incompatibleTopologiesMerged ===
            false,

        engineeringValuesNotAggregated:
            result
                ?.boundaries
                ?.engineeringValuesAggregated ===
            false,

        statusAggregationOnly:
            result
                ?.boundaries
                ?.statusAggregationOnly ===
            true,

        noForbiddenInference:
            result
                ?.boundaries
                ?.installedSolarCapacityInferred ===
                false &&
            result
                ?.boundaries
                ?.irradianceInferred ===
                false &&
            result
                ?.boundaries
                ?.batteryCapacityInferred ===
                false &&
            result
                ?.boundaries
                ?.batterySohInferred ===
                false &&
            result
                ?.boundaries
                ?.generatorFuelSemanticsInferred ===
                false &&
            result
                ?.boundaries
                ?.gridDirectionInferred ===
                false &&
            result
                ?.boundaries
                ?.customerInterruptionInferred ===
                false &&
            result
                ?.boundaries
                ?.standardsComplianceInferred ===
                false,

        noPersistenceSideEffects:
            result
                ?.boundaries
                ?.telemetryPersisted ===
                false &&
            result
                ?.boundaries
                ?.eventsMutated ===
                false,
    };
}


export default Object.freeze({
    FLEET_ENGINEERING_AGGREGATION_PHASE,
    FLEET_ENGINEERING_AGGREGATION_LAYER,
    FLEET_ENGINEERING_AGGREGATION_SCOPE,
    FLEET_ENGINEERING_REPORTING_SEMANTICS,
    FLEET_ENGINEERING_FAMILIES,
    FLEET_ENGINEERING_EXPLICIT_STATUSES,
    FLEET_ENGINEERING_AGGREGATION_STATUS,
    FLEET_ENGINEERING_REASON,
    FLEET_ENGINEERING_BOUNDARIES,

    validateFleetEngineeringReportingWindow,
    validateFleetEngineeringSiteEntry,
    isExplicitEngineeringStatus,
    extractExplicitEngineeringStatuses,
    buildEngineeringStatusHistogram,
    aggregateFleetEngineeringFamily,
    buildFleetEngineeringSiteView,
    aggregateFleetEngineering,
    auditFleetEngineeringAggregationBoundaries,
});
