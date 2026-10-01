# PRIMETEK — Storefront & Admin Panel Documentation

## 🚀 Overview
A dedicated **Admin Panel**, **Customer Auth**, and **Dynamic Storefront** system has been built for the PRIMETEK website to easily sell and manage ready-made software, websites, and mobile apps.

---

## 🔐 1. Admin & User Authentication

### Administrator Access:
* **Admin Email:** `support.primetek@gmail.com`
* **Admin Dashboard URL:** `admin.html`
* **Login URL:** `login.html`

When you sign in using `support.primetek@gmail.com` (via Email or Google Sign-In), you automatically unlock the **Admin Dashboard** and an **Admin** badge appears in your header on all pages.

### Customer / Buyer Accounts:
* Customers can sign up and log in via `login.html`.
* Once logged in, customers can access **`account.html`** to see their purchased software, active orders, and digital download links.

---

## 🛠️ 2. Admin Dashboard Features (`admin.html`)

1. **Add Ready-made Software / Apps:**
   * Click **"Add Ready-made Software"** in the top right.
   * Enter details:
     * **Title:** e.g., *Full-Stack Inventory & Billing ERP*
     * **Category:** *Ready-made Software*, *Website Template*, *Mobile App (Android/iOS)*, or *SaaS Starter*
     * **Price & Regular Price:** (Shows discount on storefront)
     * **Description & Highlights:** Key features (GST billing, barcode, multi-user, etc.)
     * **Deliverables Included:** Source code, setup guide, warranty, database scripts
     * **Tech Stack:** React, Flutter, Node.js, Electron, MySQL, etc.
     * **Thumbnail Image:** Filename or URL
     * **Live Demo URL:** Interactive link where customers can test the software
     * **Download / Delivery Link:** Package link for buyers
     * **Status:** Toggle between *Active (Live)* and *Draft (Hidden)*
2. **Storefront Management Table:**
   * Search and filter software by category.
   * **Edit:** 1-click update of price, description, images, or features.
   * **Status Toggle:** Instantly publish or unpublish products from your shop.
   * **Delete:** Remove products with confirmation.
3. **Customer Orders & Inquiries:**
   * View purchase requests submitted via `checkout.html`.
   * Displays buyer name, email, phone, items ordered, and order total.
4. **Google Sheets Export:**
   * Click **"Export CSV (Google Sheet)"** to download the entire catalog in a format that opens directly in Google Sheets / Excel.

---

## 🛒 3. Dynamic Storefront (`products.html`)

* **Category Filter Pills:** Customers can filter by *All Products*, *Ready-made Software / ERP*, *Websites*, and *Mobile Apps*.
* **Live Demo Button:** If a demo link is provided in the admin panel, a "Live Demo ↗" button appears directly on the product card.
* **Seamless Cart Integration:** Clicking "Add to cart" adds the item directly to `PrimetekCart` and updates the floating badge.

---

## ⚙️ 4. Firebase Setup (To connect live Cloud Database)

The system works right away in **Local Mode** for instant testing. When you're ready to connect to your live Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create or open your project.
2. In **Authentication**, enable **Email/Password** and **Google Sign-In**.
3. In **Firestore Database**, click **Create Database** (Start in production or test mode).
4. Go to **Project Settings > General > Your Apps > Web App**, and copy your `firebaseConfig` object.
5. Open `firebase-config.js` and replace the placeholder values in `FIREBASE_CONFIG`:
```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "primetek-online.firebaseapp.com",
  projectId: "primetek-online",
  storageBucket: "primetek-online.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```
Everything else connects automatically!
