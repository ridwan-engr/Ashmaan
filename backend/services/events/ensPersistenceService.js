// backend/services/events/ensPersistenceService.js

import OutageEvent from "../../models/OutageEvent.js";


function finite(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return false;
    }

    return Number.isFinite(
        Number(value)
    );
}


function ensureRaw(raw) {
    if (
        raw &&
        typeof raw === "object" &&
        !Array.isArray(raw)
    ) {
        return {
            ...raw,
        };
    }

    return {};
}


export function buildEnsPersistencePatch({
    event,
    estimate,
    qualification,
} = {}) {
    if (!event) {
        throw new Error(
            "Outage event is required."
        );
    }


    if (!qualification) {
        throw new Error(
            "ENS qualification result is required."
        );
    }


    const raw =
        ensureRaw(
            event.raw
        );


    const ensMetadata = {
        qualificationStatus:
            qualification.status ??
            "UNKNOWN",

        qualificationReason:
            qualification.reason ??
            null,

        eligibleForEns:
            qualification
                .eligibleForEns === true,

        loadInterruptionConfirmed:
            qualification
                .loadInterruptionConfirmed === true,

        estimated:
            qualification
                .estimated === true,

        method:
            qualification.method ??
            estimate?.method ??
            null,

        expectedLoadWatts:
            finite(
                qualification
                    .expectedLoadWatts
            )
                ? Number(
                    qualification
                        .expectedLoadWatts
                )
                : finite(
                    estimate
                        ?.expectedLoadWatts
                )
                    ? Number(
                        estimate
                            .expectedLoadWatts
                    )
                    : null,

        averageServedLoadWatts:
            finite(
                qualification
                    .averageServedLoadWatts
            )
                ? Number(
                    qualification
                        .averageServedLoadWatts
                )
                : finite(
                    estimate
                        ?.averageServedLoadWatts
                )
                    ? Number(
                        estimate
                            .averageServedLoadWatts
                    )
                    : null,

        reductionFraction:
            finite(
                qualification
                    .reductionFraction
            )
                ? Number(
                    qualification
                        .reductionFraction
                )
                : finite(
                    estimate
                        ?.reductionFraction
                )
                    ? Number(
                        estimate
                            .reductionFraction
                    )
                    : null,

        nearZeroFraction:
            finite(
                qualification
                    .nearZeroFraction
            )
                ? Number(
                    qualification
                        .nearZeroFraction
                )
                : finite(
                    estimate
                        ?.nearZeroFraction
                )
                    ? Number(
                        estimate
                            .nearZeroFraction
                    )
                    : null,

        baselineSampleCount:
            Number(
                estimate
                    ?.baselineSampleCount ??
                0
            ),

        outageSampleCount:
            Number(
                estimate
                    ?.outageSampleCount ??
                0
            ),

        maximumGapFraction:
            finite(
                qualification
                    .maximumGapFraction
            )
                ? Number(
                    qualification
                        .maximumGapFraction
                )
                : null,

        rawEstimatedEnsKwh:
            finite(
                estimate?.ensKwh
            )
                ? Number(
                    estimate.ensKwh
                )
                : null,

        qualifiedEnsKwh:
            qualification
                .eligibleForEns === true &&
                finite(
                    qualification.ensKwh
                )
                ? Math.max(
                    0,
                    Number(
                        qualification.ensKwh
                    )
                )
                : null,

        evaluatedAt:
            new Date(),
    };


    const patch = {
        raw: {
            ...raw,

            eligibleForEns:
                ensMetadata
                    .eligibleForEns,

            loadInterruptionConfirmed:
                ensMetadata
                    .loadInterruptionConfirmed,

            ensQualification:
                ensMetadata,
        },
    };


    /*
    |--------------------------------------------------------------------------
    | Qualified ENS only
    |--------------------------------------------------------------------------
    */

    if (
        qualification
            .eligibleForEns === true &&
        finite(
            qualification.ensKwh
        )
    ) {
        patch.energyNotSuppliedKwh =
            Math.max(
                0,
                Number(
                    qualification.ensKwh
                )
            );
    } else {
        /*
         * Do not write analytical deficits as ENS.
         *
         * null means:
         * "not qualified / not available"
         *
         * It does NOT mean:
         * "confirmed zero energy not supplied"
         */
        patch.energyNotSuppliedKwh =
            null;
    }


    return patch;
}


export async function persistEnsQualification({
    event,
    estimate,
    qualification,
} = {}) {
    const patch =
        buildEnsPersistencePatch({
            event,
            estimate,
            qualification,
        });


    const updated =
        await OutageEvent.findByIdAndUpdate(
            event._id,
            {
                $set:
                    patch,
            },
            {
                returnDocument: "after",
            }
        );


    if (!updated) {
        throw new Error(
            `OutageEvent not found: ${event._id}`
        );
    }


    return updated;
}