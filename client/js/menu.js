'use strict';

/**
 * menu.js — Menu page logic
 * Fetches items from the backend, renders food cards, handles filters,
 * and connects the "Add to cart" buttons.
 */

const grid         = document.getElementById('menu-grid');
const searchInput  = document.getElementById('search-input');
const catFilter    = document.getElementById('category-filter');
const availFilter  = document.getElementById('avail-filter');
const clearBtn     = document.getElementById('clear-filters');
const resultsCount = document.getElementById('results-count');

// Debounce helper — waits 350 ms after last keystroke before fetching
let debounceTimer;
function debounce(fn, delay = 350) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, delay);
}

function buildQueryString() {
  const params = new URLSearchParams();
  const search = searchInput.value.trim();
  const cat    = catFilter.value;
  const avail  = availFilter.value;
  if (search) params.set('search',    search);
  if (cat)    params.set('category',  cat);
  if (avail)  params.set('available', avail);
  return params.toString() ? `?${params.toString()}` : '';
}

async function loadMenu() {
  grid.innerHTML = `
    <div class="col-12 state-container">
      <div class="spinner-border spinner-orange" role="status"></div>
      <p class="mt-3">Loading menu…</p>
    </div>`;
  resultsCount.textContent = '';

  try {
    const qs   = buildQueryString();
    const data = await apiGet(`/api/menu${qs}`);
    const items = data.data || [];

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="col-12 state-container">
          <div class="state-icon">🔍</div>
          <div class="state-title">No items found</div>
          <div class="state-desc">Try adjusting your search or filters.</div>
        </div>`;
      resultsCount.textContent = '0 items';
      return;
    }

    resultsCount.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} found`;
    grid.innerHTML = items.map(renderCard).join('');

    // Attach add-to-cart button listeners
    grid.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const id    = parseInt(btn.dataset.id);
        const name  = btn.dataset.name;
        const price = parseInt(btn.dataset.price);
        Cart.add({ id, name, price_paise: price });
        showToast(`"${name}" added to cart! 🛒`, 'success');
      });
    });

  } catch (err) {
    grid.innerHTML = `
      <div class="col-12 state-container">
        <div class="state-icon">⚠️</div>
        <div class="state-title">Could not load menu</div>
        <div class="state-desc">${err.message || 'Is the server running?'}</div>
        <button class="btn btn-outline-primary mt-3" onclick="loadMenu()">
          <i class="bi bi-arrow-clockwise me-1"></i>Retry
        </button>
      </div>`;
  }
}

function renderCard(item) {
  const price       = (item.price_paise / 100).toFixed(2);
  const unavailable = !item.is_available;
  const imgHtml     = item.image_url
    ? `<img src="${item.image_url}" class="food-card-img" alt="${escHtml(item.name)}"
            onerror="this.outerHTML='<div class=food-card-img-placeholder>🍽️</div>'">`
    : `<div class="food-card-img-placeholder">🍽️</div>`;

  const addBtn = unavailable
    ? `<span class="badge-unavailable"><i class="bi bi-x-circle me-1"></i>Unavailable</span>`
    : `<button class="btn btn-primary btn-sm btn-add-cart"
          data-id="${item.id}" data-name="${escHtml(item.name)}" data-price="${item.price_paise}">
        <i class="bi bi-cart-plus me-1"></i>Add
       </button>`;

  return `
    <div class="col-sm-6 col-lg-4 col-xl-3">
      <div class="food-card${unavailable ? ' unavailable' : ''}">
        ${imgHtml}
        <div class="food-card-body">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <span class="badge-category badge-${item.category}">${item.category}</span>
          </div>
          <div class="food-card-name">${escHtml(item.name)}</div>
          <div class="food-card-desc">${escHtml(item.description || '')}</div>
          <div class="food-card-footer">
            <span class="food-card-price">₹${price}</span>
            ${addBtn}
          </div>
        </div>
      </div>
    </div>`;
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const id        = `toast-${Date.now()}`;
  const icon      = type === 'success' ? 'check-circle-fill text-success' : 'exclamation-triangle-fill text-danger';
  const el        = document.createElement('div');
  el.innerHTML = `
    <div id="${id}" class="toast show align-items-center border-0 shadow-sm mb-2" role="alert">
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-${icon} me-2"></i>${msg}
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Event listeners
searchInput.addEventListener('input',  () => debounce(loadMenu));
catFilter.addEventListener('change',   loadMenu);
availFilter.addEventListener('change', loadMenu);
clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  catFilter.value   = '';
  availFilter.value = '';
  loadMenu();
});

// Init
Cart.updateBadge();
loadMenu();
