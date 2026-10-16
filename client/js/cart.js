'use strict';

/**
 * cart.js — Shopping cart with localStorage persistence.
 *
 * Cart items are stored in localStorage as:
 * [{ id, name, price_paise, quantity }]
 *
 * IMPORTANT: prices here are only for display purposes.
 * The backend ALWAYS recalculates prices from the database when an
 * order is placed — the cart total is NEVER trusted by the server.
 */

const CART_KEY = 'campusbite_cart';

const Cart = {
  /** Load cart from localStorage */
  load() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  },

  /** Save cart to localStorage */
  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    this.updateBadge();
  },

  /** Add an item. If it already exists, increment quantity. */
  add(menuItem, qty = 1) {
    const items = this.load();
    const existing = items.find(i => i.id === menuItem.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, 50);
    } else {
      items.push({
        id:         menuItem.id,
        name:       menuItem.name,
        price_paise:menuItem.price_paise,
        quantity:   Math.min(qty, 50),
      });
    }
    this.save(items);
  },

  /** Remove an item entirely */
  remove(itemId) {
    this.save(this.load().filter(i => i.id !== itemId));
  },

  /** Set specific quantity (clamped 1–50; use remove() to delete) */
  setQty(itemId, qty) {
    const items = this.load();
    const item  = items.find(i => i.id === itemId);
    if (item) {
      item.quantity = Math.max(1, Math.min(50, qty));
      this.save(items);
    }
  },

  /** Clear all items */
  clear() {
    localStorage.removeItem(CART_KEY);
    this.updateBadge();
  },

  /** Total item count (sum of quantities) */
  count() {
    return this.load().reduce((sum, i) => sum + i.quantity, 0);
  },

  /** Display subtotal in paise */
  subtotalPaise() {
    return this.load().reduce((sum, i) => sum + i.price_paise * i.quantity, 0);
  },

  /** Update the cart badge in the navbar */
  updateBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const n = this.count();
    badge.textContent = n;
    badge.classList.toggle('d-none', n === 0);
  },
};

window.Cart = Cart;
