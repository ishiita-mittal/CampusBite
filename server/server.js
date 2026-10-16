'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const healthRouter = require('./src/routes/health');
const menuRouter   = require('./src/routes/menu');
const ordersRouter = require('./src/routes/orders');
const adminRouter  = require('./src/routes/admin');
const errorHandler = require('./src/middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'null', // file:// origin for opening HTML directly
  ],
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Serve static frontend ──────────────────────────────────────────────────────
// When a user opens http://localhost:3000, the client/ folder is served.
app.use(express.static(path.join(__dirname, '..', 'client')));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/menu',   menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin',  adminRouter);

// 404 for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// ── Centralised Error Handler ──────────────────────────────────────────────────
// Must be LAST — after all routes
app.use(errorHandler);

// ── Start server (only when run directly, not during tests) ───────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🍽️  CampusBite server running at http://localhost:${PORT}`);
    console.log(`   API health: http://localhost:${PORT}/api/health`);
    console.log(`   Frontend:   http://localhost:${PORT}\n`);
  });
}

module.exports = app; // exported for supertest
