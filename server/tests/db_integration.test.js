'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, testConnection } = require('../src/config/database');
const { createOrder } = require('../src/services/orderService');

describe('Database Integration Tests', () => {
  let isConnected = false;

  before(async () => {
    try {
      const res = await testConnection();
      isConnected = res && res.ok === true;
    } catch {
      isConnected = false;
    }
  });

  after(async () => {
    try {
      await pool.end();
    } catch {
      // ignore
    }
  });

  test('Database connection health check', async (t) => {
    if (!isConnected) {
      t.skip('MySQL not accessible with current .env credentials; skipping DB integration test.');
      return;
    }
    const res = await testConnection();
    assert.equal(res.ok, true);
  });

  test('Menu items can be queried from database', async (t) => {
    if (!isConnected) {
      t.skip('MySQL not accessible; skipping.');
      return;
    }
    const [rows] = await pool.query('SELECT * FROM menu_items LIMIT 5');
    assert.ok(Array.isArray(rows));
  });

  test('Order transaction rolls back if item is unavailable', async (t) => {
    if (!isConnected) {
      t.skip('MySQL not accessible; skipping.');
      return;
    }

    await assert.rejects(
      async () => {
        await createOrder('Test Customer', 'Note', [{ menu_item_id: 999999, quantity: 1 }]);
      },
      /does not exist/
    );
  });
});
