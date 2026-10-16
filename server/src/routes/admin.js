'use strict';

const express    = require('express');
const rateLimit  = require('express-rate-limit');
const { requireAdmin } = require('../middleware/authMiddleware');
const {
  adminLogin,
  listOrders,
  getOrderAdmin,
  updateOrderStatus,
  getMetrics,
  createMenuItem,
  updateMenuItem,
  updateMenuAvailability,
} = require('../controllers/adminController');

const router = express.Router();

// Rate-limit login attempts: max 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, adminLogin);

// ── Protected — orders ────────────────────────────────────────────────────────
router.get('/orders',                        requireAdmin, listOrders);
router.get('/orders/:orderNumber',           requireAdmin, getOrderAdmin);
router.patch('/orders/:orderNumber/status',  requireAdmin, updateOrderStatus);

// ── Protected — metrics ───────────────────────────────────────────────────────
router.get('/metrics', requireAdmin, getMetrics);

// ── Protected — menu management ───────────────────────────────────────────────
router.post('/menu',                  requireAdmin, createMenuItem);
router.put('/menu/:id',               requireAdmin, updateMenuItem);
router.patch('/menu/:id/availability',requireAdmin, updateMenuAvailability);

module.exports = router;
