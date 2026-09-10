// models/OptimizationDssRecommendation.js

import mongoose from "mongoose";


const OptimizationDssRecommendationSchema =
  new mongoose.Schema(
    {
      persistenceKey: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      recordType: {
        type: String,
        required: true,
      },

      phase: {
        type: String,
        required: true,
        immutable: true,
      },

      layer: {
        type: String,
        required: true,
        immutable: true,
      },

      scope: {
        type: String,
        required: true,
        index: true,
      },

      scopeIdentity: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },

      horizon: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },

      recommendationKind: {
        type: String,
        required: true,
        index: true,
      },

      applicability: {
        type: String,
        required: true,
      },

      confidence: {
        type: String,
        required: true,
      },

      generationStatus: {
        type: String,
        required: true,
        index: true,
      },

      generationReason: {
        type: String,
        required: true,
      },

      recommendation: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },

      actionResults: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },

      generatedActionCount: {
        type: Number,
        required: true,
        min: 0,
      },

      unavailableActionCount: {
        type: Number,
        required: true,
        min: 0,
      },

      objectiveValue: {
        type: Number,
        default: null,
      },

      evidenceRefs: {
        type: [String],
        default: [],
      },

      advisoryOnly: {
        type: Boolean,
        required: true,
        default: true,
        immutable: true,
      },

      executable: {
        type: Boolean,
        required: true,
        default: false,
        immutable: true,
      },

      autoDispatch: {
        type: Boolean,
        required: true,
        default: false,
        immutable: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      collection:
        "optimizationDssRecommendations",
    }
  );


OptimizationDssRecommendationSchema.index(
  {
    scope: 1,
    recommendationKind: 1,
    "horizon.start": 1,
  }
);


const OptimizationDssRecommendation =
  mongoose.models.OptimizationDssRecommendation ||
  mongoose.model(
    "OptimizationDssRecommendation",
    OptimizationDssRecommendationSchema
  );


export default OptimizationDssRecommendation;
