const normalizeStatusCode = (value) => {
  if (
    Number.isInteger(value) &&
    value >= 400 &&
    value <= 599
  ) {
    return value;
  }

  return 500;
};

const buildSafeLogRecord = ({
  err,
  req,
  statusCode,
}) => {
  const isServerError =
    statusCode >= 500;

  return Object.freeze({
    name:
      typeof err?.name === "string"
        ? err.name
        : "Error",

    message:
      isServerError
        ? "Internal server error"
        : typeof err?.message === "string"
          ? err.message
          : "Request failed",

    statusCode,

    code:
      typeof err?.code === "string" ||
      typeof err?.code === "number"
        ? err.code
        : null,

    method:
      typeof req?.method === "string"
        ? req.method
        : null,

    path:
      typeof req?.originalUrl === "string"
        ? req.originalUrl
        : typeof req?.url === "string"
          ? req.url
          : null,

    timestamp:
      new Date().toISOString(),
  });
};

const errorHandler = (
  err,
  req,
  res,
  next
) => {
  const statusCode =
    normalizeStatusCode(
      err?.statusCode
    );

  const logRecord =
    buildSafeLogRecord({
      err,
      req,
      statusCode,
    });

  console.error(
    "[HTTP Error]",
    logRecord
  );

  const response = {
    success: false,

    message:
      statusCode >= 500
        ? "Internal server error"
        : typeof err?.message === "string"
          ? err.message
          : "Request failed",
  };

  if (
    statusCode < 500 &&
    err?.errors
  ) {
    response.errors =
      err.errors;
  }

  res
    .status(statusCode)
    .json(response);
};

export default errorHandler;