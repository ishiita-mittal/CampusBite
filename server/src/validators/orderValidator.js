'use strict';

/**
 * Validate the request body for POST /api/orders.
 * Returns { valid: true } on success or { valid: false, errors: string[] } on failure.
 *
 * Note: This only validates shape/types. Business logic (item existence,
 * availability, server-side pricing) is handled in orderService.js.
 */
function validateCreateOrder(body) {
  const errors = [];

  // Customer name
  const customerName = (body.customer_name || '').trim();
  if (!customerName) {
    errors.push('Customer name is required.');
  } else if (customerName.length > 100) {
    errors.push('Customer name must not exceed 100 characters.');
  }

  // Pickup note (optional)
  const pickupNote = body.pickup_note || '';
  if (typeof pickupNote !== 'string' || pickupNote.length > 500) {
    errors.push('Pickup note must not exceed 500 characters.');
  }

  // Items array
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Order must contain at least one item.');
  } else {
    items.forEach((item, idx) => {
      const pos = `Item at index ${idx}`;
      const id  = Number(item.menu_item_id);
      if (!Number.isInteger(id) || id < 1) {
        errors.push(`${pos}: menu_item_id must be a positive integer.`);
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
        errors.push(`${pos}: quantity must be a whole number between 1 and 50.`);
      }
    });
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

module.exports = { validateCreateOrder };
