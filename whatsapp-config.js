// ==============================================================================
// PRIMETEK — Dedicated WhatsApp Gateway Configuration
// Dedicated pipeline for Storefront Checkout and Admin CRM Dashboard
// ==============================================================================

window.PRIMETEK_WA_CONFIG = {
  // Set to 'true' once your WhatsApp cluster (n8n + Evolution API) is live
  ENABLED: false,

  // Dedicated PRIMETEK Endpoints on your cluster
  // (Replace domain with your production URL, e.g. https://n8n.primetek.online)
  CHECKOUT_URL: 'https://n8n.yourdomain.com/webhook/primetek/v1/checkout-order',
  ADMIN_URL: 'https://n8n.yourdomain.com/webhook/primetek/v1/admin-message',

  // Master Secret Key (matches PRIMETEK_GATEWAY_API_KEY in cluster .env)
  API_KEY: 'primetek_sec_replace_with_your_key',

  /**
   * Dispatches an automated WhatsApp order confirmation to the customer
   * @param {Object} orderData - Order details { name, phone, email, summary, total, items, notes }
   */
  sendOrderNotification: async function(orderData) {
    if (!this.ENABLED) {
      console.info('[PRIMETEK WhatsApp] Notifications currently paused (ENABLED: false in whatsapp-config.js).');
      return { success: false, reason: 'disabled' };
    }

    if (!orderData || !orderData.phone) {
      console.warn('[PRIMETEK WhatsApp] Cannot send WhatsApp: missing phone number.');
      return { success: false, reason: 'missing_phone' };
    }

    try {
      var response = await fetch(this.CHECKOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-primetek-key': this.API_KEY
        },
        body: JSON.stringify({
          name: orderData.name,
          phone: orderData.phone,
          email: orderData.email,
          summary: orderData.summary,
          total: orderData.total,
          items: orderData.items || [],
          company: orderData.company || '',
          notes: orderData.notes || ''
        })
      });

      var data = await response.json();
      console.log('[PRIMETEK WhatsApp] Order receipt dispatched:', data);
      return data;
    } catch (err) {
      // Graceful fallback: never block user checkout if network/cluster is unavailable
      console.warn('[PRIMETEK WhatsApp] Notification error (skipped gracefully):', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Dispatches direct admin messages from Admin CRM Kanban Board
   * @param {string} to - Customer phone number
   * @param {string} message - Message text
   */
  sendCustomMessage: async function(to, message) {
    if (!this.ENABLED) {
      alert('WhatsApp Gateway is currently disabled. Enable it in whatsapp-config.js first.');
      return { success: false, reason: 'disabled' };
    }

    try {
      var response = await fetch(this.ADMIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-primetek-key': this.API_KEY
        },
        body: JSON.stringify({
          to: to,
          message: message
        })
      });

      var data = await response.json();
      return data;
    } catch (err) {
      console.error('[PRIMETEK WhatsApp] Send failed:', err);
      return { success: false, error: err.message };
    }
  }
};
