import {
  listAlarms,
  getAlarmSummary,
} from "../services/alarms/alarmReadService.js";


function sendAlarmError(
  res,
  error
) {
  const statusCode =
    Number.isInteger(
      error?.statusCode
    )
      ? error.statusCode
      : 500;

  const code =
    error?.code ??
    "ALARM_READ_FAILED";

  const message =
    statusCode >= 500
      ? "Alarm data is temporarily unavailable."
      : (
          error?.message ??
          "Alarm request failed."
        );

  return res
    .status(statusCode)
    .json({
      status: "ERROR",

      error: {
        code,
        message,
      },
    });
}


export async function listAlarmRecords(
  req,
  res
) {
  try {
    const result =
      await listAlarms({
        userId:
          req?.auth?.userId,

        query:
          req?.query ??
          {},
      });

    return res.json({
      status: "OK",
      ...result,
      error: null,
    });
  }
  catch (error) {
    return sendAlarmError(
      res,
      error
    );
  }
}


export async function getAlarmSummaryRecord(
  req,
  res
) {
  try {
    const data =
      await getAlarmSummary({
        userId:
          req?.auth?.userId,

        query:
          req?.query ??
          {},
      });

    return res.json({
      status: "OK",
      data,
      error: null,
    });
  }
  catch (error) {
    return sendAlarmError(
      res,
      error
    );
  }
}


export default Object.freeze({
  listAlarmRecords,
  getAlarmSummaryRecord,
});