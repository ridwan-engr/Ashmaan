import mongoose from "mongoose";

import Installation from "../../models/Installation.js";

import {
    USER_INSTALLATION_SCOPE_STATUS,
    getUserInstallationScope,
} from "./userInstallationScopeService.js";


export const ENGINEERING_ANALYTICS_SCOPE_STATUS =
    Object.freeze({
        RESOLVED: "RESOLVED",
        DENY: "DENY",
        UNAVAILABLE: "UNAVAILABLE",
    });


function normalizeObjectId(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(value).trim();

    if (
        !mongoose.Types.ObjectId.isValid(
            normalized
        )
    ) {
        return null;
    }

    return normalized;
}


function normalizeVrmSiteId(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(value).trim();

    return normalized === ""
        ? null
        : normalized;
}


function freezeInstallationScope(
    installation
) {
    return Object.freeze({
        installationId:
            String(
                installation._id
            ),

        vrmSiteId:
            normalizeVrmSiteId(
                installation.vrmSiteId
            ),

        installation,
    });
}


export async function getEngineeringAnalyticsInstallationScope({
    userId,
    resolveUserScope =
        getUserInstallationScope,
    installationModel =
        Installation,
} = {}) {
    const normalizedUserId =
        normalizeObjectId(
            userId
        );

    if (
        normalizedUserId ===
        null
    ) {
        return Object.freeze({
            status:
                ENGINEERING_ANALYTICS_SCOPE_STATUS.DENY,

            allowed:
                false,

            installations:
                Object.freeze([]),

            vrmSiteIds:
                Object.freeze([]),

            reason:
                "INVALID_USER_ID",

            equipmentControlAllowed:
                false,

            automaticDispatchAllowed:
                false,
        });
    }


    let userScope;

    try {
        userScope =
            await resolveUserScope({
                userId:
                    normalizedUserId,
            });
    }
    catch {
        return Object.freeze({
            status:
                ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,

            allowed:
                false,

            installations:
                Object.freeze([]),

            vrmSiteIds:
                Object.freeze([]),

            reason:
                "USER_INSTALLATION_SCOPE_UNAVAILABLE",

            equipmentControlAllowed:
                false,

            automaticDispatchAllowed:
                false,
        });
    }


    if (
        userScope?.status ===
        USER_INSTALLATION_SCOPE_STATUS.DENY
    ) {
        return Object.freeze({
            status:
                ENGINEERING_ANALYTICS_SCOPE_STATUS.DENY,

            allowed:
                false,

            installations:
                Object.freeze([]),

            vrmSiteIds:
                Object.freeze([]),

            reason:
                "USER_INSTALLATION_SCOPE_DENIED",

            equipmentControlAllowed:
                false,

            automaticDispatchAllowed:
                false,
        });
    }


    if (
        userScope?.status !==
        USER_INSTALLATION_SCOPE_STATUS.RESOLVED ||
        !Array.isArray(
            userScope.installationIds
        )
    ) {
        return Object.freeze({
            status:
                ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,

            allowed:
                false,

            installations:
                Object.freeze([]),

            vrmSiteIds:
                Object.freeze([]),

            reason:
                "USER_INSTALLATION_SCOPE_UNAVAILABLE",

            equipmentControlAllowed:
                false,

            automaticDispatchAllowed:
                false,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Zero entitlement
    |--------------------------------------------------------------------------
    |
    | Empty means empty.
    |
    | It MUST NOT be interpreted as unrestricted access.
    |
    */

    if (
        userScope.installationIds.length ===
        0
    ) {
        return Object.freeze({
            status:
                ENGINEERING_ANALYTICS_SCOPE_STATUS.RESOLVED,

            allowed:
                true,

            installations:
                Object.freeze([]),

            vrmSiteIds:
                Object.freeze([]),

            reason:
                "EMPTY_INSTALLATION_SCOPE",

            equipmentControlAllowed:
                false,

            automaticDispatchAllowed:
                false,
        });
    }


    const installationIds =
        userScope.installationIds
            .map(
                normalizeObjectId
            )
            .filter(
                Boolean
            );


    if (
        installationIds.length !==
        userScope.installationIds.length
    ) {
        return Object.freeze({
            status:
                ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,

            allowed:
                false,

            installations:
                Object.freeze([]),

            vrmSiteIds:
                Object.freeze([]),

            reason:
                "INVALID_INSTALLATION_SCOPE",

            equipmentControlAllowed:
                false,

            automaticDispatchAllowed:
                false,
        });
    }


    let records;

    try {
        records =
            await installationModel
                .find({
                    _id: {
                        $in:
                            installationIds,
                    },

                    source:
                        "VRM",
                })
                .select(
                    "_id vrmSiteId"
                )
                .lean();
    }
    catch {
        return Object.freeze({
            status:
                ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,

            allowed:
                false,

            installations:
                Object.freeze([]),

            vrmSiteIds:
                Object.freeze([]),

            reason:
                "INSTALLATION_SCOPE_REPOSITORY_UNAVAILABLE",

            equipmentControlAllowed:
                false,

            automaticDispatchAllowed:
                false,
        });
    }


    if (
        !Array.isArray(
            records
        )
    ) {
        return Object.freeze({
            status:
                ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,

            allowed:
                false,

            installations:
                Object.freeze([]),

            vrmSiteIds:
                Object.freeze([]),

            reason:
                "INSTALLATION_SCOPE_RESULT_INVALID",

            equipmentControlAllowed:
                false,

            automaticDispatchAllowed:
                false,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Entitlement integrity
    |--------------------------------------------------------------------------
    |
    | Every entitlement must resolve to exactly one local VRM Installation.
    |
    | Missing records are NOT silently discarded because that would convert
    | an inconsistent authorization state into a partially authorized scope.
    |
    */

    if (
        records.length !==
        installationIds.length
    ) {
        return Object.freeze({
            status:
                ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,

            allowed:
                false,

            installations:
                Object.freeze([]),

            vrmSiteIds:
                Object.freeze([]),

            reason:
                "INSTALLATION_SCOPE_INCOMPLETE",

            equipmentControlAllowed:
                false,

            automaticDispatchAllowed:
                false,
        });
    }


    const scopedInstallations =
        [];

    const vrmSiteIds =
        [];

    const seenVrmSiteIds =
        new Set();


    for (
        const record
        of records
    ) {
        const vrmSiteId =
            normalizeVrmSiteId(
                record?.vrmSiteId
            );

        if (
            vrmSiteId ===
            null
        ) {
            return Object.freeze({
                status:
                    ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,

                allowed:
                    false,

                installations:
                    Object.freeze([]),

                vrmSiteIds:
                    Object.freeze([]),

                reason:
                    "VRM_SITE_ID_REQUIRED",

                equipmentControlAllowed:
                    false,

                automaticDispatchAllowed:
                    false,
            });
        }


        scopedInstallations.push(
            freezeInstallationScope(
                record
            )
        );


        if (
            !seenVrmSiteIds.has(
                vrmSiteId
            )
        ) {
            seenVrmSiteIds.add(
                vrmSiteId
            );

            vrmSiteIds.push(
                vrmSiteId
            );
        }
    }


    return Object.freeze({
        status:
            ENGINEERING_ANALYTICS_SCOPE_STATUS.RESOLVED,

        allowed:
            true,

        installations:
            Object.freeze(
                scopedInstallations
            ),

        vrmSiteIds:
            Object.freeze(
                vrmSiteIds
            ),

        reason:
            "INSTALLATION_SCOPE_RESOLVED",

        equipmentControlAllowed:
            false,

        automaticDispatchAllowed:
            false,
    });
}


export default Object.freeze({
    ENGINEERING_ANALYTICS_SCOPE_STATUS,
    getEngineeringAnalyticsInstallationScope,
});
