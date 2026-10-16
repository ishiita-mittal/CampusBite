'use strict';

const crypto = require('crypto');

/**
 * Generate a unique, human-readable order number.
 * Format:  CB-YYYYMMDD-XXXXXXXX  (8 random hex characters)
 * Example: CB-20241015-3f9a1c2b
 *
 * Why not sequential IDs?
 *   Sequential DB IDs reveal order volume and are trivially guessable.
 *   A timestamp + 4 random bytes gives uniqueness without exposing business data.
 */
function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random  = crypto.randomBytes(4).toString('hex');
  return `CB-${dateStr}-${random}`;
}

module.exports = { generateOrderNumber };
