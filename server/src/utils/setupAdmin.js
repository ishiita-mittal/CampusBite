'use strict';

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

/**
 * Development script to safely seed or update an administrator account.
 * Usage: node src/utils/setupAdmin.js [username] [password]
 */
async function setupAdmin() {
  const username = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'admin123';

  if (!username || !password) {
    console.error('Error: Username and password are required.');
    process.exit(1);
  }

  console.log(`Setting up admin user: "${username}"...`);

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT id, username FROM admin_users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE admin_users SET password_hash = ? WHERE username = ?',
        [passwordHash, username]
      );
      console.log(`Successfully updated password for existing admin "${username}".`);
    } else {
      await pool.query(
        'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
        [username, passwordHash]
      );
      console.log(`Successfully created new admin user "${username}".`);
    }
  } catch (err) {
    console.error('Failed to setup admin user:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupAdmin();
}

module.exports = { setupAdmin };
