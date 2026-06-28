const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;
  const isDev = process.env.NODE_ENV !== 'production';

  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      statusCode,
    });
  } else {
    logger.error('Client error', {
      message: err.message,
      path: req.path,
      method: req.method,
      statusCode,
    });
  }

  const message = isServerError && !isDev
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  const response = { error: message };
  if (isDev) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
