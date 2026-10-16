'use strict';

const { pool } = require('../config/database');

/**
 * GET /api/menu
 * Supports query params: ?search=, ?category=, ?available=true|false
 */
async function listMenuItems(req, res, next) {
  try {
    const { search, category, available } = req.query;

    let sql    = 'SELECT * FROM menu_items WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (available === 'true') {
      sql += ' AND is_available = 1';
    } else if (available === 'false') {
      sql += ' AND is_available = 0';
    }

    sql += ' ORDER BY category, name';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/menu/:id
 */
async function getMenuItem(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid menu item id.' });
    }

    const [rows] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Menu item not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMenuItems, getMenuItem };
