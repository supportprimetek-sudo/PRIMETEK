/**
 * PRIMETEK — Navigation Auth Status Controller
 * Dynamically mounts Login / User Account / Admin Panel links into the header navigation.
 */
(function(){
  function mountNavAuth(user){
    const navRight = document.querySelector('.nav-right');
    if(!navRight) return;

    // Remove existing auth items if re-mounting
    const existing = navRight.querySelector('.nav-auth-wrapper');
    if(existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'nav-auth-wrapper';

    if(!user){
      // Guest: Show Login button
      wrapper.innerHTML = `
        <a href="login.html" class="nav-auth-btn" title="Sign In / Register">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Login</span>
        </a>
      `;
    } else if(user.isAdmin){
      // Admin: Show Admin Panel Badge & Dropdown
      wrapper.innerHTML = `
        <div class="nav-user-menu">
          <a href="admin.html" class="nav-admin-badge" title="Go to Admin Dashboard">
            <span class="admin-dot"></span>
            <span>Admin</span>
          </a>
          <button class="nav-user-dropdown-btn" id="userMenuBtn" aria-label="Account options" aria-expanded="false">
            <span class="user-initial">${(user.displayName || user.email || 'A')[0].toUpperCase()}</span>
          </button>
          <div class="nav-dropdown-menu" id="userDropdown">
            <div class="dropdown-header">
              <span class="dropdown-name">${user.displayName || 'Administrator'}</span>
              <span class="dropdown-email">${user.email}</span>
            </div>
            <div class="dropdown-divider"></div>
            <a href="admin.html" class="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Admin Dashboard
            </a>
            <a href="products.html" class="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              View Storefront
            </a>
            <a href="account.html" class="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              My Account
            </a>
            <div class="dropdown-divider"></div>
            <button id="navLogoutBtn" class="dropdown-item dropdown-logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Log Out
            </button>
          </div>
        </div>
      `;
    } else {
      // Customer: Show Account link & Dropdown
      wrapper.innerHTML = `
        <div class="nav-user-menu">
          <a href="account.html" class="nav-user-pill" title="My Account">
            <span class="user-initial">${(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
            <span class="user-name-text">${user.displayName || user.email.split('@')[0]}</span>
          </a>
          <button class="nav-user-dropdown-btn" id="userMenuBtn" aria-label="Account options" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="nav-dropdown-menu" id="userDropdown">
            <div class="dropdown-header">
              <span class="dropdown-name">${user.displayName || 'Customer'}</span>
              <span class="dropdown-email">${user.email}</span>
            </div>
            <div class="dropdown-divider"></div>
            <a href="account.html" class="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              My Downloads & Orders
            </a>
            <a href="products.html" class="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Browse Shop
            </a>
            <div class="dropdown-divider"></div>
            <button id="navLogoutBtn" class="dropdown-item dropdown-logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Log Out
            </button>
          </div>
        </div>
      `;
    }

    // Insert before cart-link or at beginning of nav-right
    const cartLink = navRight.querySelector('.cart-link');
    if(cartLink){
      navRight.insertBefore(wrapper, cartLink);
    } else {
      navRight.appendChild(wrapper);
    }

    // Dropdown toggle logic
    const menuBtn = wrapper.querySelector('#userMenuBtn');
    const dropdown = wrapper.querySelector('#userDropdown');
    if(menuBtn && dropdown){
      menuBtn.addEventListener('click', function(e){
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('active');
        dropdown.classList.toggle('active', !isOpen);
        menuBtn.setAttribute('aria-expanded', !isOpen);
      });

      document.addEventListener('click', function(e){
        if(!wrapper.contains(e.target)){
          dropdown.classList.remove('active');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Logout button logic
    const logoutBtn = wrapper.querySelector('#navLogoutBtn');
    if(logoutBtn){
      logoutBtn.addEventListener('click', async function(){
        if(window.PrimetekAuth){
          await window.PrimetekAuth.logout();
        }
        window.location.reload();
      });
    }
  }

  // Initialize auth state listener
  document.addEventListener('DOMContentLoaded', function(){
    if(window.PrimetekAuth){
      window.PrimetekAuth.onAuthStateChanged(function(user){
        mountNavAuth(user);
      });
    } else {
      mountNavAuth(null);
    }
  });
})();
