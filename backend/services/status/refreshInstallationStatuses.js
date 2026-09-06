import {
    Installation,
} from "../../models/index.js";

import {
    deriveInstallationStatus,
} from "./installationStatusService.js";


const refreshInstallationStatuses =
    async () => {
        const installations =
            await Installation.find({
                source: "VRM",
            });

        const now =
            new Date();

        let updated = 0;
        let unchanged = 0;

        const counts = {
            ONLINE: 0,
            STALE: 0,
            OFFLINE: 0,
            UNKNOWN: 0,
            INACTIVE: 0,
        };

        for (
            const installation
            of installations
        ) {
            const derived =
                deriveInstallationStatus({
                    lastSeenAt:
                        installation
                            .lastSeenAt,

                    syncEnabled:
                        installation
                            .syncEnabled,

                    persistedStatus:
                        installation
                            .status,

                    now,
                });

            counts[
                derived.status
            ] += 1;

            if (
                installation.status !==
                derived.status
            ) {
                await Installation.updateOne(
                    {
                        _id:
                            installation._id,
                    },
                    {
                        $set: {
                            status:
                                derived.status,
                        },
                    }
                );

                updated += 1;
            } else {
                unchanged += 1;
            }
        }

        return {
            total:
                installations.length,

            updated,

            unchanged,

            counts,

            refreshedAt:
                now,
        };
    };


export {
    refreshInstallationStatuses,
};