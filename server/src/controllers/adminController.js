'use strict';

const { pool } = require('../config/database');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { validateMenuItem } = require('../validators/menuValidator');

// Allowed statuses and the transitions between them
const VALID_STATUSES = ['Placed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
const ALLOWED_TRANSITIONS = {
  Placed:    ['Preparing', 'Cancelled'],
  Preparing: ['Ready'],
  Ready:     ['Completed'],
  Completed: [],
  Cancelled: [],
};

// ── AUTH ──────────────────────────────────────────────────────────────────────

/** POST /api/admin/login */
async function adminLogin(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, password_hash FROM admin_users WHERE username = ?',
      [username]
    );

    // Return identical error for wrong username or wrong password (prevents enumeration)
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({ success: true, data: { token } });
  } catch (err) {
    next(err);
  }
}

// ── ORDERS ────────────────────────────────────────────────────────────────────

/** GET /api/admin/orders */
async function listOrders(req, res, next) {
  try {
    const { status, search } = req.query;
    let sql    = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && VALID_STATUSES.includes(status)) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (order_number LIKE ? OR customer_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/orders/:orderNumber */
async function getOrderAdmin(req, res, next) {
  try {
    const { orderNumber } = req.params;
    const [orders] = await pool.query('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    const order = orders[0];
    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?', [order.id]
    );
    res.json({ success: true, data: { ...order, items } });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/admin/orders/:orderNumber/status */
async function updateOrderStatus(req, res, next) {
  try {
    const { orderNumber } = req.params;
    const { status: newStatus } = req.body;

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
    }

    const [orders] = await pool.query(
      'SELECT id, status FROM orders WHERE order_number = ?', [orderNumber]
    );
    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const order       = orders[0];
    const allowedNext = ALLOWED_TRANSITIONS[order.status];

    if (!allowedNext.includes(newStatus)) {
      return res.status(422).json({
        success: false,
        error: `Cannot transition from "${order.status}" to "${newStatus}". Allowed: ${allowedNext.length ? allowedNext.join(', ') : 'none'}.`,
      });
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, order.id]);
    res.json({ success: true, data: { order_number: orderNumber, status: newStatus } });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/metrics */
async function getMetrics(req, res, next) {
  try {
    const [[{ today }]] = await pool.query(
      `SELECT COUNT(*) AS today FROM orders WHERE DATE(created_at) = CURDATE()`
    );
    const [byStatus] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY FIELD(status,'Placed','Preparing','Ready','Completed','Cancelled')`
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders`);
    res.json({ success: true, data: { today_orders: today, total_orders: total, by_status: byStatus } });
  } catch (err) {
    next(err);
  }
}

// ── MENU ──────────────────────────────────────────────────────────────────────

/** POST /api/admin/menu */
async function createMenuItem(req, res, next) {
  try {
    const validation = validateMenuItem(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const { name, description, category, price_paise, image_url, is_available } = req.body;
    const [result] = await pool.query(
      `INSERT INTO menu_items (name, description, category, price_paise, image_url, is_available)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description ? description.trim() : null,
        category,
        Number(price_paise),
        image_url || null,
        is_available !== false ? 1 : 0,
      ]
    );

    const [newItem] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newItem[0] });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/menu/:id */
async function updateMenuItem(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid menu item id.' });
    }

    const validation = validateMenuItem(req.body, true);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const [existing] = await pool.query('SELECT id FROM menu_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Menu item not found.' });
    }

    const { name, description, category, price_paise, image_url, is_available } = req.body;

    // COALESCE keeps existing value when field is not supplied
    await pool.query(
      `UPDATE menu_items SET
         name         = COALESCE(?, name),
         description  = COALESCE(?, description),
         category     = COALESCE(?, category),
         price_paise  = COALESCE(?, price_paise),
         image_url    = COALESCE(?, image_url),
         is_available = COALESCE(?, is_available)
       WHERE id = ?`,
      [
        name        !== undefined ? name.trim()          : null,
        description !== undefined ? (description || '')  : null,
        category    !== undefined ? category             : null,
        price_paise !== undefined ? Number(price_paise)  : null,
        image_url   !== undefined ? (image_url || null)  : null,
        is_available!== undefined ? (is_available ? 1:0) : null,
        id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/admin/menu/:id/availability */
async function updateMenuAvailability(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid menu item id.' });
    }
    if (req.body.is_available === undefined) {
      return res.status(400).json({ success: false, error: 'is_available field is required.' });
    }

    const [existing] = await pool.query('SELECT id FROM menu_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Menu item not found.' });
    }

    const isAvailable = req.body.is_available ? 1 : 0;
    await pool.query('UPDATE menu_items SET is_available = ? WHERE id = ?', [isAvailable, id]);
    res.json({ success: true, data: { id, is_available: isAvailable === 1 } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminLogin,
  listOrders,
  getOrderAdmin,
  updateOrderStatus,
  getMetrics,
  createMenuItem,
  updateMenuItem,
  updateMenuAvailability,
};
