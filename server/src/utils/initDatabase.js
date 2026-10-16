'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

/**
 * Automates executing schema.sql and seed.sql using mysql2.
 * Useful when MySQL CLI is not in the system PATH.
 */
async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'campusbite';

  console.log(`Connecting to MySQL server at ${host}:${port}...`);

  let connection;
  try {
    // Connect without selecting database first to ensure database can be created
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log(`Creating database "${database}" if it does not exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${database}\`;`);

    const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
    console.log(`Executing schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('Schema executed successfully.');

    const seedPath = path.resolve(__dirname, '../../../database/seed.sql');
    console.log(`Executing seed data from: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('Seed data executed successfully.');

    console.log('Database initialization completed successfully!');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
