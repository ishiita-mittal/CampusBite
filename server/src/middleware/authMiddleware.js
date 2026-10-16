'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware: verify JWT from the Authorization header.
 * Expects:  Authorization: Bearer <token>
 * Attaches decoded payload to req.admin on success.
 * All protected admin routes must use this middleware.
 */
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in as admin.',
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please log in again.',
    });
  }
}

module.exports = { requireAdmin };
