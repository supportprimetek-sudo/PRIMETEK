/**
 * PRIMETEK Live WhatsApp Floating Widget & Admin Real-Time Inbox
 * Allows website visitors to chat on WhatsApp and Admins to read & reply in real-time
 * without opening WhatsApp Web!
 */
(function(window, document) {
  'use strict';

  // Config resolver
  function getGatewayBase() {
    if (window.PRIMETEK_WA_CONFIG && window.PRIMETEK_WA_CONFIG.ADMIN_DISPATCH_URL) {
      return window.PRIMETEK_WA_CONFIG.ADMIN_DISPATCH_URL.replace(/\/webhook\/primetek\/v1\/admin-message\/?$/, '');
    }
    return 'https://stake-beings-immediately-wishes.trycloudflare.com';
  }

  const PHONE_NUMBER = '917870819862';

  // State
  let isOpen = false;
  let currentTab = 'visitor'; // 'visitor' or 'admin'
  let activeChatPhone = null;
  let activeChatMessages = [];
  let chatList = [];
  let sseSource = null;
  let unreadTotal = 0;

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
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function isAdminLoggedIn() {
    if (window.PrimetekAuth && typeof window.PrimetekAuth.getCurrentUser === 'function') {
      const u = window.PrimetekAuth.getCurrentUser();
      return u && u.isAdmin;
    }
    return window.location.pathname.includes('admin');
  }

  // Create & Inject HTML
  function renderWidget() {
    if (document.getElementById('primetekWaWidget')) return;

    const wrap = document.createElement('div');
    wrap.id = 'primetekWaWidget';
    wrap.innerHTML = `
      <!-- Launcher Button -->
      <button class="wa-widget-launcher" id="waWidgetLauncher" aria-label="Open WhatsApp Chat">
        <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.05 2C6.508 2 2.02 6.487 2.02 12.03c0 1.994.579 3.85 1.579 5.412L2 22l4.671-1.567A9.965 9.965 0 0012.05 22c5.542 0 10.03-4.487 10.03-10.03C22.08 6.487 17.592 2 12.05 2zm0 18.11a8.06 8.06 0 01-4.377-1.28l-.314-.187-3.256 1.083 1.09-3.181-.204-.324a8.056 8.056 0 01-1.24-4.19c0-4.464 3.632-8.096 8.301-8.096 4.464 0 8.096 3.632 8.096 8.096 0 4.464-3.632 8.079-8.096 8.079z"/></svg>
        <span class="wa-widget-badge" id="waWidgetBadge">0</span>
      </button>

      <!-- Main Widget Box -->
      <div class="wa-widget-box" id="waWidgetBox">
        <!-- Header -->
        <div class="wa-box-header">
          <div class="wa-box-header-info">
            <div class="wa-avatar" id="waHeaderAvatar">P</div>
            <div class="wa-title-wrap">
              <div class="wa-header-title" id="waHeaderTitle">
                PRIMETEK Support
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#34D399"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <div class="wa-header-status" id="waHeaderStatus">Online &amp; Active</div>
            </div>
          </div>
          <div class="wa-header-actions">
            <button class="wa-btn-icon" id="waBtnBack" style="display:none;" title="Back to Inbox">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="wa-btn-icon" id="waBtnClose" title="Close">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- Mode Tabs -->
        <div class="wa-tabs-bar" id="waTabsBar">
          <button class="wa-tab-btn active" id="tabBtnVisitor">💬 Customer Chat</button>
          <button class="wa-tab-btn" id="tabBtnAdmin">🔐 Live Inbox <span id="adminTabBadge" style="display:none;background:#25D366;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;">0</span></button>
        </div>

        <!-- VISITOR MODE VIEW -->
        <div id="waVisitorView" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
          <div class="wa-chat-body" id="waVisitorChatBody">
            <div class="wa-msg wa-msg-inbound">
              Hello! 👋 Welcome to <b>PRIMETEK</b>. How can our engineering team assist you today?
              <div class="wa-msg-meta">Just now</div>
            </div>

            <div class="wa-quick-chips">
              <div class="wa-chip" data-text="Hi PRIMETEK, I am interested in Ready-Made Retail & Billing ERP software.">🛒 Ready-Made ERP &amp; Billing Software</div>
              <div class="wa-chip" data-text="Hi PRIMETEK, I want to develop a cross-platform Mobile App (Android/iOS).">📱 Custom Mobile App Development</div>
              <div class="wa-chip" data-text="Hi PRIMETEK, I need a high-performance business website for my brand.">🌐 Business Website Development</div>
              <div class="wa-chip" data-text="Hi PRIMETEK, I have a custom software engineering requirement.">🚀 Enterprise Software Consultation</div>
            </div>
          </div>

          <div class="wa-input-bar">
            <textarea class="wa-input-field" id="waVisitorInput" rows="1" placeholder="Type your message to our team..."></textarea>
            <button class="wa-btn-send" id="waVisitorSend" title="Send WhatsApp Message">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>

        <!-- ADMIN INBOX VIEW (Conversations List) -->
        <div id="waAdminInboxView" style="display:none;flex-direction:column;flex:1;overflow:hidden;">
          <div class="wa-admin-inbox-list" id="waAdminList">
            <div style="padding:24px;text-align:center;color:#9CA3AF;font-size:13px;">Loading WhatsApp conversations...</div>
          </div>
        </div>

        <!-- ADMIN ACTIVE CHAT THREAD (Live Reply View) -->
        <div id="waAdminChatThreadView" style="display:none;flex-direction:column;flex:1;overflow:hidden;">
          <div class="wa-chat-body" id="waAdminChatBody"></div>
          <div id="waAdminTypingBanner" style="display:none;padding:4px 12px;background:#E8F5E9;font-size:11.5px;color:#075E54;font-style:italic;">
            ⏳ Simulating human typing on WhatsApp (takes 5-6s)...
          </div>
          <div class="wa-input-bar">
            <textarea class="wa-input-field" id="waAdminReplyInput" rows="1" placeholder="Reply directly to customer on WhatsApp..."></textarea>
            <button class="wa-btn-send" id="waAdminReplySend" title="Send Reply">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(wrap);
    bindEvents();
    initSSE();

    // Default to admin view if on admin page or user is admin
    if (isAdminLoggedIn()) {
      switchTab('admin');
    }
  }

  // Bind Events
  function bindEvents() {
    const launcher = document.getElementById('waWidgetLauncher');
    const box = document.getElementById('waWidgetBox');
    const btnClose = document.getElementById('waBtnClose');
    const btnBack = document.getElementById('waBtnBack');
    const tabVisitor = document.getElementById('tabBtnVisitor');
    const tabAdmin = document.getElementById('tabBtnAdmin');
    const visitorInput = document.getElementById('waVisitorInput');
    const visitorSend = document.getElementById('waVisitorSend');
    const adminInput = document.getElementById('waAdminReplyInput');
    const adminSend = document.getElementById('waAdminReplySend');

    launcher.addEventListener('click', () => {
      isOpen = !isOpen;
      box.style.display = isOpen ? 'flex' : 'none';
      if (isOpen) {
        if (currentTab === 'admin') fetchChatList();
        // Clear launcher badge
        unreadTotal = 0;
        updateBadgeUI();
      }
    });

    btnClose.addEventListener('click', () => {
      isOpen = false;
      box.style.display = 'none';
    });

    btnBack.addEventListener('click', () => {
      activeChatPhone = null;
      document.getElementById('waAdminChatThreadView').style.display = 'none';
      document.getElementById('waAdminInboxView').style.display = 'flex';
      btnBack.style.display = 'none';
      document.getElementById('waHeaderTitle').textContent = 'WhatsApp Live Inbox';
      document.getElementById('waHeaderStatus').textContent = 'Connected (+91 78708 19862)';
      fetchChatList();
    });

    tabVisitor.addEventListener('click', () => switchTab('visitor'));
    tabAdmin.addEventListener('click', () => switchTab('admin'));

    // Visitor quick chips
    document.querySelectorAll('.wa-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-text');
        openWhatsAppDirect(text);
      });
    });

    // Visitor custom input send
    visitorSend.addEventListener('click', () => {
      const msg = visitorInput.value.trim();
      if (!msg) return;
      openWhatsAppDirect(msg);
      visitorInput.value = '';
    });

    visitorInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        visitorSend.click();
      }
    });

    // Admin reply send
    adminSend.addEventListener('click', sendAdminReply);
    adminInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAdminReply();
      }
    });
  }

  function switchTab(tab) {
    currentTab = tab;
    const tabVisitor = document.getElementById('tabBtnVisitor');
    const tabAdmin = document.getElementById('tabBtnAdmin');
    const viewVisitor = document.getElementById('waVisitorView');
    const viewInbox = document.getElementById('waAdminInboxView');
    const viewThread = document.getElementById('waAdminChatThreadView');
    const btnBack = document.getElementById('waBtnBack');

    tabVisitor.classList.toggle('active', tab === 'visitor');
    tabAdmin.classList.toggle('active', tab === 'admin');

    if (tab === 'visitor') {
      viewVisitor.style.display = 'flex';
      viewInbox.style.display = 'none';
      viewThread.style.display = 'none';
      btnBack.style.display = 'none';
      document.getElementById('waHeaderTitle').textContent = 'PRIMETEK Support';
      document.getElementById('waHeaderStatus').textContent = 'Online & Active';
    } else {
      viewVisitor.style.display = 'none';
      if (activeChatPhone) {
        viewInbox.style.display = 'none';
        viewThread.style.display = 'flex';
        btnBack.style.display = 'block';
      } else {
        viewInbox.style.display = 'flex';
        viewThread.style.display = 'none';
        btnBack.style.display = 'none';
        document.getElementById('waHeaderTitle').textContent = 'WhatsApp Live Inbox';
        document.getElementById('waHeaderStatus').textContent = 'Connected (+91 78708 19862)';
        fetchChatList();
      }
    }
  }

  function openWhatsAppDirect(text) {
    const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Fetch list of chats for Admin Inbox
  async function fetchChatList() {
    const listEl = document.getElementById('waAdminList');
    const base = getGatewayBase();

    try {
      const res = await fetch(`${base}/api/chats`);
      const data = await res.json();
      chatList = data.chats || [];

      if (!chatList.length) {
        listEl.innerHTML = `
          <div style="padding:32px 16px;text-align:center;color:#6B7280;font-size:13px;">
            <div style="font-size:32px;margin-bottom:8px;">📬</div>
            <b>No incoming WhatsApp messages yet.</b>
            <p style="font-size:12px;color:#9CA3AF;margin-top:4px;">When customers message +91 78708 19862, they will appear here in real time!</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = chatList.map(c => `
        <div class="wa-inbox-item ${activeChatPhone === c.phone ? 'active' : ''}" data-phone="${c.phone}">
          <div class="wa-inbox-avatar">${(c.name || c.phone)[0].toUpperCase()}</div>
          <div class="wa-inbox-details">
            <div class="wa-inbox-top">
              <span class="wa-inbox-name">${c.name || ('+' + c.phone)}</span>
              <span class="wa-inbox-time">${formatTime(c.lastTimestamp)}</span>
            </div>
            <div class="wa-inbox-bottom">
              <span class="wa-inbox-msg">${escapeHtml(c.lastMessage || '')}</span>
              ${c.unreadCount ? `<span class="wa-inbox-badge">${c.unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.wa-inbox-item').forEach(item => {
        item.addEventListener('click', () => {
          const phone = item.getAttribute('data-phone');
          openChatThread(phone);
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#EF4444;font-size:12.5px;">Gateway connection error. Ensure WhatsApp server is running.</div>`;
    }
  }

  // Open Chat Thread for a specific customer
  async function openChatThread(phone) {
    activeChatPhone = phone;
    const base = getGatewayBase();
    const btnBack = document.getElementById('waBtnBack');
    btnBack.style.display = 'block';

    document.getElementById('waAdminInboxView').style.display = 'none';
    document.getElementById('waAdminChatThreadView').style.display = 'flex';

    const chatBody = document.getElementById('waAdminChatBody');
    chatBody.innerHTML = `<div style="text-align:center;padding:20px;color:#8C8C8C;font-size:12px;">Loading chat history...</div>`;

    try {
      const res = await fetch(`${base}/api/chats/${phone}`);
      const data = await res.json();
      activeChatMessages = data.messages || [];

      document.getElementById('waHeaderTitle').textContent = data.name || ('+' + phone);
      document.getElementById('waHeaderStatus').textContent = `+${phone}`;

      renderThreadMessages();
    } catch (e) {
      chatBody.innerHTML = `<div style="color:#EF4444;text-align:center;padding:15px;font-size:12px;">Failed to load messages.</div>`;
    }
  }

  function renderThreadMessages() {
    const chatBody = document.getElementById('waAdminChatBody');
    if (!activeChatMessages.length) {
      chatBody.innerHTML = `<div style="text-align:center;padding:20px;color:#8C8C8C;font-size:12px;">No messages yet. Send a reply below.</div>`;
      return;
    }

    chatBody.innerHTML = activeChatMessages.map(m => `
      <div class="wa-msg ${m.fromMe ? 'wa-msg-outbound' : 'wa-msg-inbound'}">
        ${escapeHtml(m.text)}
        <div class="wa-msg-meta">
          ${formatTime(m.timestamp)}
          ${m.fromMe ? `<svg viewBox="0 0 16 15" width="14" height="14" fill="#34B7F1"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/></svg>` : ''}
        </div>
      </div>
    `).join('');

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

  // Real-Time Server-Sent Events (SSE) listener
  function initSSE() {
    const base = getGatewayBase();
    try {
      if (sseSource) sseSource.close();
      sseSource = new EventSource(`${base}/api/chats/stream`);

      sseSource.addEventListener('new_message', (e) => {
        try {
          const data = JSON.parse(e.data);
          const { phone, message } = data;

          // Sound alert on inbound messages
          if (!message.fromMe) {
            playNotificationSound();
            unreadTotal++;
            updateBadgeUI();
          }

          // If currently in active thread with this customer, append immediately
          if (activeChatPhone && activeChatPhone === phone) {
            activeChatMessages.push(message);
            renderThreadMessages();
          }

          // Refresh list if open
          if (isOpen && currentTab === 'admin' && !activeChatPhone) {
            fetchChatList();
          }
        } catch (err) {
          console.error('[PRIMETEK WA Widget] SSE parse error:', err);
        }
      });

      sseSource.onerror = () => {
        // Retry connection automatically
        setTimeout(initSSE, 5000);
      };
    } catch (e) {
      console.warn('[PRIMETEK WA Widget] SSE not supported or offline:', e);
    }
  }

  function updateBadgeUI() {
    const badge = document.getElementById('waWidgetBadge');
    const tabBadge = document.getElementById('adminTabBadge');

    if (badge) {
      if (unreadTotal > 0) {
        badge.textContent = unreadTotal > 9 ? '9+' : unreadTotal;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (tabBadge) {
      if (unreadTotal > 0) {
        tabBadge.textContent = unreadTotal;
        tabBadge.style.display = 'inline-block';
      } else {
        tabBadge.style.display = 'none';
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

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderWidget);
  } else {
    renderWidget();
  }

})(window, document);
