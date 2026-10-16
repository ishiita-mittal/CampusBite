'use strict';

const { pool }        = require('../config/database');
const { createOrder } = require('../services/orderService');
const { validateCreateOrder } = require('../validators/orderValidator');

/**
 * POST /api/orders
 * Validates input, delegates to orderService (which recalculates prices),
 * returns the new order number.
 */
async function placeOrder(req, res, next) {
  try {
    const validation = validateCreateOrder(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const { customer_name, pickup_note, items } = req.body;
    const result = await createOrder(customer_name, pickup_note || '', items);

    res.status(201).json({
      success: true,
      data: {
        order_number:   result.orderNumber,
        subtotal_paise: result.subtotalPaise,
        message: 'Your order has been placed. This is a simulated system — no payment is processed.',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:orderNumber
 * Returns only customer-safe fields (no internal IDs, no admin-only data).
 */
async function getOrder(req, res, next) {
  try {
    const { orderNumber } = req.params;

    const [orders] = await pool.query(
      `SELECT order_number, customer_name, pickup_note, status, subtotal_paise, created_at
       FROM orders WHERE order_number = ?`,
      [orderNumber]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const order = orders[0];

    // Fetch items via a subquery to avoid exposing the internal order.id
    const [orderItems] = await pool.query(
      `SELECT item_name_snapshot, unit_price_paise, quantity, line_total_paise
       FROM order_items
       WHERE order_id = (SELECT id FROM orders WHERE order_number = ?)`,
      [orderNumber]
    );

    res.json({ success: true, data: { ...order, items: orderItems } });
  } catch (err) {
    next(err);
  }
}

module.exports = { placeOrder, getOrder };
