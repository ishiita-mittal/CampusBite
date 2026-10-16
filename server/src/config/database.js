'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * MySQL connection pool.
 * Uses environment variables for all configuration — never hardcode credentials.
 */
const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  port:             parseInt(process.env.DB_PORT || '3306', 10),
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME     || 'campusbite',
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  timezone:         '+00:00',
});

/**
 * Verify database connectivity.
 * Call this during startup and from the /api/health endpoint.
 * @returns {Promise<{ok: true}>}
 */
async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    return { ok: true };
  } finally {
    conn.release();
  }
}

module.exports = { pool, testConnection };
