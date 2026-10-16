'use strict';

/**
 * checkout.js — Cart review, quantity updates, customer info, and order submission.
 */

const emptyCartSection = document.getElementById('empty-cart');
const checkoutLayout   = document.getElementById('checkout-layout');
const cartItemsList    = document.getElementById('cart-items-list');
const displaySubtotal  = document.getElementById('display-subtotal');
const clearCartBtn     = document.getElementById('clear-cart-btn');
const checkoutForm     = document.getElementById('checkout-form');
const customerNameInp  = document.getElementById('customer-name');
const pickupNoteInp    = document.getElementById('pickup-note');
const formError        = document.getElementById('form-error');
const placeOrderBtn    = document.getElementById('place-order-btn');
const orderSuccessSec  = document.getElementById('order-success');
const confirmOrderNum  = document.getElementById('confirm-order-number');
const confirmTotal     = document.getElementById('confirm-total');

// Helper to escape HTML strings
function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Render cart items or show empty state */
function renderCheckout() {
  const items = Cart.load();
  Cart.updateBadge();

  if (items.length === 0) {
    emptyCartSection.classList.remove('d-none');
    checkoutLayout.classList.add('d-none');
    return;
  }

  emptyCartSection.classList.add('d-none');
  checkoutLayout.classList.remove('d-none');

  cartItemsList.innerHTML = items.map(item => {
    const unitPrice = (item.price_paise / 100).toFixed(2);
    const lineTotal = ((item.price_paise * item.quantity) / 100).toFixed(2);
    return `
      <div class="cart-item d-flex align-items-center justify-content-between py-2 border-bottom" data-id="${item.id}">
        <div class="me-3 flex-grow-1">
          <div class="cart-item-name fw-semibold">${escHtml(item.name)}</div>
          <div class="cart-item-price small text-muted">₹${unitPrice} each</div>
        </div>
        <div class="d-flex align-items-center gap-2 me-3">
          <button class="btn btn-outline-secondary btn-sm qty-btn btn-decrease" aria-label="Decrease quantity" data-id="${item.id}">
            <i class="bi bi-dash"></i>
          </button>
          <span class="qty-display fw-bold px-2">${item.quantity}</span>
          <button class="btn btn-outline-secondary btn-sm qty-btn btn-increase" aria-label="Increase quantity" data-id="${item.id}">
            <i class="bi bi-plus"></i>
          </button>
        </div>
        <div class="text-end" style="min-width: 80px;">
          <div class="fw-bold">₹${lineTotal}</div>
          <button class="btn btn-link btn-sm text-danger text-decoration-none p-0 btn-remove" data-id="${item.id}">
            <i class="bi bi-trash3"></i> Remove
          </button>
        </div>
      </div>
    `;
  }).join('');

  const totalPaise = Cart.subtotalPaise();
  displaySubtotal.textContent = `₹${(totalPaise / 100).toFixed(2)}`;

  attachCartItemListeners();
}

/** Attach event listeners to quantity and remove buttons */
function attachCartItemListeners() {
  cartItemsList.querySelectorAll('.btn-increase').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const item = Cart.load().find(i => i.id === id);
      if (item && item.quantity < 50) {
        Cart.setQty(id, item.quantity + 1);
        renderCheckout();
      }
    });
  });

  cartItemsList.querySelectorAll('.btn-decrease').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const item = Cart.load().find(i => i.id === id);
      if (item) {
        if (item.quantity > 1) {
          Cart.setQty(id, item.quantity - 1);
        } else {
          Cart.remove(id);
        }
        renderCheckout();
      }
    });
  });

  cartItemsList.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      Cart.remove(id);
      renderCheckout();
    });
  });
}

/** Clear entire cart */
clearCartBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear your cart?')) {
    Cart.clear();
    renderCheckout();
  }
});

/** Save order reference locally for My Orders history */
function saveLocalOrderReference(orderNumber, customerName, totalPaise) {
  try {
    const orders = JSON.parse(localStorage.getItem('campusbite_recent_orders') || '[]');
    orders.unshift({
      order_number: orderNumber,
      customer_name: customerName,
      subtotal_paise: totalPaise,
      placed_at: new Date().toISOString(),
    });
    // Keep last 25 orders
    localStorage.setItem('campusbite_recent_orders', JSON.stringify(orders.slice(0, 25)));
  } catch (err) {
    console.error('Could not save order reference locally:', err);
  }
}

/** Handle checkout submission */
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('d-none');
  formError.textContent = '';

  const customerName = customerNameInp.value.trim();
  const pickupNote   = pickupNoteInp.value.trim();

  if (!customerName) {
    customerNameInp.classList.add('is-invalid');
    formError.textContent = 'Please enter your name.';
    formError.classList.remove('d-none');
    return;
  }
  customerNameInp.classList.remove('is-invalid');

  const items = Cart.load();
  if (items.length === 0) {
    formError.textContent = 'Your cart is empty.';
    formError.classList.remove('d-none');
    return;
  }

  // Disable button and show spinner
  placeOrderBtn.disabled = true;
  placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Placing Order...';

  try {
    const payload = {
      customer_name: customerName,
      pickup_note: pickupNote,
      items: items.map(item => ({
        menu_item_id: item.id,
        quantity: item.quantity,
      })),
    };

    const result = await apiPost('/api/orders', payload);
    const orderData = result.data;

    // Save order number to local customer history
    saveLocalOrderReference(orderData.order_number, customerName, orderData.subtotal_paise);

    // Clear cart
    Cart.clear();

    // Show order success screen
    checkoutLayout.classList.add('d-none');
    orderSuccessSec.classList.remove('d-none');

    confirmOrderNum.textContent = orderData.order_number;
    confirmTotal.textContent = `₹${(orderData.subtotal_paise / 100).toFixed(2)}`;

    // Update track button link
    const trackBtn = orderSuccessSec.querySelector('a[href="track-order.html"]');
    if (trackBtn) {
      trackBtn.href = `track-order.html?orderNumber=${encodeURIComponent(orderData.order_number)}`;
    }
  } catch (err) {
    formError.textContent = err.message || 'Failed to place order. Please check item availability.';
    formError.classList.remove('d-none');
  } finally {
    placeOrderBtn.disabled = false;
    placeOrderBtn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Place Order';
  }
});

// Initialize
renderCheckout();
