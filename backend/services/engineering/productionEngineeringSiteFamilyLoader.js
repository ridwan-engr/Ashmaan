import {
    getProductionSiteElectricalPerformance,
} from "./siteElectricalTelemetryAdapter.js";

import {
    calculateProductionEnergySourceAnalytics,
} from "./energySourceTelemetryAdapter.js";

import {
    getProductionBatteryAnalytics,
} from "./batteryTelemetryAdapter.js";

import {
    calculateGeneratorProductionAnalyticsFromMongo,
} from "./generatorProductionQueryService.js";

import {
    getProductionGridSiteAnalytics,
} from "./gridProductionAdapter.js";

import {
    getProductionSolarSiteAnalytics,
} from "./solarProductionAdapter.js";


export const PRODUCTION_ENGINEERING_SITE_FAMILY_LOADER_PHASE =
    "P.1H-G2-E2-B";


function requireNonEmptyString(
    value,
    field
) {
    if (
        typeof value !== "string" ||
        value.trim() === ""
    ) {
        throw new TypeError(
            `${field} is required.`
        );
    }

    return value.trim();
}


function requireReportingWindow(
    reportingWindow
) {
    if (
        reportingWindow === null ||
        typeof reportingWindow !== "object" ||
        Array.isArray(reportingWindow)
    ) {
        throw new TypeError(
            "reportingWindow is required."
        );
    }

    if (
        reportingWindow.semantics !==
        "[start,end)"
    ) {
        throw new TypeError(
            'reportingWindow semantics must be "[start,end)".'
        );
    }

    if (
        reportingWindow.start ===
            null ||
        reportingWindow.start ===
            undefined ||
        reportingWindow.end ===
            null ||
        reportingWindow.end ===
            undefined
    ) {
        throw new TypeError(
            "reportingWindow start and end are required."
        );
    }

    return reportingWindow;
}


function requireProducer(
    producer,
    name
) {
    if (
        typeof producer !==
        "function"
    ) {
        throw new TypeError(
            `${name} must be a function.`
        );
    }

    return producer;
}


export async function loadProductionEngineeringSiteFamilies({
    installation,
    installationId,
    vrmSiteId,
    reportingWindow,

    siteElectricalProducer =
        getProductionSiteElectricalPerformance,

    energySourceProducer =
        calculateProductionEnergySourceAnalytics,

    batteryProducer =
        getProductionBatteryAnalytics,

    generatorProducer =
        calculateGeneratorProductionAnalyticsFromMongo,

    gridProducer =
        getProductionGridSiteAnalytics,

    solarProducer =
        getProductionSolarSiteAnalytics,
} = {}) {

    /*
    |--------------------------------------------------------------------------
    | Authorization boundary
    |--------------------------------------------------------------------------
    |
    | `installation`, `installationId`, and `vrmSiteId` are supplied by the
    | scoped aggregate provider after UserInstallationAccess resolution.
    |
    | This loader MUST NOT discover or expand the user's installation scope.
    |--------------------------------------------------------------------------
    */

    if (
        installation === null ||
        typeof installation !== "object" ||
        Array.isArray(installation)
    ) {
        throw new TypeError(
            "Authorized installation object is required."
        );
    }


    const normalizedInstallationId =
        requireNonEmptyString(
            installationId,
            "installationId"
        );

    const normalizedVrmSiteId =
        requireNonEmptyString(
            vrmSiteId,
            "vrmSiteId"
        );

    const window =
        requireReportingWindow(
            reportingWindow
        );


    requireProducer(
        siteElectricalProducer,
        "siteElectricalProducer"
    );

    requireProducer(
        energySourceProducer,
        "energySourceProducer"
    );

    requireProducer(
        batteryProducer,
        "batteryProducer"
    );

    requireProducer(
        generatorProducer,
        "generatorProducer"
    );

    requireProducer(
        gridProducer,
        "gridProducer"
    );

    requireProducer(
        solarProducer,
        "solarProducer"
    );


    /*
    |--------------------------------------------------------------------------
    | Preserve the exact authorized reporting window
    |--------------------------------------------------------------------------
    |
    | Do not widen, truncate, interpolate, or reinterpret [start,end).
    |--------------------------------------------------------------------------
    */

    const start =
        window.start;

    const end =
        window.end;


    /*
    |--------------------------------------------------------------------------
    | Production family execution
    |--------------------------------------------------------------------------
    |
    | These are persisted-data Engineering Analytics producers.
    |
    | Do not perform VRM synchronization here.
    |--------------------------------------------------------------------------
    */

    const [
        siteElectrical,
        energySource,
        battery,
        generator,
        grid,
        solar,
    ] =
        await Promise.all([
            siteElectricalProducer({
                vrmSiteId:
                    normalizedVrmSiteId,

                start,
                end,
            }),

            energySourceProducer({
                vrmSiteId:
                    normalizedVrmSiteId,

                start,
                end,
            }),

            batteryProducer({
                vrmSiteId:
                    normalizedVrmSiteId,

                start,
                end,
            }),

            generatorProducer({
                installationId:
                    normalizedInstallationId,

                start,
                end,
            }),

            gridProducer({
                installationId:
                    normalizedInstallationId,

                vrmSiteId:
                    normalizedVrmSiteId,

                start,
                end,
            }),

            solarProducer({
                installationId:
                    normalizedInstallationId,

                vrmSiteId:
                    normalizedVrmSiteId,

                start,
                end,
            }),
        ]);


    /*
    |--------------------------------------------------------------------------
    | Phase 8.8 exact family contract
    |--------------------------------------------------------------------------
    |
    | Results are passed through unchanged.
    |
    | No result is converted to zero.
    | No unavailable result is converted to zero.
    | No family is inferred from another family.
    |--------------------------------------------------------------------------
    */

    return Object.freeze({
        siteElectrical:
            siteElectrical ?? null,

        energySource:
            energySource ?? null,

        battery:
            battery ?? null,

        generator:
            generator ?? null,

        grid:
            grid ?? null,

        solar:
            solar ?? null,
    });
}

export async function loadProductionEngineeringSiteFamily({
    family,
    installation,
    installationId,
    vrmSiteId,
    reportingWindow,

    siteElectricalProducer =
        getProductionSiteElectricalPerformance,

    energySourceProducer =
        calculateProductionEnergySourceAnalytics,

    batteryProducer =
        getProductionBatteryAnalytics,

    generatorProducer =
        calculateGeneratorProductionAnalyticsFromMongo,

    gridProducer =
        getProductionGridSiteAnalytics,

    solarProducer =
        getProductionSolarSiteAnalytics,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | Authorization boundary
    |--------------------------------------------------------------------------
    |
    | installation / installationId / vrmSiteId MUST already come from the
    | resolved Engineering Analytics authorization scope.
    |--------------------------------------------------------------------------
    */

    if (
        installation === null ||
        typeof installation !== "object" ||
        Array.isArray(installation)
    ) {
        throw new TypeError(
            "Authorized installation object is required."
        );
    }

    const normalizedInstallationId =
        requireNonEmptyString(
            installationId,
            "installationId"
        );

    const normalizedVrmSiteId =
        requireNonEmptyString(
            vrmSiteId,
            "vrmSiteId"
        );

    const normalizedFamily =
        requireNonEmptyString(
            family,
            "family"
        );

    const window =
        requireReportingWindow(
            reportingWindow
        );

    const start =
        window.start;

    const end =
        window.end;

    /*
    |--------------------------------------------------------------------------
    | Execute exactly one requested family
    |--------------------------------------------------------------------------
    */

    switch (
        normalizedFamily
    ) {
        case "siteElectrical":
            requireProducer(
                siteElectricalProducer,
                "siteElectricalProducer"
            );

            return (
                await siteElectricalProducer({
                    vrmSiteId:
                        normalizedVrmSiteId,
                    start,
                    end,
                })
            ) ?? null;


        case "energySource":
            requireProducer(
                energySourceProducer,
                "energySourceProducer"
            );

            return (
                await energySourceProducer({
                    vrmSiteId:
                        normalizedVrmSiteId,
                    start,
                    end,
                })
            ) ?? null;


        case "battery":
            requireProducer(
                batteryProducer,
                "batteryProducer"
            );

            return (
                await batteryProducer({
                    vrmSiteId:
                        normalizedVrmSiteId,
                    start,
                    end,
                })
            ) ?? null;


        case "generator":
            requireProducer(
                generatorProducer,
                "generatorProducer"
            );

            return (
                await generatorProducer({
                    installationId:
                        normalizedInstallationId,
                    start,
                    end,
                })
            ) ?? null;


        case "grid":
            requireProducer(
                gridProducer,
                "gridProducer"
            );

            return (
                await gridProducer({
                    installationId:
                        normalizedInstallationId,

                    vrmSiteId:
                        normalizedVrmSiteId,

                    start,
                    end,
                })
            ) ?? null;


        case "solar":
            requireProducer(
                solarProducer,
                "solarProducer"
            );

            return (
                await solarProducer({
                    installationId:
                        normalizedInstallationId,

                    vrmSiteId:
                        normalizedVrmSiteId,

                    start,
                    end,
                })
            ) ?? null;


        default: {
            const error =
                new Error(
                    `Unsupported engineering family: ${normalizedFamily}`
                );

            error.statusCode =
                400;

            error.code =
                "UNSUPPORTED_ENGINEERING_FAMILY";

            throw error;
        }
    }
}


export default Object.freeze({
    PRODUCTION_ENGINEERING_SITE_FAMILY_LOADER_PHASE,
    loadProductionEngineeringSiteFamilies,
    loadProductionEngineeringSiteFamily,
});
