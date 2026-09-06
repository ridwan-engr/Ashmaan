// backend/controllers/adequacyReliabilityController.js

import {
    getProductionLolp,
    getProductionLole,
    getProductionEens,
} from "../services/reliability/adequacyReliabilityService.js";


export function getLolp(
    req,
    res
) {
    try {
        const result =
            getProductionLolp();

        return res.status(200).json({
            success:
                true,

            data:
                result,
        });
    }
    catch (error) {
        console.error(
            "LOLP API error:",
            error
        );

        return res.status(500).json({
            success:
                false,

            error: {
                code:
                    "LOLP_CALCULATION_FAILED",

                message:
                    error.message ??
                    "Unable to calculate LOLP",
            },
        });
    }
}


export function getLole(
    req,
    res
) {
    try {
        const result =
            getProductionLole();

        return res.status(200).json({
            success:
                true,

            data:
                result,
        });
    }
    catch (error) {
        console.error(
            "LOLE API error:",
            error
        );

        return res.status(500).json({
            success:
                false,

            error: {
                code:
                    "LOLE_CALCULATION_FAILED",

                message:
                    error.message ??
                    "Unable to calculate LOLE",
            },
        });
    }
}


export function getEens(
    req,
    res
) {
    try {
        const result =
            getProductionEens();

        return res.status(200).json({
            success:
                true,

            data:
                result,
        });
    }
    catch (error) {
        console.error(
            "EENS API error:",
            error
        );

        return res.status(500).json({
            success:
                false,

            error: {
                code:
                    "EENS_CALCULATION_FAILED",

                message:
                    error.message ??
                    "Unable to calculate EENS",
            },
        });
    }
}