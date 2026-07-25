/* PRIMETEK — shared cart logic (localStorage-based, no backend) */
(function(){
  const CART_KEY = 'primetek_cart';

  function getCart(){
    try{
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){
      return [];
    }
  }

  function saveCart(cart){
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function addToCart(item){
    const cart = getCart();
    const existing = cart.find(i => i.id === item.id);
    if(existing){
      existing.qty += item.qty || 1;
    }else{
      cart.push({ id:item.id, name:item.name, price:item.price, qty:item.qty || 1 });
    }
    saveCart(cart);
  }

  function removeFromCart(id){
    saveCart(getCart().filter(i => i.id !== id));
  }

  function setQty(id, qty){
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if(!item) return;
    item.qty = Math.max(1, qty);
    saveCart(cart);
  }

  function cartCount(){
    return getCart().reduce((sum, i) => sum + i.qty, 0);
  }

  function cartTotal(){
    return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
  }

  function formatPrice(n){
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function updateCartBadge(){
    document.querySelectorAll('.cart-badge').forEach(function(badge){
      const count = cartCount();
      badge.textContent = count;
      badge.setAttribute('data-count', count);
    });
  }

  window.PrimetekCart = {
    getCart, saveCart, addToCart, removeFromCart, setQty,
    cartCount, cartTotal, formatPrice, updateCartBadge
  };

  function initMobileNav(){
    var toggle = document.getElementById('menuToggle');
    var nav = document.getElementById('siteNav');
    if(!toggle || !nav) return;

    function openNav(){
      document.body.classList.add('nav-rendering');
      nav.getBoundingClientRect(); // force reflow so the transform transition animates
      requestAnimationFrame(function(){
        document.body.classList.add('nav-open');
      });
      toggle.setAttribute('aria-expanded', 'true');
    }

    function closeNav(){
      if(!document.body.classList.contains('nav-open')){
        document.body.classList.remove('nav-rendering');
        return;
      }
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      var onEnd = function(e){
        if(e.target !== nav || e.propertyName !== 'transform') return;
        document.body.classList.remove('nav-rendering');
        nav.removeEventListener('transitionend', onEnd);
      };
      nav.addEventListener('transitionend', onEnd);
    }

    toggle.addEventListener('click', function(){
      if(document.body.classList.contains('nav-open')){
        closeNav();
      }else{
        openNav();
      }
    });

    nav.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeNav();
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    updateCartBadge();
    initMobileNav();
  });
})();
