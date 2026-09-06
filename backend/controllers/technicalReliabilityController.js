// backend/controllers/technicalReliabilityController.js

import {
    calculateTechnicalReliability,
} from "../services/reliability/technicalReliabilityService.js";


/*
|--------------------------------------------------------------------------
| Error response
|--------------------------------------------------------------------------
*/

function sendError(
    res,
    error
) {
    console.error(
        "Technical reliability API error:",
        error
    );


    return res
        .status(500)
        .json({
            success:
                false,

            error: {
                code:
                    "TECHNICAL_RELIABILITY_ERROR",

                message:
                    "Unable to calculate technical reliability metrics",
            },
        });
}


/*
|--------------------------------------------------------------------------
| Horizon validation
|--------------------------------------------------------------------------
*/

function parseHorizonHours(
    value
) {
    if (
        value ===
            undefined ||
        value ===
            null ||
        value ===
            ""
    ) {
        return null;
    }


    const horizon =
        Number(
            value
        );


    if (
        !Number.isFinite(
            horizon
        ) ||
        horizon <=
            0
    ) {
        return null;
    }


    return horizon;
}


/*
|--------------------------------------------------------------------------
| GET /mtbf
|--------------------------------------------------------------------------
*/

export async function getMtbf(
    req,
    res
) {
    try {
        const result =
            await calculateTechnicalReliability();


        return res.json({
            success:
                true,

            data: {
                source:
                    result
                        .source,

                eligibility:
                    result
                        .eligibility
                        .mtbf,

                mtbf:
                    result
                        .mtbf,
            },
        });
    }
    catch (error) {
        return sendError(
            res,
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| GET /mttr
|--------------------------------------------------------------------------
*/

export async function getMttr(
    req,
    res
) {
    try {
        const result =
            await calculateTechnicalReliability();


        return res.json({
            success:
                true,

            data: {
                source:
                    result
                        .source,

                eligibility:
                    result
                        .eligibility
                        .mttr,

                mttr:
                    result
                        .mttr,
            },
        });
    }
    catch (error) {
        return sendError(
            res,
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| GET /failure-rate
|--------------------------------------------------------------------------
*/

export async function getFailureRate(
    req,
    res
) {
    try {
        const result =
            await calculateTechnicalReliability();


        return res.json({
            success:
                true,

            data: {
                mtbf:
                    result
                        .mtbf,

                failureRate:
                    result
                        .rates
                        .failureRate,
            },
        });
    }
    catch (error) {
        return sendError(
            res,
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| GET /repair-rate
|--------------------------------------------------------------------------
*/

export async function getRepairRate(
    req,
    res
) {
    try {
        const result =
            await calculateTechnicalReliability();


        return res.json({
            success:
                true,

            data: {
                mttr:
                    result
                        .mttr,

                repairRate:
                    result
                        .rates
                        .repairRate,
            },
        });
    }
    catch (error) {
        return sendError(
            res,
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| GET /technical-availability
|--------------------------------------------------------------------------
*/

export async function getTechnicalAvailability(
    req,
    res
) {
    try {
        const result =
            await calculateTechnicalReliability();


        return res.json({
            success:
                true,

            data: {
                mtbf:
                    result
                        .mtbf,

                mttr:
                    result
                        .mttr,

                technicalAvailability:
                    result
                        .technicalAvailability,
            },
        });
    }
    catch (error) {
        return sendError(
            res,
            error
        );
    }
}


/*
|--------------------------------------------------------------------------
| GET /reliability
|--------------------------------------------------------------------------
|
| Example:
|
| /api/v1/reliability/reliability?horizonHours=10
|--------------------------------------------------------------------------
*/

export async function getEquipmentReliability(
    req,
    res
) {
    try {
        /*
        |----------------------------------------------------------------------
        | horizonHours is mandatory for R(t)
        |----------------------------------------------------------------------
        */

        if (
            req
                .query
                .horizonHours ===
                undefined ||
            req
                .query
                .horizonHours ===
                null ||
            req
                .query
                .horizonHours ===
                ""
        ) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    error: {
                        code:
                            "HORIZON_HOURS_REQUIRED",

                        message:
                            "horizonHours is required for equipment reliability R(t)",
                    },
                });
        }


        const horizonHours =
            parseHorizonHours(
                req
                    .query
                    .horizonHours
            );


        if (
            horizonHours ===
            null
        ) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    error: {
                        code:
                            "INVALID_HORIZON_HOURS",

                        message:
                            "horizonHours must be a positive finite number",
                    },
                });
        }


        const result =
            await calculateTechnicalReliability({
                horizonHours,
            });


        return res.json({
            success:
                true,

            data: {
                horizonHours,

                failureRate:
                    result
                        .rates
                        .failureRate,

                reliability:
                    result
                        .reliability,
            },
        });
    }
    catch (error) {
        return sendError(
            res,
            error
        );
    }
}