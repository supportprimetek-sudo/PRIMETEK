/**
 * PRIMETEK Admin Live WhatsApp Inbox Widget
 *
 * RESTRICTION RULE:
 * - Normal visitors & non-admin users see the ORIGINAL standard WhatsApp float button.
 * - ONLY logged-in Administrators or permitted staff see this live inbox widget
 *   to read & reply to customer WhatsApp messages in real-time without opening WhatsApp Web.
 */
(function(window, document) {
  'use strict';

  function getGatewayBase() {
    if (window.PRIMETEK_WA_CONFIG && window.PRIMETEK_WA_CONFIG.ADMIN_DISPATCH_URL) {
      return window.PRIMETEK_WA_CONFIG.ADMIN_DISPATCH_URL.replace(/\/webhook\/primetek\/v1\/admin-message\/?$/, '');
    }
    return 'https://names-highest-alliance-farming.trycloudflare.com';
  }

  // State
  let isOpen = false;
  let activeChatPhone = null;
  let activeChatCustomerName = '';
  let activeChatMessages = [];
  let chatList = [];
  let sseSource = null;
  let unreadTotal = 0;
  let isWidgetMounted = false;

  // Web Audio Notification Chime
  function playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  // Security & Role Verification
  function hasAdminPermission() {
    // 1. If currently inside admin dashboard
    if (window.location.pathname.includes('admin')) {
      return true;
    }

    // 2. Check PrimetekAuth in window
    if (window.PrimetekAuth && typeof window.PrimetekAuth.getCurrentUser === 'function') {
      const u = window.PrimetekAuth.getCurrentUser();
      if (u) {
        if (u.isAdmin) return true;
        if (u.permissions && (u.permissions.canManageAutomations || u.permissions.canManageCrm)) return true;
      }
    }

    // 3. Check persistent session
    try {
      const raw = localStorage.getItem('primetek_current_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u.isAdmin || u.role === 'super_admin' || u.role === 'project_manager' || u.role === 'developer') {
          return true;
        }
      }
    } catch (e) {}

    return false;
  }

  function mountAdminWidget() {
    if (isWidgetMounted || document.getElementById('primetekWaWidget')) return;

    document.body.classList.add('has-admin-wa-widget');

    const wrap = document.createElement('div');
    wrap.id = 'primetekWaWidget';
    wrap.innerHTML = `
      <!-- Launcher Button (Admin Mode) -->
      <button class="wa-widget-launcher" id="waWidgetLauncher" aria-label="Open WhatsApp Admin Inbox" title="PRIMETEK WhatsApp Live Inbox (Admin)">
        <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.05 2C6.508 2 2.02 6.487 2.02 12.03c0 1.994.579 3.85 1.579 5.412L2 22l4.671-1.567A9.965 9.965 0 0012.05 22c5.542 0 10.03-4.487 10.03-10.03C22.08 6.487 17.592 2 12.05 2zm0 18.11a8.06 8.06 0 01-4.377-1.28l-.314-.187-3.256 1.083 1.09-3.181-.204-.324a8.056 8.056 0 01-1.24-4.19c0-4.464 3.632-8.096 8.301-8.096 4.464 0 8.096 3.632 8.096 8.096 0 4.464-3.632 8.079-8.096 8.079z"/></svg>
        <span class="wa-widget-badge" id="waWidgetBadge">0</span>
      </button>

      <!-- Main Admin Inbox Box -->
      <div class="wa-widget-box" id="waWidgetBox">
        <!-- Header -->
        <div class="wa-box-header">
          <div class="wa-box-header-info">
            <div class="wa-avatar">🔐</div>
            <div class="wa-title-wrap">
              <div class="wa-header-title" id="waHeaderTitle">
                WhatsApp Live Inbox
              </div>
              <div class="wa-header-status" id="waHeaderStatus">Live Connected (+91 78708 19862)</div>
            </div>
          </div>
          <div class="wa-header-actions">
            <button class="wa-btn-icon" id="waBtnBack" style="display:none;" title="Back to Inbox List">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="wa-btn-icon" id="waBtnClose" title="Minimize">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div class="wa-inbox-topbar">
          <span>⚡ Live Customer Conversations</span>
          <span style="font-weight:600;color:#075E54;">Anti-Ban Active</span>
        </div>

        <!-- CONVERSATIONS LIST VIEW -->
        <div id="waAdminInboxView" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
          <div class="wa-admin-inbox-list" id="waAdminList">
            <div style="padding:28px 16px;text-align:center;color:#9CA3AF;font-size:13px;">Loading incoming customer chats...</div>
          </div>
        </div>

        <!-- ACTIVE CHAT CONVERSATION VIEW -->
        <div id="waAdminChatThreadView" style="display:none;flex-direction:column;flex:1;overflow:hidden;">
          <div class="wa-chat-body" id="waAdminChatBody"></div>
          <div class="wa-typing-banner" id="waAdminTypingBanner">
            ⏳ Simulating human typing on WhatsApp (takes 5-6s)...
          </div>
          <div class="wa-input-bar">
            <textarea class="wa-input-field" id="waAdminReplyInput" rows="1" placeholder="Type reply directly to customer on WhatsApp..."></textarea>
            <button class="wa-btn-send" id="waAdminReplySend" title="Send Reply with 5s Human Simulation">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(wrap);
    isWidgetMounted = true;
    bindEvents();
    initSSE();
    fetchChatList();
  }

  function unmountAdminWidget() {
    const el = document.getElementById('primetekWaWidget');
    if (el) el.remove();
    document.body.classList.remove('has-admin-wa-widget');
    isWidgetMounted = false;
    if (sseSource) {
      sseSource.close();
      sseSource = null;
    }
  }

  function bindEvents() {
    const launcher = document.getElementById('waWidgetLauncher');
    const box = document.getElementById('waWidgetBox');
    const btnClose = document.getElementById('waBtnClose');
    const btnBack = document.getElementById('waBtnBack');
    const adminInput = document.getElementById('waAdminReplyInput');
    const adminSend = document.getElementById('waAdminReplySend');

    launcher.addEventListener('click', () => {
      isOpen = !isOpen;
      box.style.display = isOpen ? 'flex' : 'none';
      if (isOpen) {
        if (!activeChatPhone) fetchChatList();
      }
    });

    btnClose.addEventListener('click', () => {
      isOpen = false;
      box.style.display = 'none';
    });

    btnBack.addEventListener('click', () => {
      activeChatPhone = null;
      activeChatCustomerName = '';
      document.getElementById('waAdminChatThreadView').style.display = 'none';
      document.getElementById('waAdminInboxView').style.display = 'flex';
      btnBack.style.display = 'none';
      document.getElementById('waHeaderTitle').textContent = 'WhatsApp Live Inbox';
      document.getElementById('waHeaderStatus').textContent = 'Live Connected (+91 78708 19862)';
      const headerAvatar = document.querySelector('.wa-box-header .wa-avatar');
      if (headerAvatar) headerAvatar.textContent = '🔐';
      fetchChatList();
    });

    adminSend.addEventListener('click', sendAdminReply);
    adminInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAdminReply();
      }
    });
  }

  // Format phone number nicely for display (+91 XXXXX XXXXX or +international)
  function formatPhoneDisplay(phone) {
    if (!phone) return '';
    let clean = String(phone).replace(/[^0-9]/g, '');
    // Safety filter for internal WhatsApp LID
    if (clean === '4733104341083') {
      clean = '918797186001';
    }
    if (clean.startsWith('91') && clean.length === 12) {
      return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return `+${clean}`;
  }

  // Resolve user display name
  function getDisplayName(name, phone) {
    if (name && !name.startsWith('Customer +') && name !== 'Customer' && name !== 'You' && name !== 'You (PRIMETEK)') {
      return name;
    }
    return 'Customer';
  }

  // Fetch list of chats
  async function fetchChatList() {
    const listEl = document.getElementById('waAdminList');
    if (!listEl) return;
    const base = getGatewayBase();

    try {
      const res = await fetch(`${base}/api/chats`);
      const data = await res.json();
      chatList = data.chats || [];

      // Calculate total unread messages count for red badge
      unreadTotal = chatList.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0);
      updateBadgeUI();

      if (!chatList.length) {
        listEl.innerHTML = `
          <div style="padding:36px 16px;text-align:center;color:#6B7280;font-size:13px;">
            <div style="font-size:34px;margin-bottom:8px;">📬</div>
            <b>No WhatsApp customer inquiries yet.</b>
            <p style="font-size:12px;color:#9CA3AF;margin-top:6px;">When customers chat with +91 78708 19862, they will instantly appear here for live reply!</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = chatList.map(c => {
        const displayName = getDisplayName(c.name, c.phone);
        const formattedPhone = formatPhoneDisplay(c.phone);
        const avatarLetter = (displayName !== 'Customer' ? displayName : c.phone)[0].toUpperCase();
        const unreadCount = Number(c.unreadCount) || 0;

        return `
        <div class="wa-inbox-item ${activeChatPhone === c.phone ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}" data-phone="${c.phone}" data-name="${escapeHtml(displayName)}">
          <div class="wa-inbox-avatar">${escapeHtml(avatarLetter)}</div>
          <div class="wa-inbox-details">
            <div class="wa-inbox-top">
              <span class="wa-inbox-name">${escapeHtml(displayName)}</span>
              <span class="wa-inbox-time">${formatTime(c.lastTimestamp)}</span>
            </div>
            <div class="wa-inbox-sub">
              <span class="wa-inbox-phone">
                <svg viewBox="0 0 24 24" width="10.5" height="10.5" fill="currentColor" style="display:inline-block;vertical-align:-1px;margin-right:2px;"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/></svg>
                ${escapeHtml(formattedPhone)}
              </span>
            </div>
            <div class="wa-inbox-bottom">
              <span class="wa-inbox-msg">${escapeHtml(c.lastMessage || '')}</span>
              ${unreadCount > 0 ? `<span class="wa-inbox-badge">${unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      `;
      }).join('');

      listEl.querySelectorAll('.wa-inbox-item').forEach(item => {
        item.addEventListener('click', () => {
          const phone = item.getAttribute('data-phone');
          const name = item.getAttribute('data-name');
          openChatThread(phone, name);
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#EF4444;font-size:12.5px;">Gateway offline or connecting...</div>`;
    }
  }

  // Open Chat Thread
  async function openChatThread(phone, preferredName) {
    activeChatPhone = phone;
    activeChatCustomerName = preferredName || 'Customer';
    const base = getGatewayBase();
    const btnBack = document.getElementById('waBtnBack');
    if (btnBack) btnBack.style.display = 'block';

    // Mark as read locally in chatList
    const targetChat = chatList.find(c => c.phone === phone);
    if (targetChat && targetChat.unreadCount) {
      unreadTotal = Math.max(0, unreadTotal - Number(targetChat.unreadCount));
      targetChat.unreadCount = 0;
      updateBadgeUI();
    }

    document.getElementById('waAdminInboxView').style.display = 'none';
    document.getElementById('waAdminChatThreadView').style.display = 'flex';

    const chatBody = document.getElementById('waAdminChatBody');
    chatBody.innerHTML = `<div style="text-align:center;padding:20px;color:#8C8C8C;font-size:12px;">Loading chat history...</div>`;

    try {
      const res = await fetch(`${base}/api/chats/${phone}`);
      const data = await res.json();
      activeChatMessages = data.messages || [];
      if (data.name && data.name !== 'Customer') {
        activeChatCustomerName = data.name;
      }

      const displayName = getDisplayName(activeChatCustomerName, phone);
      const formattedPhone = formatPhoneDisplay(phone);
      const avatarLetter = (displayName !== 'Customer' ? displayName : phone)[0].toUpperCase();

      const headerTitle = document.getElementById('waHeaderTitle');
      const headerStatus = document.getElementById('waHeaderStatus');
      const headerAvatar = document.querySelector('.wa-box-header .wa-avatar');

      if (headerTitle) headerTitle.textContent = displayName;
      if (headerStatus) headerStatus.textContent = `${formattedPhone} • Customer`;
      if (headerAvatar) headerAvatar.textContent = avatarLetter;

      renderThreadMessages();
    } catch (e) {
      chatBody.innerHTML = `<div style="color:#EF4444;text-align:center;padding:15px;font-size:12px;">Failed to load messages.</div>`;
    }
  }

  function renderThreadMessages() {
    const chatBody = document.getElementById('waAdminChatBody');
    if (!chatBody) return;

    const displayName = getDisplayName(activeChatCustomerName, activeChatPhone);
    const formattedPhone = formatPhoneDisplay(activeChatPhone);
    const avatarLetter = (displayName !== 'Customer' ? displayName : activeChatPhone)[0].toUpperCase();

    const bannerHtml = `
      <div class="wa-chat-contact-card">
        <div class="wa-contact-badge-avatar">${escapeHtml(avatarLetter)}</div>
        <div class="wa-contact-badge-info">
          <div class="wa-contact-badge-name">👤 <b>${escapeHtml(displayName)}</b></div>
          <div class="wa-contact-badge-phone">📞 <span>${escapeHtml(formattedPhone)}</span></div>
        </div>
      </div>
    `;

    if (!activeChatMessages.length) {
      chatBody.innerHTML = bannerHtml + `<div style="text-align:center;padding:20px;color:#8C8C8C;font-size:12px;">No messages yet. Send a reply below.</div>`;
      return;
    }

    const msgsHtml = activeChatMessages.map(m => {
      const msgSenderName = !m.fromMe ? (m.pushName || displayName || 'Customer') : 'You (Admin)';
      return `
      <div class="wa-msg ${m.fromMe ? 'wa-msg-outbound' : 'wa-msg-inbound'}">
        ${!m.fromMe ? `
          <div class="wa-msg-sender">
            <span>👤 ${escapeHtml(msgSenderName)}</span>
            <span class="wa-msg-sender-phone">(${escapeHtml(formattedPhone)})</span>
          </div>
        ` : ''}
        <div class="wa-msg-text">${escapeHtml(m.text)}</div>
        <div class="wa-msg-meta">
          ${formatTime(m.timestamp)}
          ${m.fromMe ? `<svg viewBox="0 0 16 15" width="14" height="14" fill="#34B7F1"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/></svg>` : ''}
        </div>
      </div>
    `;
    }).join('');

    chatBody.innerHTML = bannerHtml + msgsHtml;
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Admin Send Reply Handler
  async function sendAdminReply() {
    const input = document.getElementById('waAdminReplyInput');
    const btn = document.getElementById('waAdminReplySend');
    const typingBanner = document.getElementById('waAdminTypingBanner');
    const message = input.value.trim();

    if (!message || !activeChatPhone) return;

    input.value = '';
    btn.disabled = true;
    typingBanner.style.display = 'block';

    const base = getGatewayBase();

    // Optimistically add bubble to UI
    const tempMsg = {
      fromMe: true,
      text: message,
      timestamp: Date.now()
    };
    activeChatMessages.push(tempMsg);
    renderThreadMessages();

    try {
      const res = await fetch(`${base}/api/chats/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: activeChatPhone, message })
      });

      const data = await res.json();
      if (!data.success) {
        alert('Failed to send reply: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error sending reply: ' + err.message);
    } finally {
      btn.disabled = false;
      typingBanner.style.display = 'none';
      renderThreadMessages();
    }
  }

  // Real-Time Server-Sent Events (SSE)
  function initSSE() {
    const base = getGatewayBase();
    try {
      if (sseSource) sseSource.close();
      sseSource = new EventSource(`${base}/api/chats/stream`);

      sseSource.addEventListener('new_message', (e) => {
        try {
          const data = JSON.parse(e.data);
          const { phone, message, name } = data;

          if (!message.fromMe) {
            playNotificationSound();
            const existingChat = chatList.find(c => c.phone === phone);
            if (existingChat && activeChatPhone !== phone) {
              existingChat.unreadCount = (Number(existingChat.unreadCount) || 0) + 1;
              existingChat.lastMessage = message.text;
              existingChat.lastTimestamp = message.timestamp;
            }
            unreadTotal = chatList.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0) || (unreadTotal + 1);
            updateBadgeUI();
          }

          if (activeChatPhone && activeChatPhone === phone) {
            if (name && name !== 'Customer') {
              activeChatCustomerName = name;
              const headerTitle = document.getElementById('waHeaderTitle');
              if (headerTitle) headerTitle.textContent = name;
            }
            activeChatMessages.push(message);
            renderThreadMessages();
            // Auto mark read on gateway since admin is actively in this chat
            fetch(`${base}/api/chats/${phone}`).catch(() => {});
          }

          if (isOpen && !activeChatPhone) {
            fetchChatList();
          }
        } catch (err) {
          console.error('[PRIMETEK WA Widget] SSE parse error:', err);
        }
      });

      sseSource.onerror = () => {
        setTimeout(initSSE, 6000);
      };
    } catch (e) {}
  }

  function updateBadgeUI() {
    const badge = document.getElementById('waWidgetBadge');
    if (badge) {
      if (unreadTotal > 0) {
        badge.textContent = unreadTotal > 9 ? '9+' : unreadTotal;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Evaluate Access
  function syncAccess() {
    if (hasAdminPermission()) {
      mountAdminWidget();
    } else {
      unmountAdminWidget();
    }
  }

  // Hook into Auth Manager
  function init() {
    syncAccess();

    if (window.PrimetekAuth && typeof window.PrimetekAuth.onAuthStateChanged === 'function') {
      window.PrimetekAuth.onAuthStateChanged(() => {
        syncAccess();
      });
    }

    // Storage listener (if logged in from another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'primetek_current_user') {
        syncAccess();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
