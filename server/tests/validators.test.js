'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { validateCreateOrder } = require('../src/validators/orderValidator');
const { validateMenuItem } = require('../src/validators/menuValidator');
const { generateOrderNumber } = require('../src/utils/orderNumber');

describe('Order Validator Unit Tests', () => {
  test('rejects empty customer name', () => {
    const res = validateCreateOrder({ customer_name: '', items: [{ menu_item_id: 1, quantity: 1 }] });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /Customer name is required/);
  });

  test('rejects customer name longer than 100 characters', () => {
    const longName = 'A'.repeat(101);
    const res = validateCreateOrder({ customer_name: longName, items: [{ menu_item_id: 1, quantity: 1 }] });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /must not exceed 100 characters/);
  });

  test('rejects empty items array', () => {
    const res = validateCreateOrder({ customer_name: 'Priya', items: [] });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /must contain at least one item/);
  });

  test('rejects missing items field', () => {
    const res = validateCreateOrder({ customer_name: 'Priya' });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /must contain at least one item/);
  });

  test('rejects invalid menu_item_id', () => {
    const res = validateCreateOrder({
      customer_name: 'Priya',
      items: [{ menu_item_id: -5, quantity: 2 }],
    });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /menu_item_id must be a positive integer/);
  });

  test('rejects zero or negative quantity', () => {
    const res = validateCreateOrder({
      customer_name: 'Priya',
      items: [{ menu_item_id: 1, quantity: 0 }],
    });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /quantity must be a whole number between 1 and 50/);
  });

  test('rejects quantity greater than 50', () => {
    const res = validateCreateOrder({
      customer_name: 'Priya',
      items: [{ menu_item_id: 1, quantity: 51 }],
    });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /quantity must be a whole number between 1 and 50/);
  });

  test('accepts valid order payload', () => {
    const res = validateCreateOrder({
      customer_name: 'Rahul Verma',
      pickup_note: 'Extra chutney please',
      items: [
        { menu_item_id: 1, quantity: 2 },
        { menu_item_id: 3, quantity: 1 },
      ],
    });
    assert.equal(res.valid, true);
    assert.equal(res.errors, undefined);
  });
});

describe('Menu Validator Unit Tests', () => {
  test('rejects empty name on create', () => {
    const res = validateMenuItem({ category: 'Snacks', price_paise: 2500 });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /Name is required/);
  });

  test('rejects invalid category', () => {
    const res = validateMenuItem({ name: 'Pizza', category: 'FastFood', price_paise: 2500 });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /Category must be one of/);
  });

  test('rejects negative price_paise', () => {
    const res = validateMenuItem({ name: 'Samosa', category: 'Snacks', price_paise: -100 });
    assert.equal(res.valid, false);
    assert.match(res.errors[0], /price_paise must be a non-negative integer/);
  });

  test('allows partial update when isUpdate is true', () => {
    const res = validateMenuItem({ price_paise: 3000 }, true);
    assert.equal(res.valid, true);
  });
});

describe('Order Number Generator Unit Tests', () => {
  test('generates order number with expected format CB-YYYYMMDD-XXXXXXXX', () => {
    const num = generateOrderNumber();
    assert.match(num, /^CB-\d{8}-[a-f0-9]{8}$/);
  });

  test('generates unique numbers sequentially', () => {
    const num1 = generateOrderNumber();
    const num2 = generateOrderNumber();
    assert.notEqual(num1, num2);
  });
});
