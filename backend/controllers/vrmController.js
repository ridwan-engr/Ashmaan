import ApiResponse from "../utils/ApiResponse.js";

import {
  getInstallations as fetchInstallations,
  getInstallationById as fetchInstallationById,
} from "../services/vrm/installationService.js";

import {
  getInstallationTelemetry as fetchTelemetry,
} from "../services/vrm/telemetryService.js";

import {
  getInstallationAlarms as fetchAlarms,
} from "../services/vrm/alarmService.js";

import {
  getInstallationStatistics as fetchStatistics,
} from "../services/vrm/statisticsService.js";


const getInstallations = async (req, res) => {
  const data = await fetchInstallations();

  res.status(200).json(
    new ApiResponse(
      200,
      data,
      "VRM installations retrieved successfully."
    )
  );
};


const getInstallationById = async (req, res) => {
  const { id } = req.params;

  const data = await fetchInstallationById(id);

  res.status(200).json(
    new ApiResponse(
      200,
      data,
      "VRM installation retrieved successfully."
    )
  );
};


const getInstallationTelemetry = async (req, res) => {
  const { id } = req.params;

  const count = Number(req.query.count) || 1000;

  const data = await fetchTelemetry(id, {
    count,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      data,
      "VRM telemetry retrieved successfully."
    )
  );
};


const getInstallationAlarms = async (req, res) => {
  const { id } = req.params;

  const count = Number(req.query.count) || 100;

  const data = await fetchAlarms(id, {
    count,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      data,
      "VRM alarms retrieved successfully."
    )
  );
};


const getInstallationStatistics = async (req, res) => {
  const { id } = req.params;

  const {
    type,
    interval,
    start,
    end,
  } = req.query;

  const data = await fetchStatistics(id, {
    type,
    interval,
    start,
    end,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      data,
      "VRM statistics retrieved successfully."
    )
  );
};

const inspectInstallationTelemetry = async (req, res) => {
  const { id } = req.params;

  const data = await fetchTelemetry(id, {
    count: 10,
  });

  const records =
    Array.isArray(data?.records)
      ? data.records
      : Array.isArray(data?.data?.records)
      ? data.data.records
      : [];

  res.status(200).json(
    new ApiResponse(
      200,
      {
        recordCount: records.length,
        sample: records.slice(0, 10),
      },
      "VRM diagnostic sample retrieved successfully."
    )
  );
};


export {
  getInstallations,
  getInstallationById,
  getInstallationTelemetry,
  getInstallationAlarms,
  getInstallationStatistics,
  inspectInstallationTelemetry
};