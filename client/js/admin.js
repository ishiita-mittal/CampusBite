'use strict';

/**
 * admin.js — Admin Dashboard logic for order management, menu CRUD, and operational metrics.
 */

// ── Auth Verification ──────────────────────────────────────────────────────────
const token = sessionStorage.getItem('campusbite_admin_token');
if (!token) {
  window.location.replace('admin-login.html');
}

// ── Elements ──────────────────────────────────────────────────────────────────
const logoutBtn       = document.getElementById('admin-logout-btn');
const metricToday     = document.getElementById('metric-today');
const metricTotal     = document.getElementById('metric-total');
const metricActive    = document.getElementById('metric-active');
const metricCompleted = document.getElementById('metric-completed');

// Orders
const orderSearchInp  = document.getElementById('order-search');
const orderStatusSel  = document.getElementById('order-status-filter');
const refreshOrdersBtn= document.getElementById('refresh-orders-btn');
const ordersTableBody = document.getElementById('orders-table-body');
const orderModalEl    = document.getElementById('orderModal');
const orderModal      = new bootstrap.Modal(orderModalEl);
const orderModalBody  = document.getElementById('order-modal-body');
const modalStatusActs = document.getElementById('modal-status-actions');

// Menu
const menuTableBody   = document.getElementById('menu-table-body');
const btnAddItem      = document.getElementById('btn-add-item');
const menuModalEl     = document.getElementById('menuModal');
const menuModal       = new bootstrap.Modal(menuModalEl);
const menuModalLabel  = document.getElementById('menuModalLabel');
const menuItemForm    = document.getElementById('menu-item-form');
const itemFormError   = document.getElementById('item-form-error');
const itemIdInp       = document.getElementById('item-id');
const itemNameInp     = document.getElementById('item-name');
const itemCategorySel = document.getElementById('item-category');
const itemPriceInp    = document.getElementById('item-price-rupees');
const itemDescInp     = document.getElementById('item-description');
const itemImageUrlInp = document.getElementById('item-image-url');
const itemAvailableInp= document.getElementById('item-available');
const saveItemBtn     = document.getElementById('save-item-btn');

// Allowed status workflow transitions
const ALLOWED_TRANSITIONS = {
  Placed:    ['Preparing', 'Cancelled'],
  Preparing: ['Ready'],
  Ready:     ['Completed'],
  Completed: [],
  Cancelled: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const icon = type === 'success' ? 'check-circle-fill text-success' : 'exclamation-triangle-fill text-danger';
  const el = document.createElement('div');
  el.className = `toast show align-items-center border-0 shadow-sm mb-2 toast-${type}`;
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi bi-${icon} me-2"></i>${msg}
      </div>
      <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function handleAuthError(err) {
  if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('token') || err.message.toLowerCase().includes('authentication'))) {
    sessionStorage.removeItem('campusbite_admin_token');
    window.location.replace('admin-login.html');
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('campusbite_admin_token');
  window.location.replace('admin-login.html');
});

// ── Metrics ───────────────────────────────────────────────────────────────────
async function loadMetrics() {
  try {
    const res = await apiRequest('/api/admin/metrics', 'GET', null, token);
    const data = res.data;

    metricToday.textContent = data.today_orders || 0;
    metricTotal.textContent = data.total_orders || 0;

    let activeCount = 0;
    let completedCount = 0;

    (data.by_status || []).forEach(row => {
      if (['Placed', 'Preparing', 'Ready'].includes(row.status)) {
        activeCount += row.count;
      } else if (row.status === 'Completed') {
        completedCount = row.count;
      }
    });

    metricActive.textContent = activeCount;
    metricCompleted.textContent = completedCount;
  } catch (err) {
    handleAuthError(err);
  }
}

// ── Orders Management ─────────────────────────────────────────────────────────
let searchDebounce;
orderSearchInp.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadOrders, 350);
});
orderStatusSel.addEventListener('change', loadOrders);
refreshOrdersBtn.addEventListener('click', () => {
  loadOrders();
  loadMetrics();
});

async function loadOrders() {
  ordersTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2"></div> Loading orders...
      </td>
    </tr>`;

  try {
    const params = new URLSearchParams();
    const search = orderSearchInp.value.trim();
    const status = orderStatusSel.value;
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest(`/api/admin/orders${qs}`, 'GET', null, token);
    const orders = res.data || [];

    if (orders.length === 0) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-4 d-block mb-1"></i> No orders found.
          </td>
        </tr>`;
      return;
    }

    ordersTableBody.innerHTML = orders.map(order => {
      const timeStr = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const amount  = (order.subtotal_paise / 100).toFixed(2);

      return `
        <tr>
          <td><span class="fw-bold font-monospace text-primary">${escHtml(order.order_number)}</span></td>
          <td><span class="text-muted small">${dateStr}, ${timeStr}</span></td>
          <td>${escHtml(order.customer_name)}</td>
          <td><span class="status-badge status-${order.status}">${order.status}</span></td>
          <td class="text-end fw-bold">₹${amount}</td>
          <td class="text-center">
            <button class="btn btn-outline-primary btn-sm btn-view-order" data-ordernum="${escHtml(order.order_number)}">
              <i class="bi bi-eye me-1"></i> View / Update
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click listeners to view buttons
    ordersTableBody.querySelectorAll('.btn-view-order').forEach(btn => {
      btn.addEventListener('click', () => openOrderModal(btn.dataset.ordernum));
    });

  } catch (err) {
    handleAuthError(err);
    ordersTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle me-1"></i> Error loading orders: ${escHtml(err.message)}
        </td>
      </tr>`;
  }
}

/** Open order modal with full item snapshot & transition controls */
async function openOrderModal(orderNumber) {
  orderModalBody.innerHTML = '<div class="text-center py-4"><div class="spinner-border spinner-orange"></div></div>';
  modalStatusActs.innerHTML = '';
  orderModal.show();

  try {
    const res = await apiRequest(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, 'GET', null, token);
    const order = res.data;

    const formattedDate = new Date(order.created_at).toLocaleString();
    const amount = (order.subtotal_paise / 100).toFixed(2);
    const allowedNext = ALLOWED_TRANSITIONS[order.status] || [];

    orderModalBody.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
        <div>
          <span class="text-muted small">Order Reference</span>
          <h5 class="fw-bold text-primary mb-0">${escHtml(order.order_number)}</h5>
        </div>
        <div>
          <span class="status-badge status-${order.status} fs-6">${order.status}</span>
        </div>
      </div>

      <div class="row g-2 mb-3 small">
        <div class="col-sm-6">
          <strong>Customer:</strong> ${escHtml(order.customer_name)}
        </div>
        <div class="col-sm-6">
          <strong>Placed At:</strong> ${formattedDate}
        </div>
        ${order.pickup_note ? `<div class="col-12 mt-2"><strong>Pickup Note:</strong> <span class="bg-light p-1 rounded">${escHtml(order.pickup_note)}</span></div>` : ''}
      </div>

      <h6 class="fw-bold mb-2">Items Ordered:</h6>
      <div class="table-responsive mb-3">
        <table class="table table-sm align-middle">
          <thead class="table-light">
            <tr>
              <th>Item Snapshot</th>
              <th class="text-center">Qty</th>
              <th class="text-end">Unit Price</th>
              <th class="text-end">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map(item => `
              <tr>
                <td>${escHtml(item.item_name_snapshot)}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">₹${(item.unit_price_paise / 100).toFixed(2)}</td>
                <td class="text-end fw-semibold">₹${(item.line_total_paise / 100).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3" class="text-end">Total:</th>
              <th class="text-end text-primary fs-6">₹${amount}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // Render allowed workflow actions
    if (allowedNext.length === 0) {
      modalStatusActs.innerHTML = `<span class="text-muted small"><i class="bi bi-lock me-1"></i>No further transitions available (Status is terminal: ${order.status}).</span>`;
    } else {
      modalStatusActs.innerHTML = `
        <span class="fw-semibold small me-1">Transition to:</span>
        ${allowedNext.map(targetStatus => {
          let btnClass = 'btn-primary';
          let icon = 'arrow-right-circle';
          if (targetStatus === 'Preparing') { btnClass = 'btn-warning text-dark'; icon = 'fire'; }
          if (targetStatus === 'Ready')     { btnClass = 'btn-info text-dark';    icon = 'bell'; }
          if (targetStatus === 'Completed'){ btnClass = 'btn-success';            icon = 'check-circle'; }
          if (targetStatus === 'Cancelled'){ btnClass = 'btn-outline-danger';     icon = 'x-circle'; }

          return `
            <button class="btn btn-sm ${btnClass} btn-transition" data-status="${targetStatus}">
              <i class="bi bi-${icon} me-1"></i> ${targetStatus}
            </button>
          `;
        }).join('')}
      `;

      modalStatusActs.querySelectorAll('.btn-transition').forEach(b => {
        b.addEventListener('click', () => updateStatus(order.order_number, b.dataset.status));
      });
    }

  } catch (err) {
    handleAuthError(err);
    orderModalBody.innerHTML = `<div class="alert alert-danger">${escHtml(err.message)}</div>`;
  }
}

/** Update order status through protected API */
async function updateStatus(orderNumber, newStatus) {
  try {
    await apiPatch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, { status: newStatus }, token);
    showToast(`Order ${orderNumber} updated to "${newStatus}"!`);
    orderModal.hide();
    loadOrders();
    loadMetrics();
  } catch (err) {
    handleAuthError(err);
    showToast(err.message || 'Status transition rejected.', 'error');
  }
}

// ── Menu Management ───────────────────────────────────────────────────────────
let cachedMenuItems = [];

async function loadMenuAdmin() {
  menuTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2"></div> Loading menu items...
      </td>
    </tr>`;

  try {
    const res = await apiGet('/api/menu');
    cachedMenuItems = res.data || [];

    if (cachedMenuItems.length === 0) {
      menuTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">No menu items found.</td>
        </tr>`;
      return;
    }

    menuTableBody.innerHTML = cachedMenuItems.map(item => {
      const priceRupees = (item.price_paise / 100).toFixed(2);
      const img = item.image_url
        ? `<img src="${item.image_url}" style="width:50px; height:50px; object-fit:cover; border-radius:6px;" onerror="this.outerHTML='🍱'" />`
        : '🍱';

      return `
        <tr>
          <td>${img}</td>
          <td>
            <div class="fw-bold">${escHtml(item.name)}</div>
            <div class="text-muted small text-truncate" style="max-width: 300px;">${escHtml(item.description || '')}</div>
          </td>
          <td><span class="badge-category badge-${item.category}">${item.category}</span></td>
          <td class="text-end fw-semibold">₹${priceRupees}</td>
          <td class="text-center">
            <div class="form-check form-switch d-inline-block">
              <input class="form-check-input toggle-avail" type="checkbox" data-id="${item.id}" ${item.is_available ? 'checked' : ''} />
            </div>
          </td>
          <td class="text-center">
            <button class="btn btn-outline-secondary btn-sm btn-edit-item" data-id="${item.id}">
              <i class="bi bi-pencil me-1"></i> Edit
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach toggle listeners
    menuTableBody.querySelectorAll('.toggle-avail').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const id = toggle.dataset.id;
        const isAvailable = toggle.checked;
        try {
          await apiPatch(`/api/admin/menu/${id}/availability`, { is_available: isAvailable }, token);
          showToast(`Item availability updated!`);
        } catch (err) {
          handleAuthError(err);
          toggle.checked = !isAvailable; // revert on error
          showToast(err.message || 'Failed to update availability', 'error');
        }
      });
    });

    // Attach edit listeners
    menuTableBody.querySelectorAll('.btn-edit-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const item = cachedMenuItems.find(i => i.id === id);
        if (item) openEditMenuModal(item);
      });
    });

  } catch (err) {
    menuTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-danger">Error loading menu: ${escHtml(err.message)}</td>
      </tr>`;
  }
}

// Add new menu item
btnAddItem.addEventListener('click', () => {
  menuModalLabel.textContent = 'Add Menu Item';
  menuItemForm.reset();
  itemIdInp.value = '';
  itemAvailableInp.checked = true;
  itemFormError.classList.add('d-none');
  menuModal.show();
});

// Edit existing menu item
function openEditMenuModal(item) {
  menuModalLabel.textContent = 'Edit Menu Item';
  itemFormError.classList.add('d-none');
  itemIdInp.value = item.id;
  itemNameInp.value = item.name;
  itemCategorySel.value = item.category;
  itemPriceInp.value = (item.price_paise / 100);
  itemDescInp.value = item.description || '';
  itemImageUrlInp.value = item.image_url || '';
  itemAvailableInp.checked = !!item.is_available;
  menuModal.show();
}

// Save menu item form (Create or Update)
menuItemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  itemFormError.classList.add('d-none');
  itemFormError.textContent = '';

  const id = itemIdInp.value;
  const name = itemNameInp.value.trim();
  const category = itemCategorySel.value;
  const priceRupees = parseFloat(itemPriceInp.value);
  const description = itemDescInp.value.trim();
  const image_url = itemImageUrlInp.value.trim();
  const is_available = itemAvailableInp.checked;

  if (!name || isNaN(priceRupees) || priceRupees < 0) {
    itemFormError.textContent = 'Please fill out name and a valid non-negative price.';
    itemFormError.classList.remove('d-none');
    return;
  }

  const price_paise = Math.round(priceRupees * 100);

  saveItemBtn.disabled = true;
  saveItemBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

  try {
    const payload = {
      name,
      category,
      price_paise,
      description,
      image_url,
      is_available,
    };

    if (id) {
      // Update
      await apiPut(`/api/admin/menu/${id}`, payload, token);
      showToast(`"${name}" updated successfully!`);
    } else {
      // Create
      await apiPost('/api/admin/menu', payload, token);
      showToast(`"${name}" added to menu!`);
    }

    menuModal.hide();
    loadMenuAdmin();
  } catch (err) {
    handleAuthError(err);
    itemFormError.textContent = err.message || 'Failed to save menu item.';
    itemFormError.classList.remove('d-none');
  } finally {
    saveItemBtn.disabled = false;
    saveItemBtn.innerHTML = 'Save Item';
  }
});

// Switch tabs refresh
document.getElementById('menu-tab').addEventListener('shown.bs.tab', loadMenuAdmin);

// Initial Load
loadMetrics();
loadOrders();
