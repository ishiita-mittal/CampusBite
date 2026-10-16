'use strict';

const ALLOWED_CATEGORIES = ['Snacks', 'Meals', 'Beverages', 'Desserts'];

/**
 * Validate request body for menu item create / update.
 * @param {object}  body      - Request body
 * @param {boolean} isUpdate  - If true, all fields are optional (PATCH semantics)
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateMenuItem(body, isUpdate = false) {
  const errors = [];
  const has = (key) => body[key] !== undefined;

  // name
  if (!isUpdate || has('name')) {
    const name = (body.name || '').trim();
    if (!name)               errors.push('Name is required.');
    else if (name.length > 150) errors.push('Name must not exceed 150 characters.');
  }

  // category
  if (!isUpdate || has('category')) {
    if (!ALLOWED_CATEGORIES.includes(body.category)) {
      errors.push(`Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`);
    }
  }

  // price_paise
  if (!isUpdate || has('price_paise')) {
    const price = Number(body.price_paise);
    if (!Number.isInteger(price) || price < 0) {
      errors.push('price_paise must be a non-negative integer.');
    }
  }

  // description (optional, max 500)
  if (has('description') && body.description) {
    if (typeof body.description !== 'string' || body.description.length > 500) {
      errors.push('Description must not exceed 500 characters.');
    }
  }

  // image_url (optional, max 500)
  if (has('image_url') && body.image_url) {
    if (typeof body.image_url !== 'string' || body.image_url.length > 500) {
      errors.push('image_url must not exceed 500 characters.');
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

module.exports = { validateMenuItem, ALLOWED_CATEGORIES };
