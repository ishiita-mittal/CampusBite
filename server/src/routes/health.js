'use strict';

const express        = require('express');
const { testConnection } = require('../config/database');

const router = express.Router();

/** GET /api/health — verify server and DB are alive */
router.get('/', async (req, res) => {
  try {
    await testConnection();
    res.json({
      success: true,
      data: {
        status:    'ok',
        database:  'connected',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Return 503 so load-balancers / monitoring tools detect the problem
    res.status(503).json({
      success: false,
      data: {
        status:    'degraded',
        database:  'disconnected',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

module.exports = router;
