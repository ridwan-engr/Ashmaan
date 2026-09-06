const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const response = {
    success: false,
    message: err.message || "Internal server error",
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;