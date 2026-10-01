/**
 * PRIMETEK — Firebase & Database Configuration
 * Handles Firebase Auth & Firestore for Admin and Storefront.
 * Includes automatic local demo fallback so the site works immediately.
 */

// Replace the placeholder values below with your Firebase Project Configuration from Firebase Console:
// (Project Settings > General > Your Apps > Web App SDK config)
const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "primetek-online.firebaseapp.com",
  projectId: "primetek-online",
  storageBucket: "primetek-online.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Admin email configured for full dashboard access
const ADMIN_EMAIL = "support.primetek@gmail.com";

// Check if Firebase keys are still placeholders
const isFirebaseConfigured = FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY" && !!FIREBASE_CONFIG.apiKey;

let auth = null;
let db = null;
let googleProvider = null;

if (typeof firebase !== 'undefined') {
  try {
    if (isFirebaseConfigured) {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      auth = firebase.auth();
      db = firebase.firestore();
      googleProvider = new firebase.auth.GoogleAuthProvider();
      console.log("PRIMETEK: Connected to Firebase Firestore & Auth.");
    } else {
      console.warn("PRIMETEK: Firebase keys not set yet. Running in resilient Local Demo mode.");
    }
  } catch (err) {
    console.error("Firebase init error:", err);
  }
}

// ----------------------------------------------------
// LOCAL STORAGE KEYS & DEFAULT SEED PRODUCTS
// ----------------------------------------------------
const LOCAL_USER_KEY = 'primetek_current_user';
const LOCAL_PRODUCTS_KEY = 'primetek_products_db';
const LOCAL_ORDERS_KEY = 'primetek_orders_db';

const DEFAULT_PRODUCTS = [
  {
    id: "site-starter",
    name: "Business Website — Starter",
    category: "WEBSITE",
    price: 9999,
    regularPrice: 14999,
    description: "A 5-page responsive website for a local business — home, about, services, gallery, contact form.",
    features: ["5 pages included", "Mobile-ready & fast", "1 week delivery", "Free domain setup"],
    deliverables: "Complete website source code, deployment on Cloudflare/Vercel, 1 month support.",
    techStack: ["HTML5", "CSS3", "JavaScript"],
    image: "thumb-site-starter.jpg",
    demoUrl: "",
    downloadUrl: "",
    status: "active",
    createdAt: Date.now() - 1000000
  },
  {
    id: "site-ecom",
    name: "E-Commerce Storefront",
    category: "WEBSITE",
    price: 24999,
    regularPrice: 34999,
    description: "Ready-to-launch online store with product catalog, cart and checkout — just add your products.",
    features: ["Unlimited products", "Payment gateway ready (Razorpay/UPI)", "Cart & Order management", "2 week delivery"],
    deliverables: "Full frontend & backend code, payment setup guide, admin product manager.",
    techStack: ["JavaScript", "Cloudflare", "Tailwind"],
    image: "thumb-site-ecom.jpg",
    demoUrl: "",
    downloadUrl: "",
    status: "active",
    createdAt: Date.now() - 900000
  },
  {
    id: "site-restaurant",
    name: "Restaurant Ordering Site",
    category: "WEBSITE",
    price: 18999,
    regularPrice: 26999,
    description: "Menu display, online ordering and table booking — built for cafes, restaurants and cloud kitchens.",
    features: ["Online ordering with WhatsApp", "Interactive digital menu", "Table reservation module", "10 day delivery"],
    deliverables: "Restaurant web application code, menu configuration guide, WhatsApp integration.",
    techStack: ["HTML5", "CSS3", "JS", "WhatsApp API"],
    image: "thumb-site-restaurant.jpg",
    demoUrl: "",
    downloadUrl: "",
    status: "active",
    createdAt: Date.now() - 800000
  },
  {
    id: "site-portfolio",
    name: "Portfolio / Personal Site",
    category: "WEBSITE",
    price: 4999,
    regularPrice: 7999,
    description: "A clean one-page portfolio for freelancers, consultants and creators — resume, work samples, contact.",
    features: ["1 page sleek design", "Ultra-fast load time", "SEO optimized", "3 day delivery"],
    deliverables: "Lightweight single-page code, custom domain configuration.",
    techStack: ["HTML5", "Modern CSS"],
    image: "thumb-site-portfolio.jpg",
    demoUrl: "",
    downloadUrl: "",
    status: "active",
    createdAt: Date.now() - 700000
  },
  {
    id: "app-fieldservice",
    name: "Field Service App",
    category: "APP",
    price: 34999,
    regularPrice: 49999,
    description: "Ready-built Android/iOS app for scheduling, job tracking and invoicing — rebrand it as your own.",
    features: ["Android + iOS builds", "Job status tracking & GPS", "Invoicing & receipt PDF", "Store submission included"],
    deliverables: "Flutter / React Native source code, backend API scripts, store publishing assistance.",
    techStack: ["Flutter", "Dart", "Firebase", "Node.js"],
    image: "thumb-app-fieldservice.jpg",
    demoUrl: "",
    downloadUrl: "",
    status: "active",
    createdAt: Date.now() - 600000
  },
  {
    id: "app-booking",
    name: "Booking & Appointments App",
    category: "APP",
    price: 29999,
    regularPrice: 39999,
    description: "Let customers book slots, get reminders and pay in-app — ideal for salons, clinics and studios.",
    features: ["Slot calendar & booking", "Automated SMS/WhatsApp reminders", "Staff calendar sync", "Android + iOS"],
    deliverables: "Cross-platform mobile app source code, admin web panel, push notifications setup.",
    techStack: ["Flutter", "REST API", "PostgreSQL"],
    image: "thumb-app-booking.jpg",
    demoUrl: "",
    downloadUrl: "",
    status: "active",
    createdAt: Date.now() - 500000
  },
  {
    id: "software-erp-lite",
    name: "Retail & Inventory ERP Software",
    category: "SOFTWARE",
    price: 21999,
    regularPrice: 32000,
    description: "Ready-made Desktop & Web ERP for stock tracking, barcode billing, GST invoices, and vendor purchases.",
    features: ["Barcode scanning & thermal print", "GST compliant billing", "Low stock alerts", "Offline + Cloud backup"],
    deliverables: "Full ERP package, source code, database installer script, lifetime offline license.",
    techStack: ["Electron", "Vue.js", "SQLite / MySQL"],
    image: "work-retail-storefront.jpg",
    demoUrl: "https://primetek.online/products.html",
    downloadUrl: "",
    status: "active",
    createdAt: Date.now() - 400000
  }
];

// Helper to seed initial products if storage is empty
function getLocalProducts() {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_PRODUCTS;
  }
}

// ----------------------------------------------------
// PRIMETEK AUTH MANAGER
// ----------------------------------------------------
window.PrimetekAuth = {
  adminEmail: ADMIN_EMAIL,

  isAdminUser(user) {
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    return email === ADMIN_EMAIL.toLowerCase().trim() || user.isAdmin === true;
  },

  getCurrentUser() {
    if (auth && auth.currentUser) {
      const u = auth.currentUser;
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || u.email.split('@')[0],
        photoURL: u.photoURL || null,
        isAdmin: window.PrimetekAuth.isAdminUser(u)
      };
    }
    try {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  onAuthStateChanged(callback) {
    if (auth) {
      auth.onAuthStateChanged(user => {
        if (user) {
          const profile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL,
            isAdmin: window.PrimetekAuth.isAdminUser(user)
          };
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
          callback(profile);
        } else {
          localStorage.removeItem(LOCAL_USER_KEY);
          callback(null);
        }
      });
    } else {
      // Local demo mode
      const user = this.getCurrentUser();
      callback(user);
    }
  },

  async login(email, password) {
    email = email.trim();
    if (auth) {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      return {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || email.split('@')[0],
        isAdmin: window.PrimetekAuth.isAdminUser(cred.user)
      };
    } else {
      // Resilient local mock authentication
      const isAdm = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const mockUser = {
        uid: 'local_' + Math.random().toString(36).substring(2, 9),
        email: email,
        displayName: email.split('@')[0],
        isAdmin: isAdm
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      return mockUser;
    }
  },

  async signup(name, email, password) {
    email = email.trim();
    if (auth) {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (name) {
        await cred.user.updateProfile({ displayName: name });
      }
      return {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: name || email.split('@')[0],
        isAdmin: window.PrimetekAuth.isAdminUser(cred.user)
      };
    } else {
      const isAdm = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const mockUser = {
        uid: 'local_' + Math.random().toString(36).substring(2, 9),
        email: email,
        displayName: name || email.split('@')[0],
        isAdmin: isAdm
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      return mockUser;
    }
  },

  async loginWithGoogle() {
    if (auth && googleProvider) {
      const res = await auth.signInWithPopup(googleProvider);
      return {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || res.user.email.split('@')[0],
        photoURL: res.user.photoURL,
        isAdmin: window.PrimetekAuth.isAdminUser(res.user)
      };
    } else {
      // Prompt email in local mock if Google auth isn't wired yet
      const email = prompt("Enter email for Google sign in mock (e.g. support.primetek@gmail.com):", ADMIN_EMAIL);
      if (!email) throw new Error("Google sign-in cancelled");
      return this.login(email, "mockpass");
    }
  },

  async logout() {
    if (auth) {
      await auth.signOut();
    }
    localStorage.removeItem(LOCAL_USER_KEY);
  },

  async resetPassword(email) {
    if (auth) {
      await auth.sendPasswordResetEmail(email.trim());
      return true;
    } else {
      alert("Password reset email sent to " + email + " (mock mode)");
      return true;
    }
  }
};

// ----------------------------------------------------
// PRIMETEK DATABASE & STOREFRONT PRODUCTS API
// ----------------------------------------------------
window.PrimetekDB = {
  async getProducts() {
    if (db) {
      try {
        const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
        if (!snap.empty) {
          const items = [];
          snap.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });
          return items;
        }
      } catch (err) {
        console.warn("Could not fetch from Firestore, falling back to local products:", err);
      }
    }
    return getLocalProducts();
  },

  async addProduct(product) {
    const data = {
      ...product,
      price: parseFloat(product.price) || 0,
      regularPrice: parseFloat(product.regularPrice) || 0,
      status: product.status || 'active',
      createdAt: Date.now()
    };

    if (db) {
      try {
        const ref = await db.collection('products').add(data);
        return { id: ref.id, ...data };
      } catch (err) {
        console.warn("Firestore save failed, saving locally:", err);
      }
    }

    // Local fallback
    const items = getLocalProducts();
    const newId = 'prod_' + Date.now().toString(36);
    const newProduct = { id: newId, ...data };
    items.unshift(newProduct);
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(items));
    return newProduct;
  },

  async updateProduct(id, updates) {
    const data = {
      ...updates,
      price: parseFloat(updates.price) || 0,
      regularPrice: parseFloat(updates.regularPrice) || 0,
      updatedAt: Date.now()
    };

    if (db) {
      try {
        await db.collection('products').doc(id).set(data, { merge: true });
        return { id, ...data };
      } catch (err) {
        console.warn("Firestore update failed, updating locally:", err);
      }
    }

    const items = getLocalProducts();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data };
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(items));
      return items[idx];
    }
    return null;
  },

  async deleteProduct(id) {
    if (db) {
      try {
        await db.collection('products').doc(id).delete();
      } catch (err) {
        console.warn("Firestore delete failed:", err);
      }
    }
    const items = getLocalProducts().filter(i => i.id !== id);
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(items));
    return true;
  },

  async recordOrder(order) {
    const data = {
      ...order,
      createdAt: Date.now(),
      status: 'pending'
    };

    if (db) {
      try {
        const ref = await db.collection('orders').add(data);
        return { id: ref.id, ...data };
      } catch (e) {
        console.warn("Firestore order record failed:", e);
      }
    }

    try {
      const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
      const orders = raw ? JSON.parse(raw) : [];
      const newOrder = { id: 'ord_' + Date.now().toString(36), ...data };
      orders.unshift(newOrder);
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
      return newOrder;
    } catch (e) {
      return data;
    }
  },

  async getOrders() {
    if (db) {
      try {
        const snap = await db.collection('orders').orderBy('createdAt', 'desc').get();
        if (!snap.empty) {
          const list = [];
          snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          return list;
        }
      } catch (e) {
        console.warn("Could not fetch orders from Firestore:", e);
      }
    }
    try {
      const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
};
