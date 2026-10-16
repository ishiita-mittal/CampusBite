'use strict';

/**
 * track-order.js — Customer order tracking page logic.
 */

const trackForm       = document.getElementById('track-form');
const orderNumberInp  = document.getElementById('order-number-input');
const trackBtn        = document.getElementById('track-btn');
const trackError      = document.getElementById('track-error');
const trackLoading    = document.getElementById('track-loading');
const orderDetailsCard= document.getElementById('order-details-card');

const detailOrderNum  = document.getElementById('detail-order-number');
const detailCustomer  = document.getElementById('detail-customer-name');
const detailCreated   = document.getElementById('detail-created-at');
const detailStatus    = document.getElementById('detail-status-badge');
const detailPickupNote= document.getElementById('detail-pickup-note');
const pickupNoteBox   = document.getElementById('pickup-note-box');
const detailItemsBody = document.getElementById('detail-items-body');
const detailSubtotal  = document.getElementById('detail-subtotal');
const refreshBtn      = document.getElementById('refresh-status-btn');
const timelineContainer = document.getElementById('status-timeline-container');
const cancelledBanner = document.getElementById('cancelled-banner');

let currentTrackedOrderNumber = '';

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Update the visual timeline based on current status */
function updateTimeline(status) {
  const steps = ['placed', 'preparing', 'ready', 'completed'];
  const statusLower = (status || '').toLowerCase();

  if (statusLower === 'cancelled') {
    timelineContainer.classList.add('d-none');
    cancelledBanner.classList.remove('d-none');
    return;
  }

  timelineContainer.classList.remove('d-none');
  cancelledBanner.classList.add('d-none');

  const currentIndex = steps.indexOf(statusLower);

  steps.forEach((step, index) => {
    const dot = document.getElementById(`dot-${step}`);
    const conn = document.getElementById(`conn-${step}`);

    if (dot) {
      dot.classList.remove('active', 'done');
      if (index < currentIndex) {
        dot.classList.add('done');
      } else if (index === currentIndex) {
        dot.classList.add('active');
      }
    }

    if (conn) {
      conn.classList.remove('done');
      if (index < currentIndex) {
        conn.classList.add('done');
      }
    }
  });
}

/** Fetch and render order details */
async function fetchOrderDetails(orderNumber) {
  const cleanNumber = orderNumber.trim();
  if (!cleanNumber) return;

  currentTrackedOrderNumber = cleanNumber;
  trackError.classList.add('d-none');
  orderDetailsCard.classList.add('d-none');
  trackLoading.classList.remove('d-none');
  trackBtn.disabled = true;

  try {
    const response = await apiGet(`/api/orders/${encodeURIComponent(cleanNumber)}`);
    const order = response.data;

    // Populate order details
    detailOrderNum.textContent = order.order_number;
    detailCustomer.textContent = order.customer_name;
    detailCreated.textContent = new Date(order.created_at).toLocaleString();

    // Status Badge
    detailStatus.className = `status-badge status-${order.status}`;
    detailStatus.innerHTML = `<i class="bi bi-circle-fill" style="font-size:0.5rem"></i> ${order.status}`;

    // Timeline
    updateTimeline(order.status);

    // Pickup Note
    if (order.pickup_note) {
      detailPickupNote.textContent = order.pickup_note;
      pickupNoteBox.classList.remove('d-none');
    } else {
      pickupNoteBox.classList.add('d-none');
    }

    // Items table
    detailItemsBody.innerHTML = (order.items || []).map(item => {
      const unit = (item.unit_price_paise / 100).toFixed(2);
      const total = (item.line_total_paise / 100).toFixed(2);
      return `
        <tr>
          <td><span class="fw-semibold">${escHtml(item.item_name_snapshot)}</span></td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-end">₹${unit}</td>
          <td class="text-end fw-bold">₹${total}</td>
        </tr>
      `;
    }).join('');

    detailSubtotal.textContent = `₹${(order.subtotal_paise / 100).toFixed(2)}`;

    orderDetailsCard.classList.remove('d-none');
  } catch (err) {
    trackError.textContent = err.message || 'Could not find order. Please verify the order number.';
    trackError.classList.remove('d-none');
  } finally {
    trackLoading.classList.add('d-none');
    trackBtn.disabled = false;
  }
}

// Form submit event
trackForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = orderNumberInp.value.trim();
  if (val) {
    // Update URL query string without reloading
    const newUrl = `${window.location.pathname}?orderNumber=${encodeURIComponent(val)}`;
    window.history.replaceState({}, '', newUrl);
    fetchOrderDetails(val);
  }
});

// Refresh button event
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    if (currentTrackedOrderNumber) {
      fetchOrderDetails(currentTrackedOrderNumber);
    }
  });
}

// Auto-track if orderNumber is in URL
window.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
  const params = new URLSearchParams(window.location.search);
  const orderNum = params.get('orderNumber');
  if (orderNum) {
    orderNumberInp.value = orderNum;
    fetchOrderDetails(orderNum);
  }
});
