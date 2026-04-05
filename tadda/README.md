# Tadda Portal - Phase 1 ✅ COMPLETE

Print-on-demand order management platform for Tadda.
**Delivered: April 2026**

**Live Portal:** https://taddaportal.web.app
**Marketing Site:** https://tadda-web.web.app

---

## What It Does

### For Customers
- **Sign up / Login** — Google Sign-In or Email/Password
- **Place orders** — structured form with 7 products, dynamic colour swatches, dynamic size tables (adult S/M/L/XL or kids age-based)
- **Upload design files** — PNG designs, mockups, neck labels, shipping labels (all upload in parallel)
- **Track order status** — real-time dashboard: Pending → Confirmed → In Production → Dispatched → Delivered
- **View order details** — click any order to see full breakdown + download uploaded files
- **Filter orders by status** — All / Pending / Confirmed / In Production / Dispatched / Delivered / Cancelled
- **Register as Brand Owner** — from inside the dashboard with pre-filled name & email
- **Delivery address capture** — shown when Tadda arranges shipping (address, city, PIN code)

### For Admin
- **All orders in one place** — every customer's orders in a single dashboard
- **Search** — by order ID, brand name, or email
- **Update order status** — Pending → Confirmed → In Production → Dispatched → Delivered / Cancelled
- **Admin notes** — internal notes per order for tracking
- **Customer list** — all registered users
- **Registration management** — brand owner leads with status tracking (New / Contacted / Converted / Rejected)
- **Email alerts** — automatic notification on every new order + new brand owner registration

### Marketing Website (Public)
- **Product catalogue** — 7 products with click-to-view photo modal (image, GSM, price, features, sizes)
- **Pricing table** — per product with full details
- **Brand owner registration** — public form with phone/email duplicate prevention
- **Contact form** — enquiries sent via Web3Forms
- **Responsive design** — mobile-friendly, sections for About, Why Us, How It Works, Products, Pricing, T&C

### Security & System
- **User isolation** — customers can only see their own orders (enforced at Firestore security rules level)
- **Duplicate prevention** — same phone or email cannot register as brand owner twice (`reg_index` collection)
- **Authenticated file uploads** — only logged-in users can upload to Firebase Storage
- **CORS configured** — secure cross-origin access for file downloads
- **Atomic writes** — registration + index entries saved in a single Firestore batch (all or nothing)

---

## Products Supported

| Product | GSM | Price | Sizes |
|---------|-----|-------|-------|
| T-Shirt Regular Fit | 180 | Rs 200/pc | S, M, L, XL |
| T-Shirt Oversized | 220 | Rs 260/pc | S, M, L, XL |
| T-Shirt Oversized Terry | 240 | Rs 280/pc | S, M, L, XL |
| Polo (Collar Tee) | 220 | Rs 300/pc | S, M, L, XL |
| Sweatshirt | 350 | Rs 480/pc | S, M, L, XL |
| Hoodie | 350 | Rs 505/pc | S, M, L, XL |
| Kids Regular Tee | 180 | Rs 145/pc | 5-6, 7-8, 9-10, 11-12, 13-14 Yrs |

Each product has its own set of available colours with visual swatches.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Authentication | Firebase Auth (Google + Email/Password) |
| Database | Cloud Firestore |
| File Storage | Firebase Storage |
| Hosting | Firebase Hosting (2 sites: taddaportal, tadda-web) |
| Email Notifications | Web3Forms (free, 250/month) |

---

## Project Structure

```
tadda/                          <- Order Portal
├── firebase.json               # Hosting config (site: taddaportal)
├── cors.json                   # Storage CORS config
├── CLAUDE.md                   # Full project context for AI
├── README.md                   # This file
└── public/
    ├── index.html              # Login page
    ├── order.html              # New order form
    ├── dashboard.html          # Customer dashboard
    ├── admin.html              # Admin dashboard
    ├── css/style.css           # Design system
    └── js/config.js            # Firebase config (not in git)

tadda-web/                      <- Marketing Website
├── firebase.json               # Hosting config (site: tadda-web)
└── public/
    ├── index.html              # Single-page marketing site
    ├── css/style.css           # Marketing styles
    ├── js/app.js               # Product viewer, registration, contact
    ├── js/config.js            # Firebase config (not in git)
    └── images/                 # Product photos (7 JPGs)
```

---

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `/orders/{orderId}` | All customer orders with full details, status, file URLs |
| `/users/{uid}` | Registered users (managed by Firebase Auth) |
| `/registrations/{autoId}` | Brand owner registration requests |
| `/reg_index/{checkId}` | Duplicate prevention index (phone/email keys) |

---

## Order Flow

```
Customer logs in
    → Places order (form + file uploads)
        → Order saved to Firestore (/orders)
        → Admin gets email notification (Web3Forms)
        → Customer sees success modal with order summary
    → Tracks order on dashboard
        → Filters by status
        → Clicks order to view full details + download files

Admin logs in
    → Views all orders in admin panel
    → Searches/filters orders
    → Updates status (Pending → Confirmed → Production → Dispatched → Delivered)
    → Adds admin notes
    → Manages brand owner registrations
```

---

## Registration Flow

```
New user (from marketing site or portal dashboard)
    → Fills registration form (name, phone, email, city, brand)
    → System checks reg_index for duplicate phone/email
        → If duplicate: shows error, blocks submission
        → If new: saves registration + index entries atomically
    → Admin gets email alert
    → Admin manages lead in Registrations tab (New → Contacted → Converted)

Returning user (already registered)
    → Dashboard sidebar shows "Brand Owner Registered" in green
    → Clicking shows info message instead of form
```

---

## Deploy

```bash
# Portal
cd tadda && firebase deploy --only hosting:taddaportal

# Marketing website
cd tadda-web && firebase deploy --only hosting:tadda-web
```

---

## Firebase Project

- **Project ID:** tadda-81f3e
- **Admin:** parashar.sachin@gmail.com
- **Hosting sites:** taddaportal, tadda-web
- **config.js** files contain API keys and are excluded from git

---

## Phase 2 — Planned

Full plan in `plan.md`. Key additions:

- **Role system** — Super Admin (platform control), Admin (business access, max 2), Customer
- **Service suspension** — 4-level escalation (warning → admin blocked → orders blocked → portal down)
- **Super admin panel** — manage admins, service level, password resets
- **Export to JSON** — admin backup download for all orders + registrations
- **Brand logo & product file upload** — user profile with one-time upload
- **Data policy page** — ownership, encryption, backup documentation

## Phase 3 — Planned

- **Razorpay payments** — 50% advance at order, balance before dispatch
- **Wallet system** — admin tops up customer wallet, 5% bonus on every top-up, wallet used at checkout
- **Invoice/credit note PDF** — auto-generated on order confirmation, downloadable
- **Product image management** — admin uploads/swaps multiple product images from admin panel, shown on marketing site (horizontal scroll viewer) + order form (product preview card)

## Phase 4 — Planned

- **Vendor/franchise portal** — vendor login, order assignment, production status updates
- **Digital marketing support** — customers opt in for social media management (Instagram, Facebook, ads) as a monthly subscription. Tadda handles content, posting, and ad management. Progress tracked in customer dashboard

---

## Related Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Full project context for AI assistance |
| `README.md` | This file — Phase 1 overview |
| `plan.md` | Phase 2 detailed build plan with tasks and estimates |
| `Tadda_Portal_Pitch.pdf` | Pitch deck — problem, solution, roadmap, pricing |
