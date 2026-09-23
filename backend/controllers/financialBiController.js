// controllers/financialBiController.js

import {
    listFinancialBiKpis,
    getFinancialBiKpiByPersistenceKey,
}
    from "../services/financialBi/financialBiApiService.js";


export function httpStatusForEnvelope(
    envelope
) {
    if (
        envelope?.error?.code ===
        "FINANCIAL_BI_ACCESS_DENIED"
    ) {
        return 403;
    }

    switch (
    envelope.status
    ) {
        case "OK":
            return 200;

        case "NOT_FOUND":
            return 404;

        case "INVALID_REQUEST":
            return 400;

        default:
            return 503;
    }
}


function invalidRequestEnvelope(
    error
) {
    return {
        phase:
            "10.9",

        layer:
            "FINANCIAL_BI",

        status:
            "INVALID_REQUEST",

        data:
            null,

        meta:
            null,

        error:
        {
            code:
                error?.message ||
                "FINANCIAL_BI_INVALID_REQUEST",
        },

        readOnly:
            true,
    };
}


export function createFinancialBiController({
    repository,
} = {}) {
    return Object.freeze({
        async listKpis(
            req,
            res
        ) {
            try {
                const envelope =
                    await listFinancialBiKpis({
                        query:
                            req.query ??
                            {},

                        userId:
                            req?.auth?.userId ??
                            null,

                        repository,
                    });

                return res
                    .status(
                        httpStatusForEnvelope(
                            envelope
                        )
                    )
                    .json(
                        envelope
                    );
            } catch (
            error
            ) {
                const envelope =
                    invalidRequestEnvelope(
                        error
                    );

                return res
                    .status(
                        400
                    )
                    .json(
                        envelope
                    );
            }
        },

        async getKpiByPersistenceKey(
            req,
            res
        ) {
            try {
                const envelope =
                    await getFinancialBiKpiByPersistenceKey({
                        persistenceKey:
                            req.params?.persistenceKey,

                        userId:
                            req?.auth?.userId ??
                            null,

                        repository,
                    });

                return res
                    .status(
                        httpStatusForEnvelope(
                            envelope
                        )
                    )
                    .json(
                        envelope
                    );
            } catch (
            error
            ) {
                const envelope =
                    invalidRequestEnvelope(
                        error
                    );

                return res
                    .status(
                        400
                    )
                    .json(
                        envelope
                    );
            }
        },
    });
}
