/**
 * PRIMETEK Dedicated WhatsApp Gateway Integration
 * Connects www.primetek.online Storefront & Admin Panel to the isolated n8n Cluster.
 * Works seamlessly with Evolution API (instance: primetek_store).
 */
(function(window) {
  'use strict';

  // Default Cluster Configuration
  // Can be overridden via Admin Panel (admin.html -> Automations) or in window.PRIMETEK_WA_CONFIG
  var DEFAULT_CONFIG = {
    ENABLED: true,
    CHECKOUT_URL: 'https://wa-gateway-production-473f.up.railway.app/webhook/primetek/v1/checkout-order',
    ADMIN_DISPATCH_URL: 'https://wa-gateway-production-473f.up.railway.app/webhook/primetek/v1/admin-message',
    API_KEY: 'primetek_sec_replace_with_strong_token_32_chars',
    SENDER_NUMBER: '+917870819862',
    INSTANCE: 'primetek_store'
  };

  function cleanPhoneNumber(phone) {
    if (!phone) return '';
    var cleaned = String(phone).replace(/[^0-9]/g, '');
    // If 10-digit Indian number without country code, prepend 91
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return cleaned;
  }

  function getActiveConfig() {
    var config = {
      ENABLED: DEFAULT_CONFIG.ENABLED,
      CHECKOUT_URL: DEFAULT_CONFIG.CHECKOUT_URL,
      ADMIN_DISPATCH_URL: DEFAULT_CONFIG.ADMIN_DISPATCH_URL,
      API_KEY: DEFAULT_CONFIG.API_KEY,
      INSTANCE: DEFAULT_CONFIG.INSTANCE
    };

    // Check if customized in localStorage (Admin Settings)
    try {
      var saved = localStorage.getItem('primetek_whatsapp_config');
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.enabled !== undefined) config.ENABLED = !!parsed.enabled;
        if (parsed.apiKey && parsed.apiKey.trim() !== '') config.API_KEY = parsed.apiKey.trim();
        if (parsed.apiUrl && parsed.apiUrl.trim() !== '') {
          var base = parsed.apiUrl.trim().replace(/\/+$/, '');
          if (base.indexOf('/webhook/primetek') !== -1) {
            config.CHECKOUT_URL = base.replace(/\/admin-message$/, '') + '/checkout-order';
            config.ADMIN_DISPATCH_URL = base.replace(/\/checkout-order$/, '') + '/admin-message';
          } else {
            config.CHECKOUT_URL = base;
            config.ADMIN_DISPATCH_URL = base;
          }
        }
        if (parsed.phoneNumberId) config.INSTANCE = parsed.phoneNumberId;
      }
    } catch (e) {
      console.warn('[PRIMETEK WA] Could not read local config:', e);
    }

    return config;
  }

  window.PRIMETEK_WA_CONFIG = {
    ENABLED: DEFAULT_CONFIG.ENABLED,
    CHECKOUT_URL: DEFAULT_CONFIG.CHECKOUT_URL,
    ADMIN_DISPATCH_URL: DEFAULT_CONFIG.ADMIN_DISPATCH_URL,
    API_KEY: DEFAULT_CONFIG.API_KEY,

    /**
     * Dispatches official WhatsApp order confirmation when a customer checks out on checkout.html
     * @param {Object} orderData - { name, phone, email, company, notes, summary, total, items }
     * @returns {Promise<Object>}
     */
    sendOrderNotification: function(orderData) {
      var cfg = getActiveConfig();
      if (!cfg.ENABLED) {
        console.log('[PRIMETEK WA] Gateway disabled in settings. Skipping dispatch.');
        return Promise.resolve({ skipped: true });
      }

      var phone = cleanPhoneNumber(orderData.phone);
      if (!phone) {
        console.error('[PRIMETEK WA] Missing phone number for order dispatch.');
        return Promise.reject(new Error('Missing phone number'));
      }

      var payload = {
        name: orderData.name || 'Valued Customer',
        phone: phone,
        to: phone,
        email: orderData.email || '',
        company: orderData.company || '',
        notes: orderData.notes || '',
        summary: orderData.summary || '',
        total: orderData.total || 0,
        items: orderData.items || []
      };

      console.log('[PRIMETEK WA] Dispatching checkout order to cluster:', payload);

      return fetch(cfg.CHECKOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-primetek-key': cfg.API_KEY
        },
        body: JSON.stringify(payload)
      })
      .then(function(res) {
        return res.json().then(function(data) {
          if (!res.ok) {
            throw new Error(data.error || 'Server responded with status ' + res.status);
          }
          console.log('[PRIMETEK WA] Order receipt dispatched successfully:', data);
          return data;
        });
      })
      .catch(function(err) {
        console.error('[PRIMETEK WA] Order dispatch failed:', err);
        return { success: false, error: err.message };
      });
    },

    /**
     * Dispatches a direct 1-click WhatsApp message from admin CRM or project notifications
     * @param {string} phone - Recipient phone number
     * @param {string} message - Message text to deliver
     * @returns {Promise<Object>}
     */
    sendCustomMessage: function(phone, message) {
      var cfg = getActiveConfig();
      if (!cfg.ENABLED) {
        console.log('[PRIMETEK WA] Gateway disabled in settings. Skipping dispatch.');
        return Promise.resolve({ skipped: true });
      }

      var cleanPhone = cleanPhoneNumber(phone);
      if (!cleanPhone || !message) {
        console.error('[PRIMETEK WA] Phone and message are required.');
        return Promise.reject(new Error('Phone and message required'));
      }

      var payload = {
        to: cleanPhone,
        phone: cleanPhone,
        message: String(message).trim()
      };

      console.log('[PRIMETEK WA] Dispatching message via Admin Gateway:', payload);

      return fetch(cfg.ADMIN_DISPATCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-primetek-key': cfg.API_KEY
        },
        body: JSON.stringify(payload)
      })
      .then(function(res) {
        return res.json().then(function(data) {
          if (!res.ok) {
            throw new Error(data.error || 'Server responded with status ' + res.status);
          }
          console.log('[PRIMETEK WA] Message delivered successfully:', data);
          return data;
        });
      })
      .catch(function(err) {
        console.error('[PRIMETEK WA] Admin dispatch failed:', err);
        return { success: false, error: err.message };
      });
    }
  };

  console.log('[PRIMETEK WA] Gateway integration loaded.');
})(window);
