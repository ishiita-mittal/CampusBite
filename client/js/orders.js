'use strict';

/**
 * orders.js — Displays locally saved order history for the customer.
 */

const noOrdersState = document.getElementById('no-orders-state');
const ordersContainer = document.getElementById('orders-list-container');
const ordersTbody = document.getElementById('orders-tbody');
const clearHistoryBtn = document.getElementById('clear-history-btn');

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function loadOrders() {
  Cart.updateBadge();
  let orders = [];
  try {
    orders = JSON.parse(localStorage.getItem('campusbite_recent_orders') || '[]');
  } catch {
    orders = [];
  }

  if (orders.length === 0) {
    noOrdersState.classList.remove('d-none');
    ordersContainer.classList.add('d-none');
    clearHistoryBtn.classList.add('d-none');
    return;
  }

  noOrdersState.classList.add('d-none');
  ordersContainer.classList.remove('d-none');
  clearHistoryBtn.classList.remove('d-none');

  ordersTbody.innerHTML = orders.map(order => {
    const formattedDate = order.placed_at ? new Date(order.placed_at).toLocaleString() : 'N/A';
    const amount = (order.subtotal_paise / 100).toFixed(2);
    return `
      <tr>
        <td>
          <span class="fw-bold text-primary font-monospace">${escHtml(order.order_number)}</span>
        </td>
        <td class="text-muted small">${formattedDate}</td>
        <td>${escHtml(order.customer_name || 'Customer')}</td>
        <td class="text-end fw-semibold">₹${amount}</td>
        <td class="text-center">
          <a href="track-order.html?orderNumber=${encodeURIComponent(order.order_number)}" class="btn btn-sm btn-outline-primary">
            <i class="bi bi-geo-alt me-1"></i>Track
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Clear your locally saved order list on this browser?')) {
    localStorage.removeItem('campusbite_recent_orders');
    loadOrders();
  }
});

loadOrders();
