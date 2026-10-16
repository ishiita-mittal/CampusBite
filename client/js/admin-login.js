'use strict';

/**
 * admin-login.js — Administrator authentication and JWT storage.
 * Note: Uses sessionStorage for demo purposes (cleared when browser tab closes).
 */

const loginForm  = document.getElementById('admin-login-form');
const usernameInp= document.getElementById('username');
const passwordInp= document.getElementById('password');
const loginBtn   = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

// If already authenticated, redirect straight to admin dashboard
if (sessionStorage.getItem('campusbite_admin_token')) {
  window.location.replace('admin.html');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('d-none');
  loginError.textContent = '';

  const username = usernameInp.value.trim();
  const password = passwordInp.value;

  if (!username || !password) {
    loginError.textContent = 'Please enter both username and password.';
    loginError.classList.remove('d-none');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

  try {
    const res = await apiPost('/api/admin/login', { username, password });
    if (res.success && res.data && res.data.token) {
      sessionStorage.setItem('campusbite_admin_token', res.data.token);
      window.location.href = 'admin.html';
    } else {
      throw new Error(res.error || 'Authentication failed.');
    }
  } catch (err) {
    loginError.textContent = err.message || 'Invalid username or password.';
    loginError.classList.remove('d-none');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Sign In';
  }
});
