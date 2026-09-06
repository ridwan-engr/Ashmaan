// backend/controllers/reliabilityIndicesController.js

import {
    calculateReliabilityIndices,
} from "../services/reliability/reliabilityIndicesService.js";


function buildOptions(
    query
) {
    return {
        periodStart:
            query
                .periodStart,

        periodEnd:
            query
                .periodEnd,

        basis:
            query
                .basis,

        customerPopulation:
            query
                .customerPopulation,

        servicePointPopulation:
            query
                .servicePointPopulation,

        explicitlyEnabledInstallationProxy:
            query
                .enableInstallationProxy,
    };
}


function sendError(
    res,
    error
) {
    if (
        error?.message ===
        "INVALID_REPORTING_WINDOW"
    ) {
        return res
            .status(400)
            .json({
                success:
                    false,

                error: {
                    code:
                        "INVALID_REPORTING_WINDOW",

                    message:
                        "periodStart must be earlier than periodEnd",
                },
            });
    }


    console.error(
        "Reliability index API error:",
        error
    );


    return res
        .status(500)
        .json({
            success:
                false,

            error: {
                code:
                    "RELIABILITY_INDEX_ERROR",

                message:
                    "Unable to calculate reliability indices",
            },
        });
}


/*
|--------------------------------------------------------------------------
| GET /indices
|--------------------------------------------------------------------------
*/

export async function getReliabilityIndices(
    req,
    res
) {
    try {
        const result =
            await calculateReliabilityIndices(
                buildOptions(
                    req.query
                )
            );


        return res.json({
            success:
                true,

            data:
                result,
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
| GET /saidi
|--------------------------------------------------------------------------
*/

export async function getSaidi(
    req,
    res
) {
    try {
        const result =
            await calculateReliabilityIndices(
                buildOptions(
                    req.query
                )
            );


        return res.json({
            success:
                true,

            data: {
                reportingWindow:
                    result
                        .reportingWindow,

                population:
                    result
                        .population,

                observability:
                    result
                        .observability,

                saidi:
                    result
                        .indices
                        .saidi,
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
| GET /saifi
|--------------------------------------------------------------------------
*/

export async function getSaifi(
    req,
    res
) {
    try {
        const result =
            await calculateReliabilityIndices(
                buildOptions(
                    req.query
                )
            );


        return res.json({
            success:
                true,

            data: {
                reportingWindow:
                    result
                        .reportingWindow,

                population:
                    result
                        .population,

                observability:
                    result
                        .observability,

                saifi:
                    result
                        .indices
                        .saifi,
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
| GET /caidi
|--------------------------------------------------------------------------
*/

export async function getCaidi(
    req,
    res
) {
    try {
        const result =
            await calculateReliabilityIndices(
                buildOptions(
                    req.query
                )
            );


        return res.json({
            success:
                true,

            data: {
                reportingWindow:
                    result
                        .reportingWindow,

                population:
                    result
                        .population,

                observability:
                    result
                        .observability,

                caidi:
                    result
                        .indices
                        .caidi,
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

export async function getAsai(
    req,
    res
) {
    try {
        const result =
            await calculateReliabilityIndices(
                buildOptions(
                    req.query
                )
            );


        return res.json({
            success:
                true,

            data: {
                reportingWindow:
                    result
                        .reportingWindow,

                population:
                    result
                        .population,

                observability:
                    result
                        .observability,

                asai:
                    result
                        .indices
                        .asai,
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


export async function getAsui(
    req,
    res
) {
    try {
        const result =
            await calculateReliabilityIndices(
                buildOptions(
                    req.query
                )
            );


        return res.json({
            success:
                true,

            data: {
                reportingWindow:
                    result
                        .reportingWindow,

                population:
                    result
                        .population,

                observability:
                    result
                        .observability,

                asui:
                    result
                        .indices
                        .asui,
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