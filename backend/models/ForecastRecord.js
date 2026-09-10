// models/ForecastRecord.js

import mongoose
    from "mongoose";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.11 — Forecast Persistence Model
|--------------------------------------------------------------------------
|
| Canonical MongoDB/Mongoose representation of the validated Phase 9.10
| persistence record.
|
|--------------------------------------------------------------------------
*/

const {
    Schema,
    model,
    models,
} = mongoose;


const forecastValueSchema =
    new Schema(
        {
            timestamp:
                {
                    type:
                        Date,
                    required:
                        true,
                },

            value:
                {
                    type:
                        Number,
                    required:
                        true,
                },

            unit:
                {
                    type:
                        String,
                    default:
                        null,
                },

            provenance:
                {
                    modelFamily:
                        {
                            type:
                                String,
                            default:
                                null,
                        },

                    strategy:
                        {
                            type:
                                String,
                            default:
                                null,
                        },

                    sourceTimestamp:
                        {
                            type:
                                Date,
                            default:
                                null,
                        },
                },
        },
        {
            _id:
                false,
        }
    );


const forecastRecordSchema =
    new Schema(
        {
            schemaVersion:
                {
                    type:
                        Number,
                    required:
                        true,
                    default:
                        1,
                },

            phase:
                {
                    type:
                        String,
                    required:
                        true,
                    enum:
                        [
                            "9.10",
                        ],
                },

            persistenceKey:
                {
                    type:
                        String,
                    required:
                        true,
                    immutable:
                        true,
                    unique:
                        true,
                    index:
                        true,
                },

            identity:
                {
                    vrmSiteId:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    targetFamily:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    targetMetric:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    forecastOrigin:
                        {
                            type:
                                Date,
                            required:
                                true,
                        },

                    forecastEnd:
                        {
                            type:
                                Date,
                            required:
                                true,
                        },

                    modelName:
                        {
                            type:
                                String,
                            default:
                                null,
                        },

                    modelFamily:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    outputType:
                        {
                            type:
                                String,
                            required:
                                true,
                        },
                },

            target:
                {
                    vrmSiteId:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    family:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    metric:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    kind:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    unit:
                        {
                            type:
                                String,
                            default:
                                null,
                        },
                },

            window:
                {
                    forecastOrigin:
                        {
                            type:
                                Date,
                            required:
                                true,
                        },

                    forecastEnd:
                        {
                            type:
                                Date,
                            required:
                                true,
                        },

                    timezone:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    semantics:
                        {
                            type:
                                String,
                            required:
                                true,
                            enum:
                                [
                                    "[forecastOrigin,forecastEnd)",
                                ],
                        },
                },

            model:
                {
                    name:
                        {
                            type:
                                String,
                            default:
                                null,
                        },

                    family:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    task:
                        {
                            type:
                                String,
                            default:
                                null,
                        },

                    outputType:
                        {
                            type:
                                String,
                            required:
                                true,
                        },
                },

            forecast:
                {
                    outputType:
                        {
                            type:
                                String,
                            required:
                                true,
                        },

                    values:
                        {
                            type:
                                [
                                    forecastValueSchema,
                                ],
                            default:
                                [],
                        },

                    intervals:
                        {
                            type:
                                Schema.Types.Mixed,
                            default:
                                null,
                        },

                    probabilities:
                        {
                            type:
                                Schema.Types.Mixed,
                            default:
                                null,
                        },

                    states:
                        {
                            type:
                                Schema.Types.Mixed,
                            default:
                                null,
                        },
                },

            provenance:
                {
                    productionContractPhase:
                        {
                            type:
                                String,
                            default:
                                null,
                        },

                    productionExecutionPhase:
                        {
                            type:
                                String,
                            default:
                                null,
                        },

                    qualificationPhase:
                        {
                            type:
                                String,
                            default:
                                null,
                        },

                    trainingPhase:
                        {
                            type:
                                String,
                            default:
                                null,
                        },
                },

            persistedAt:
                {
                    type:
                        Date,
                    required:
                        true,
                },
        },
        {
            timestamps:
                true,

            minimize:
                false,
        }
    );


forecastRecordSchema.index(
    {
        "identity.vrmSiteId":
            1,

        "identity.targetFamily":
            1,

        "identity.targetMetric":
            1,

        "identity.forecastOrigin":
            -1,
    }
);


const ForecastRecord =
    models.ForecastRecord ||
    model(
        "ForecastRecord",
        forecastRecordSchema
    );


export {
    forecastRecordSchema,
};


export default ForecastRecord;
