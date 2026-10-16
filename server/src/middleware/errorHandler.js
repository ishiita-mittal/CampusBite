'use strict';

/**
 * Centralised error-handling middleware.
 * Registered LAST in server.js, after all routes.
 * Never exposes stack traces or internal details to clients.
 */
function errorHandler(err, req, res, next) {
  // Always log full error server-side
  console.error('[Error]', err.message || err);

  const status  = err.status || err.statusCode || 500;
  // err.expose = true means it's safe to send the message to the client
  const message = err.expose
    ? err.message
    : 'An unexpected error occurred. Please try again.';

  res.status(status).json({
    success: false,
    error:   message,
  });
}

module.exports = errorHandler;
