# Tadda Portal — Project Context

## Overview
Tadda is a **print-on-demand and bulk clothing order management portal**.
Customers place orders; admin (Sachin) reviews, manages, and fulfills them through vendors.

There are **two web properties** for Tadda:
| Property | URL | Directory | Purpose |
|----------|-----|-----------|---------|
| Portal | https://taddaportal.web.app | `tadda/` | Order management app (login required) |
| Marketing Website | https://tadda-web.web.app | `tadda-web/` | Public-facing brand/product website |

- **Firebase Project:** `tadda-81f3e`
- **Admin email:** `parashar.sachin@gmail.com`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TADDA ECOSYSTEM                          │
├──────────────────────────┬──────────────────────────────────────┤
│   tadda-web (public)     │   taddaportal (authenticated)        │
│   tadda-web.web.app      │   taddaportal.web.app                │
│                          │                                       │
│  ┌─────────────────┐     │  ┌──────────┐  ┌──────────────────┐  │
│  │   index.html    │     │  │index.html│  │   order.html     │  │
│  │  Marketing site │     │  │  Login   │  │  New Order Form  │  │
│  │  - Hero         │     │  └────┬─────┘  └───────┬──────────┘  │
│  │  - Products     │     │       │                 │             │
│  │  - Pricing      │     │  ┌────▼─────┐  ┌───────▼──────────┐  │
│  │  - Contact      │     │  │dashboard │  │   admin.html     │  │
│  │  - Reg Modal    │     │  │  .html   │  │  Admin Panel     │  │
│  └─────────────────┘     │  │ Customer │  │  - All orders    │  │
│                          │  │ View     │  │  - Status mgmt   │  │
│                          │  └──────────┘  │  - Registrations │  │
│                          │                └──────────────────┘  │
├──────────────────────────┴──────────────────────────────────────┤
│                    Firebase Backend                              │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐   │
│  │  Firestore   │  │    Storage    │  │   Authentication   │   │
│  │  /orders     │  │  orders/{id}/ │  │  Google Sign-In    │   │
│  │  /users      │  │  design files │  │  Email/Password    │   │
│  │  /registr..  │  │  mockups etc  │  └────────────────────┘   │
│  └──────────────┘  └───────────────┘                           │
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │  Web3Forms (email notifications, no backend) │               │
│  │  — new order alert to admin                  │               │
│  │  — brand owner registration alert            │               │
│  └──────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (no framework)
- **Auth:** Firebase Authentication (Google Sign-In + Email/Password)
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage (design files, mockups, labels)
- **Hosting:** Firebase Hosting (two sites: `taddaportal`, `tadda-web`)
- **Email:** Web3Forms (free, 250 emails/month) — no backend required

---

## Deploy Commands
```bash
# Portal
cd "C:\Users\Richa\OneDrive\Apps\create-your-qr\tadda"
firebase deploy --only hosting:taddaportal

# Marketing website
cd "C:\Users\Richa\OneDrive\Apps\create-your-qr\tadda-web"
firebase deploy --only hosting:tadda-web
```

---

## Project Structure

```
tadda/                             ← Order portal
├── firebase.json                  # Hosting: site = taddaportal
├── .firebaserc                    # project = tadda-81f3e
├── cors.json                      # Storage CORS (applied once via gsutil)
├── CLAUDE.md                      # This file
└── public/
    ├── index.html                 # Login (Google + Email/Password)
    ├── order.html                 # New order form
    ├── dashboard.html             # Customer dashboard
    ├── admin.html                 # Admin dashboard
    ├── css/style.css              # Full design system (shared across portal)
    └── js/
        └── config.js             # Firebase config + WEB3FORMS_KEY (NOT in git)

tadda-web/                         ← Marketing website
├── firebase.json                  # Hosting: site = tadda-web
├── .firebaserc                    # project = tadda-81f3e
└── public/
    ├── index.html                 # Full marketing single-page site
    ├── css/style.css              # Marketing site styles
    ├── js/
    │   ├── app.js                 # Product viewer, registration form, contact form
    │   └── config.js             # Firebase config + WEB3FORMS_KEY (NOT in git)
    └── images/                    # Product photos (extracted from PDF catalogue)
        ├── regular-tee-photo.jpg
        ├── oversized-220-photo.jpg
        ├── oversized-240-photo.jpg
        ├── polo-photo.jpg
        ├── sweatshirt-photo.jpg
        ├── hoodie-photo.jpg
        └── kids-tee-photo.jpg
```

---

## Portal Pages

### index.html — Login
- Google Sign-In + Email/Password login
- Redirects to `/dashboard.html` on login
- Admin (`parashar.sachin@gmail.com`) navigates to `/admin.html` manually

### order.html — New Order Form
Sections:
1. **Customer Details** — name, brand, email, phone (auto-filled from auth)
2. **Product Selection**
   - 7 products in dropdown (see Product Data below)
   - Dynamic colour swatches rendered per product
   - Dynamic size table (adult S/M/L/XL or kids age sizes) rendered per product
   - Auto total qty + estimated dispatch ETA
3. **Design & Artwork** — design PNG (required), mockup (optional), placement (required), design size (optional)
4. **Neck Label** — yes/no toggle + upload
5. **Shipping**
   - Self-managed: customer arranges courier
   - Tadda arranges: shows delivery address fields (address, city, PIN) + shipping label upload
6. **Additional Notes** — free text

On submit:
- Validates colour selected + at least one size qty > 0
- Uploads files to Firebase Storage: `orders/{orderId}/{timestamp}_{filename}`
- Saves order doc to Firestore `/orders/{orderId}`
- Sends admin email via Web3Forms (non-blocking)
- Shows success modal with order summary (ID, brand, product+colour, qty, ETA)

### dashboard.html — Customer Dashboard
- Shows only logged-in user's orders (`where userId == uid, orderBy createdAt DESC`)
- Stats: Total, Pending, In Production, Delivered
- Filter by status
- Click order row → modal with full order details + file download links
- Requires Firestore composite index: `userId ASC + createdAt DESC`
- **Become a Brand Owner** — sidebar link that opens registration modal
  - Pre-fills name + email from logged-in user
  - Checks `reg_index` on login — if already registered, sidebar shows "Brand Owner Registered ✓" in green
  - Clicking when already registered shows info message instead of opening form
  - Saves to `/registrations` with `registeredFrom: 'portal'` + writes `reg_index` entries atomically
  - Duplicate phone/email blocked with clear error message

### admin.html — Admin Dashboard
- Restricted to `parashar.sachin@gmail.com` only — others redirected to dashboard
- **Orders tab:** all orders, filter by status, search by ID/brand/email
  - Click order → modal: full details + Update Status + Admin Notes
  - Order statuses: `pending → confirmed → production → dispatched → delivered → cancelled`
- **Customers tab:** lists all registered users
- **Registrations tab:** brand owner registration requests
  - Stats: Total, New, Contacted, Converted
  - Click row → modal: full reg details + update status (new/contacted/converted/rejected) + admin notes

---

## Product Data (order.html)

```js
const PRODUCT_DATA = {
    regular_180:     { colors: ['Sea Green','Maroon','Navy Blue','Black','White'],
                       sizes: ['S','M','L','XL'],
                       dots:  ['#4CAF50','#8B0000','#1a237e','#1a1a1a','#f5f5f5'] },
    oversized_220:   { colors: ['Beige','White','Avocado Green','Brown','Black'],
                       sizes: ['S','M','L','XL'],
                       dots:  ['#f5e6c8','#f5f5f5','#4a6741','#6B4226','#1a1a1a'] },
    oversized_240:   { colors: ['Black','Smokey Grey','Beige','White'],
                       sizes: ['S','M','L','XL'],
                       dots:  ['#1a1a1a','#6b7280','#f5e6c8','#f5f5f5'] },
    polo_220:        { colors: ['Black','White'],
                       sizes: ['S','M','L','XL'],
                       dots:  ['#1a1a1a','#f5f5f5'] },
    sweatshirt_350:  { colors: ['Black','Navy Blue','Off-White','Maroon','Lavender'],
                       sizes: ['S','M','L','XL'],
                       dots:  ['#1a1a1a','#1a237e','#f5f0e8','#8B0000','#c4b5e0'] },
    hoodie_350:      { colors: ['Black','Coffee Brown','Off-White','Olive Green','Beige'],
                       sizes: ['S','M','L','XL'],
                       dots:  ['#1a1a1a','#4a3728','#f5f0e8','#4a6741','#f5e6c8'] },
    kids_regular_180:{ colors: ['Black','Orange','White','Sea Green','Baby Pink'],
                       sizes: ['5-6 Yrs','7-8 Yrs','9-10 Yrs','11-12 Yrs','13-14 Yrs'],
                       dots:  ['#1a1a1a','#f97316','#f5f5f5','#4CAF50','#ec4899'] },
};
```

Product dropdown values → display names:
| Value | Display |
|-------|---------|
| `regular_180` | T-Shirt Regular Fit — 180 GSM — ₹200/pc |
| `oversized_220` | T-Shirt Oversized — 220 GSM — ₹260/pc |
| `oversized_240` | T-Shirt Oversized Terry — 240 GSM — ₹280/pc |
| `polo_220` | Polo (Collar Tee) — 220 GSM — ₹300/pc |
| `sweatshirt_350` | Sweatshirt — 350 GSM — ₹480/pc |
| `hoodie_350` | Hoodie — 350 GSM — ₹505/pc |
| `kids_regular_180` | Kids Regular Tee — 180 GSM — ₹145/pc |

---

## Firestore Structure

### `/orders/{orderId}`
| Field | Type | Notes |
|-------|------|-------|
| orderId | string | `TAD-YYYY-MMDD-XXXXX` |
| userId | string | Firebase Auth UID |
| userEmail | string | |
| custName | string | |
| brandName | string | |
| custPhone | string | |
| product | string | One of the 7 product keys above |
| colour | string | e.g. "Black" |
| sizes | map | `{S: 10, M: 20, ...}` or kids age keys |
| totalQty | number | |
| designUrl | string | Storage URL |
| mockupUrl | string | Storage URL (optional) |
| placementDetails | string | Required |
| designSize | string | Optional |
| neckLabel | string | `yes` / `no` |
| neckLabelUrl | string | Storage URL (optional) |
| shipping | string | `self` / `arrange` |
| deliveryAddress | string | Full address (only when shipping=arrange) |
| deliveryCity | string | (only when shipping=arrange) |
| deliveryPin | string | 6-digit PIN (only when shipping=arrange) |
| shippingLabelUrl | string | Storage URL (optional) |
| notes | string | Optional |
| status | string | `pending/confirmed/production/dispatched/delivered/cancelled` |
| dispatchEta | string | `24–72 hours` (<50 qty) or `48–120 hours` (50+) |
| adminNotes | string | Set by admin |
| createdAt | timestamp | Server timestamp |
| updatedAt | timestamp | Set when admin updates |

### `/registrations/{autoId}`
| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| phone | string | WhatsApp number |
| email | string | Optional |
| city | string | |
| brand | string | Brand name (optional) |
| source | string | How they heard about Tadda |
| message | string | Optional message |
| status | string | `new / contacted / converted / rejected` |
| adminNotes | string | Set by admin |
| registeredFrom | string | `portal` (from dashboard) or absent (from marketing site) |
| userId | string | Firebase Auth UID (only when registeredFrom = portal) |
| createdAt | timestamp | |

### `/reg_index/{checkId}`
Duplicate prevention index — publicly readable/writable, stores no PII.
| Document ID format | Value |
|-------------------|-------|
| `phone_<digits>` | `{ type: 'phone', regId: '...' }` |
| `email_<normalized>` | `{ type: 'email', regId: '...' }` |

- Phone key: `'phone_' + phone.replace(/\D/g, '')`
- Email key: `'email_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_')`
- Written atomically with the registration doc via `db.batch()`
- Checked before saving any new registration (marketing site + portal dashboard)

### `/users/{uid}`
- Managed by Firebase Auth — used for customer list in admin

---

## Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        request.auth.token.email == 'parashar.sachin@gmail.com'
      );
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && request.auth.token.email == 'parashar.sachin@gmail.com';
    }
    match /registrations/{regId} {
      allow create: if true;  // public form submissions
      allow read, write: if request.auth != null && request.auth.token.email == 'parashar.sachin@gmail.com';
    }
    match /reg_index/{checkId} {
      allow read, write: if true;  // duplicate check index — no PII stored
    }
  }
}
```

## Firebase Storage Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Storage CORS
Applied via gsutil (one-time setup):
```bash
gsutil cors set cors.json gs://tadda-81f3e.firebasestorage.app
```
`cors.json` allows origins: `https://taddaportal.web.app` and `http://localhost:5000`

---

## Firestore Indexes Required
- **Orders dashboard:** `userId ASC + createdAt DESC` (composite index — click link in console error to auto-create)

---

## config.js (NOT in git — gitignored in both apps)
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "tadda-81f3e.firebaseapp.com",
  projectId: "tadda-81f3e",
  storageBucket: "tadda-81f3e.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
firebase.initializeApp(firebaseConfig);
window.ADMIN_EMAIL = 'parashar.sachin@gmail.com';
window.WEB3FORMS_KEY = '1c16ff01-bc48-4d2a-8671-23bf96569cf2';
```

---

## Email Notifications (Web3Forms)
- **New order** → admin email with full order details + admin panel link
- **New brand owner registration** → admin email with registrant details
- Free tier: 250 emails/month
- Key: `window.WEB3FORMS_KEY` in `config.js`

---

## Marketing Website (tadda-web)

### Branding
- **Logo:** actual Tadda logo at `images/tadda-logo.png` (replaces SVG placeholder)
- **Nav brand text:** full black (#1a1a1a) to match logo

### Sections (index.html — single page)
1. **Nav** — logo (full black), links, mobile hamburger
2. **Hero** — tagline + two-path CTA:
   - "As a Customer" → links to taddaportal.web.app/order.html
   - "As a Brand Owner" → opens registration modal
3. **About** — what Tadda does
4. **Why Us** — key differentiators
5. **How It Works** — step-by-step process
6. **Products** — 7 product tiles (click to open image viewer modal)
7. **Pricing** — price table per product
8. **Add-ons** — neck labels, shipping, etc.
9. **Support / T&C** — terms and conditions
10. **Contact** — contact form via Web3Forms
11. **Footer**

### Product Viewer Modal
- `openProduct(idx)` opens overlay with product image + details
- `renderProductViewer()` renders name, GSM, price, features, sizes, image
- Keyboard nav: ArrowLeft/ArrowRight/Escape
- Products array in `app.js` matches the 7 products in portal

### Brand Owner Registration Modal
- Collects: name, WhatsApp, email, city, brand name, source, message
- Saves to Firestore `/registrations`
- Sends admin email via Web3Forms
- Shows success state on form after submit

### Contact Form
- Via Web3Forms (no backend)
- Fields: name, phone, email, message

---

## Phase Status

### Phase 1 — COMPLETE ✅
- [x] Login (Google + Email/Password)
- [x] Dynamic order form (7 products, colour swatches, dynamic size tables)
- [x] File uploads to Firebase Storage (parallel — all files uploaded simultaneously)
- [x] Delivery address fields (shown when Tadda arranges shipping)
- [x] Customer dashboard (own orders, status filter, order details modal)
- [x] "Become a Brand Owner" in customer dashboard (with pre-fill + duplicate check + already-registered state)
- [x] Admin dashboard (all orders, status management, admin notes)
- [x] Registrations tab in admin (brand owner leads management)
- [x] Duplicate registration prevention via `reg_index` collection (phone + email)
- [x] Firestore security rules (orders user-scoped, reg_index public, registrations admin-only read)
- [x] Firebase Storage + CORS
- [x] Admin email notifications on new order + new registration
- [x] Marketing website (tadda-web) with product viewer + registration modal + duplicate check

### Phase 2 — Planned (see `plan.md` for full details)

**Role System:**
- Super Admin (`parashar.sachin@gmail.com`) — platform control, manage admins, service level. No access to business data
- Admin (Tadda official email + 1 more, max 2) — full business access: orders, registrations, customers
- Customer — own orders only

**Service Suspension (4 levels):**
- Level 0: Active (all works)
- Level 1: Warning (new orders hidden from admin, notifications blocked, customers unaffected)
- Level 2: Restricted (admin dashboard blocked entirely)
- Level 3: Limited (order form disabled)
- Level 4: Suspended (entire portal down)

**Features:**
- Super admin panel (`superadmin.html`) — service level control, admin management, password reset
- Admin role check from `/admins/{email}` collection (replaces hardcoded email)
- Export to JSON — admin can download all orders + registrations as backup
- Brand logo & product file upload — user profile with one-time upload, auto-attached to orders
- Data policy page (`policy.html`) — ownership, encryption, backup, deletion policies
- Notification updates — send to all admin emails, blocked at Level 1+

**Estimated effort:** ~4.25 hours (see `plan.md` for step-by-step breakdown)

### Phase 3 — Planned (Payments, Wallet & Product Images)
- Razorpay advance payment (50% at order, balance before dispatch)
- Wallet system — admin tops up customer wallet, 5% bonus on every top-up
- Wallet used at checkout (partial or full, alongside Razorpay)
- Firestore: `/wallets/{uid}` for balance, `/wallet_transactions/{autoId}` for history
- Invoice PDF auto-generation on order confirmation (jsPDF)
- Credit note PDF for cancellations/returns
- Product image management — admin uploads multiple images per product from admin panel
- Images stored in Firestore `/products/{productKey}` + Firebase Storage `products/{key}/`
- Marketing site product viewer: horizontal scroll with dot indicators
- Order form: product preview card with horizontal scroll when product selected

### Phase 4 — Planned (Vendor Portal + Digital Marketing)
- Franchise/vendor portal — vendor login, assigned orders only
- Admin assigns orders to vendors
- Vendor updates production status
- Vendor dashboard with own stats
- Digital marketing support packages (Starter/Growth/Premium) — monthly subscription
- Customer opts in from dashboard, fills brand brief, pays via Razorpay/wallet
- Tadda team manages social media, ads, content — progress visible in customer dashboard
- Firestore: `/marketing_subscriptions/{uid}`, `/marketing_deliverables/{autoId}`
- Recurring revenue model for Tadda — upsell from printing to full brand partner

---

## Known Issues / Notes
- GitHub Actions auto-deploy is broken (FIREBASE_TOKEN expired) — use manual `firebase deploy` for now
- To fix auto-deploy: run `firebase login:ci`, copy token, update `FIREBASE_TOKEN` secret in GitHub repo settings
- Storage bucket was created manually via Google Cloud Console (region didn't support free-tier auto-creation)
- `let` / `const` variables cause TDZ errors if referenced in inline `onclick=` handlers — use `var` for module-level state or move handlers to `addEventListener`
- When adding multiple click handlers to the same element, use a flag variable (e.g. `alreadyRegistered`) to control behaviour rather than `onclick` which conflicts with `addEventListener`
- Web3Forms free tier: 250 emails/month — monitor as order volume grows; upgrade or switch service if exceeded

## Scalability Notes
- Firebase Storage: each user uploads to isolated path `orders/{orderId}/` — no contention between users
- Firestore: each order is a separate document — no locking or queuing issues at scale
- File uploads use `Promise.all()` so all files upload in parallel (not sequential) — roughly halves wait time
- Web3Forms 250/month limit is the first constraint to hit at scale
- Firebase free tier limits: 50K Firestore reads/day, 20K writes/day, 1GB Storage — sufficient for current B2B scale
