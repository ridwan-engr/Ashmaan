// services/engineering/siteElectricalTelemetryAdapter.js

import {
    Installation,
    Telemetry,
} from "../../models/index.js";

import {
    SERVED_LOAD_ATTRIBUTES,
    calculateSiteElectricalPerformance,
} from "./siteElectricalPerformanceService.js";


/*
|--------------------------------------------------------------------------
| Attribute helpers
|--------------------------------------------------------------------------
*/

function getFamilyAttributeIds(
    family = "PRIMARY"
) {

    const normalized =
        String(
            family
        )
            .trim()
            .toUpperCase();


    const attributes =
        SERVED_LOAD_ATTRIBUTES[
            normalized
        ];


    if (!attributes) {
        throw new Error(
            `Unsupported served-load family: ${family}`
        );
    }


    return Object.values(
        attributes
    );
}


/*
|--------------------------------------------------------------------------
| Installation lookup
|--------------------------------------------------------------------------
*/

export async function findInstallationByVrmSiteId(
    vrmSiteId
) {

    if (
        vrmSiteId === null ||
        vrmSiteId === undefined ||
        String(vrmSiteId).trim() === ""
    ) {
        return null;
    }


    /*
     * Support either numeric or string persisted VRM IDs without
     * changing the Installation schema.
     */
    const raw =
        String(
            vrmSiteId
        ).trim();


    const candidates =
        [
            raw,
        ];


    const numeric =
        Number(
            raw
        );


    if (
        Number.isFinite(
            numeric
        )
    ) {
        candidates.push(
            numeric
        );
    }


    return Installation.findOne({
        vrmSiteId: {
            $in:
                candidates,
        },
    })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Read qualified load telemetry from MongoDB
|--------------------------------------------------------------------------
*/

export async function getSiteServedLoadTelemetry({
    installationId,

    start,

    end,

    family =
        "PRIMARY",
} = {}) {

    if (!installationId) {
        throw new Error(
            "installationId is required."
        );
    }


    const windowStart =
        start instanceof Date
            ? start
            : new Date(
                start
            );


    const windowEnd =
        end instanceof Date
            ? end
            : new Date(
                end
            );


    if (
        Number.isNaN(
            windowStart.getTime()
        ) ||
        Number.isNaN(
            windowEnd.getTime()
        ) ||
        windowEnd <=
            windowStart
    ) {
        throw new Error(
            "A valid [start,end) reporting window is required."
        );
    }


    const attributeIds =
        getFamilyAttributeIds(
            family
        );


    return Telemetry.find({
        installation:
            installationId,

        vrmAttributeId: {
            $in:
                attributeIds,
        },

        timestamp: {
            $gte:
                windowStart,

            $lt:
                windowEnd,
        },
    })
        .select({
            _id: 1,
            installation: 1,
            timestamp: 1,
            vrmAttributeId: 1,
            numericValue: 1,
            value: 1,
            quality: 1,
            deviceType: 1,
            deviceInstance: 1,
            parameter: 1,
            description: 1,
            unit: 1,
        })
        .sort({
            timestamp: 1,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Production site electrical performance
|--------------------------------------------------------------------------
*/

export async function getProductionSiteElectricalPerformance({
    vrmSiteId,

    start,

    end,

    family =
        "PRIMARY",

    config = {},
} = {}) {

    const installation =
        await findInstallationByVrmSiteId(
            vrmSiteId
        );


    if (!installation) {

        return {
            status:
                "INSTALLATION_NOT_FOUND",

            installation:
                null,

            telemetry:
                {
                    recordCount:
                        0,
                },

            performance:
                null,
        };
    }


    const records =
        await getSiteServedLoadTelemetry({
            installationId:
                installation._id,

            start,

            end,

            family,
        });


    const performance =
        calculateSiteElectricalPerformance({
            records,

            vrmSiteId:
                String(
                    installation.vrmSiteId
                ),

            installationId:
                String(
                    installation._id
                ),

            start,

            end,

            family,

            config,
        });


    return {
        status:
            "OK",

        installation: {
            id:
                String(
                    installation._id
                ),

            vrmSiteId:
                installation.vrmSiteId,

            name:
                installation.name ??
                null,

            status:
                installation.status ??
                null,

            syncEnabled:
                installation.syncEnabled ??
                null,

            lastSeenAt:
                installation.lastSeenAt ??
                null,

            lastSyncAt:
                installation.lastSyncAt ??
                null,
        },

        telemetry: {
            family,

            recordCount:
                records.length,

            attributeIds:
                getFamilyAttributeIds(
                    family
                ),
        },

        performance,
    };
}


export default {
    findInstallationByVrmSiteId,

    getSiteServedLoadTelemetry,

    getProductionSiteElectricalPerformance,
};
