// services/financialBi/mongooseFinancialBiReadRepository.js

import FinancialBiKpiRecord
    from "../../models/FinancialBiKpiRecord.js";


const SORT_FIELD_MAP =
    Object.freeze({
        reportingStart:
            "reportingWindow.start",

        reportingEnd:
            "reportingWindow.end",

        metricName:
            "metricName",

        createdAt:
            "createdAt",
    });


function buildMongoFilter(
    filters
) {
    const mongo =
        {};

    if (
        filters.scope
    ) {
        mongo.scope =
            filters.scope;
    }

    if (
        filters.vrmSiteId
    ) {
        mongo["scopeIdentity.vrmSiteId"] =
            filters.vrmSiteId;
    }

    if (
        filters.fleetId
    ) {
        mongo["scopeIdentity.fleetId"] =
            filters.fleetId;
    }

    if (
        filters.metricName
    ) {
        mongo.metricName =
            filters.metricName;
    }

    if (
        filters.timezone
    ) {
        mongo["reportingWindow.timezone"] =
            filters.timezone;
    }

    if (
        filters.reportingStart ||
        filters.reportingEnd
    ) {
        mongo["reportingWindow.start"] =
            {};

        if (
            filters.reportingStart
        ) {
            mongo["reportingWindow.start"].$gte =
                filters.reportingStart;
        }

        if (
            filters.reportingEnd
        ) {
            mongo["reportingWindow.start"].$lt =
                filters.reportingEnd;
        }
    }

    mongo["reportingWindow.semantics"] =
        "[start,end)";

    return mongo;
}


export const mongooseFinancialBiReadRepository =
    Object.freeze({
        async listKpis({
            filters,
            pagination,
            sort,
        } = {}) {
            const mongoFilter =
                buildMongoFilter(
                    filters
                );

            const sortField =
                SORT_FIELD_MAP[
                    sort.field
                ];

            const sortDirection =
                sort.direction ===
                    "asc"
                    ? 1
                    : -1;

            const [
                items,
                total,
            ] =
                await Promise.all([
                    FinancialBiKpiRecord
                        .find(
                            mongoFilter
                        )
                        .sort(
                            {
                                [sortField]:
                                    sortDirection,

                                _id:
                                    1,
                            }
                        )
                        .skip(
                            pagination.offset
                        )
                        .limit(
                            pagination.limit
                        )
                        .lean(),

                    FinancialBiKpiRecord
                        .countDocuments(
                            mongoFilter
                        ),
                ]);

            return {
                items,
                total,
            };
        },

        async findByPersistenceKey({
            persistenceKey,
        } = {}) {
            return FinancialBiKpiRecord
                .findOne(
                    {
                        persistenceKey,
                    }
                )
                .lean();
        },
    });
