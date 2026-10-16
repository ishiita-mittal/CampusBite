'use strict';

const { pool } = require('../config/database');
const { generateOrderNumber } = require('../utils/orderNumber');

/**
 * Create an order within a database transaction.
 *
 * Why this matters:
 *   - Prices are NEVER trusted from the frontend — we fetch them from MySQL.
 *   - All calculations (line totals, subtotal) are done server-side.
 *   - A transaction ensures the order row and all order_item rows are saved
 *     atomically: if any insert fails, everything rolls back.
 *
 * @param {string} customerName
 * @param {string} pickupNote
 * @param {Array<{menu_item_id: number|string, quantity: number|string}>} items
 * @returns {Promise<{orderNumber: string, subtotalPaise: number, items: Array}>}
 */
async function createOrder(customerName, pickupNote, items) {
  // Deduplicate items by menu_item_id (sum quantities)
  const itemMap = new Map();
  for (const item of items) {
    const id  = Number(item.menu_item_id);
    const qty = Number(item.quantity);
    itemMap.set(id, (itemMap.get(id) || 0) + qty);
  }

  const itemIds = [...itemMap.keys()];

  // Fetch ALL requested items in a single parameterised query
  const placeholders = itemIds.map(() => '?').join(',');
  const [menuRows] = await pool.query(
    `SELECT id, name, price_paise, is_available
     FROM menu_items
     WHERE id IN (${placeholders})`,
    itemIds
  );

  const menuMap = new Map(menuRows.map((r) => [r.id, r]));

  // ── Validate every item ──────────────────────────────────────
  const validationErrors = [];
  for (const [id, qty] of itemMap.entries()) {
    const menuItem = menuMap.get(id);
    if (!menuItem) {
      validationErrors.push(`Menu item with id ${id} does not exist.`);
    } else if (!menuItem.is_available) {
      validationErrors.push(`"${menuItem.name}" is currently unavailable.`);
    } else if (qty > 50) {
      validationErrors.push(`Quantity for "${menuItem.name}" cannot exceed 50.`);
    }
  }

  if (validationErrors.length > 0) {
    const err = new Error(validationErrors.join(' '));
    err.status  = 422;
    err.expose  = true;
    throw err;
  }

  // ── Build line items (server-calculated prices) ───────────────
  const orderLines    = [];
  let   subtotalPaise = 0;

  for (const [id, qty] of itemMap.entries()) {
    const menuItem  = menuMap.get(id);
    const lineTotal = menuItem.price_paise * qty;
    subtotalPaise  += lineTotal;

    orderLines.push({
      menu_item_id:       id,
      item_name_snapshot: menuItem.name,  // snapshot so history is correct even if name changes
      unit_price_paise:   menuItem.price_paise,
      quantity:           qty,
      line_total_paise:   lineTotal,
    });
  }

  const orderNumber = generateOrderNumber();

  // ── Database transaction ──────────────────────────────────────
  // Use a dedicated connection so BEGIN/COMMIT/ROLLBACK are scoped correctly.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderResult] = await conn.execute(
      `INSERT INTO orders (order_number, customer_name, pickup_note, status, subtotal_paise)
       VALUES (?, ?, ?, 'Placed', ?)`,
      [orderNumber, customerName.trim(), pickupNote ? pickupNote.trim() : null, subtotalPaise]
    );

    const orderId = orderResult.insertId;

    for (const line of orderLines) {
      await conn.execute(
        `INSERT INTO order_items
           (order_id, menu_item_id, item_name_snapshot, unit_price_paise, quantity, line_total_paise)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, line.menu_item_id, line.item_name_snapshot,
         line.unit_price_paise, line.quantity, line.line_total_paise]
      );
    }

    await conn.commit();
    return { orderNumber, subtotalPaise, items: orderLines };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    // Always release connection back to pool — even if an error occurs
    conn.release();
  }
}

module.exports = { createOrder };
