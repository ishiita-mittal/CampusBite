-- ============================================================
-- CampusBite Database Schema
-- MySQL 8.0+ with InnoDB
-- Usage: Run this file first, then seed.sql
-- Safe to re-run (uses CREATE TABLE IF NOT EXISTS)
-- ============================================================

CREATE DATABASE IF NOT EXISTS campusbite
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campusbite;

-- ── admin_users ────────────────────────────────────────────────
-- Stores bcrypt-hashed passwords only. No plaintext passwords ever.
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)   NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── menu_items ─────────────────────────────────────────────────
-- price_paise is stored as a non-negative integer (paise = 1/100 rupee).
-- Convert to rupees only in the UI layer: price_paise / 100.
CREATE TABLE IF NOT EXISTS menu_items (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  name         VARCHAR(150)   NOT NULL,
  description  VARCHAR(500)   NULL,
  category     ENUM(
  'Snacks',
  'Breakfast',
  'Meals',
  'Noodles',
  'Beverages',
  'Desserts',
  'Packaged Snacks'
) NOT NULL,
  price_paise  INT UNSIGNED   NOT NULL DEFAULT 0,
  image_url    VARCHAR(500)   NULL,
  is_available TINYINT(1)     NOT NULL DEFAULT 1,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_menu_category  (category),
  INDEX idx_menu_available (is_available),
  INDEX idx_menu_name      (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── orders ─────────────────────────────────────────────────────
-- order_number is the customer-facing reference (e.g. CB-20241015-3f9a1c2b).
-- Internal sequential id is never shared with customers.
CREATE TABLE IF NOT EXISTS orders (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_number   VARCHAR(30)   NOT NULL,
  customer_name  VARCHAR(100)  NOT NULL,
  pickup_note    VARCHAR(500)  NULL,
  status         ENUM('Placed','Preparing','Ready','Completed','Cancelled')
                               NOT NULL DEFAULT 'Placed',
  subtotal_paise INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_number (order_number),
  INDEX idx_order_status  (status),
  INDEX idx_order_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── order_items ────────────────────────────────────────────────
-- item_name_snapshot and unit_price_paise capture the menu state at order time.
-- This ensures historical orders remain accurate even if menu items are edited.
CREATE TABLE IF NOT EXISTS order_items (
  id                 INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  order_id           INT UNSIGNED      NOT NULL,
  menu_item_id       INT UNSIGNED      NOT NULL,
  item_name_snapshot VARCHAR(150)      NOT NULL,
  unit_price_paise   INT UNSIGNED      NOT NULL,
  quantity           SMALLINT UNSIGNED NOT NULL,
  line_total_paise   INT UNSIGNED      NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_oi_order      FOREIGN KEY (order_id)    REFERENCES orders(id)     ON DELETE CASCADE,
  CONSTRAINT fk_oi_menu_item  FOREIGN KEY (menu_item_id)REFERENCES menu_items(id) ON DELETE RESTRICT,
  CONSTRAINT chk_qty_positive CHECK (quantity >= 1),
  INDEX idx_oi_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
