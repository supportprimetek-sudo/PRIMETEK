// ==============================================================================
// PRIMETEK — WhatsApp Gateway & CRM Integration Configuration
// Connects the Storefront, Checkout, and Admin Panel to your WhatsApp Cluster
// ==============================================================================

window.PRIMETEK_WA_CONFIG = {
  // Set to 'true' once your WhatsApp cluster (n8n + Evolution API) is live
  ENABLED: false,

  // Universal Gateway API Endpoint on your self-hosted cluster
  // Replace with your real domain once deployed (e.g. https://n8n.primetek.online/webhook/api/v1/send-message)
  GATEWAY_URL: 'https://n8n.yourdomain.com/webhook/api/v1/send-message',

  // Master API Key (must match UNIVERSAL_GATEWAY_API_KEY in your cluster .env)
  API_KEY: 'gateway_sec_replace_with_your_key',

  // Target translation language: 'original' (no translation) or 'tamil' (auto-translation)
  DEFAULT_LANGUAGE: 'original',

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

    // Format clean professional WhatsApp receipt
    var messageText =
      'Hi ' + orderData.name + '! 👋\n\n' +
      'Thank you for ordering with *PRIMETEK*!\n\n' +
      '📦 *Order Summary:*\n' + orderData.summary + '\n\n' +
      '💰 *Total Amount:* ₹' + orderData.total + '\n\n' +
      'Our engineering team has received your order. We are reviewing your customization notes and will share payment/delivery instructions shortly.\n\n' +
      '_Reply directly to this WhatsApp message anytime if you have any questions!_';

    try {
      var response = await fetch(this.GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.API_KEY
        },
        body: JSON.stringify({
          to: orderData.phone,
          message: messageText,
          target_language: orderData.language || this.DEFAULT_LANGUAGE,
          source: 'primetek_checkout',
          metadata: {
            email: orderData.email,
            company: orderData.company || '',
            notes: orderData.notes || '',
            total: orderData.total,
            items: orderData.items || []
          }
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
   * Helper function for Admin Panel to send a direct message (e.g. Payment link or Delivery link)
   * @param {string} to - Recipient phone number
   * @param {string} message - Message text
   * @param {string} language - 'original' or 'tamil'
   */
  sendCustomMessage: async function(to, message, language) {
    if (!this.ENABLED) {
      alert('WhatsApp Gateway is currently disabled. Enable it in whatsapp-config.js first.');
      return { success: false, reason: 'disabled' };
    }

    try {
      var response = await fetch(this.GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.API_KEY
        },
        body: JSON.stringify({
          to: to,
          message: message,
          target_language: language || this.DEFAULT_LANGUAGE,
          source: 'primetek_admin_panel'
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
