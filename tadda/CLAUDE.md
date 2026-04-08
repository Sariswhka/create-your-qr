# Tadda Portal — Project Context

## Roles & Ownership
- **Sachin (`parashar.sachin@gmail.com`)** — Product owner. Built OrderFlow (this platform) as a B2B SaaS product to sell to clients.
- **Tadda** — First/pilot client. A print-on-demand and bulk clothing business. They use this platform to manage orders.
- The platform is currently hosted under Sachin's Firebase account (`tadda-81f3e`) for the Tadda client.
- Migration to Tadda's own Firebase account is planned (see `MIGRATION_RUNBOOK.md`).

## Overview
Tadda is a **print-on-demand and bulk clothing order management portal** — the first live client of the OrderFlow platform.
Tadda's customers place orders; Tadda's admin reviews, manages, and fulfills them through vendors.

There are **two web properties** for Tadda:
| Property | URL | Directory | Purpose |
|----------|-----|-----------|---------|
| Portal | https://taddaportal.web.app | `tadda/` | Order management app (login required) |
| Marketing Website | https://tadda-web.web.app | `tadda-web/` | Public-facing brand/product website |

- **Firebase Project:** `tadda-81f3e` (Sachin's account — to be migrated to Tadda's account)
- **Admin email:** `parashar.sachin@gmail.com` (Sachin's email, used as portal admin for Tadda)

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
│  │  /registr..  │  │  mockups/{uid}│  └────────────────────┘   │
│  │  /mockups    │  └───────────────┘                           │
│  └──────────────┘                                              │
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
├── pitch.html                     # T-ADDA specific pitch (7 pages, PDF-ready)
├── pitch-product.html             # General "OrderFlow" product pitch (8 pages, PDF-ready)
├── CLAUDE.md                      # This file
└── public/
    ├── index.html                 # Login (Google + Email/Password)
    ├── order.html                 # New order form (multi-file + saved design picker)
    ├── dashboard.html             # Customer dashboard (with My Saved Designs section)
    ├── admin.html                 # Admin dashboard
    ├── mockup.html                # Mockup Builder (staging → production pending)
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
3. **Design & Artwork** — tab switcher:
   - *Upload New*: file input, `multiple`, up to 6 images from device
   - *Choose from Saved*: thumbnail grid from `/mockups` collection, multi-select up to 6 (checkmark badge on selected)
4. **Mockup** — same tab switcher pattern as Design (Upload New / Choose from Saved)
5. **Placement** — required text field; **Design Size** — optional
6. **Neck Label** — yes/no toggle + upload
7. **Shipping**
   - Self-managed: customer arranges courier
   - Tadda arranges: shows delivery address fields (address, city, PIN) + shipping label upload
8. **Additional Notes** — free text

On submit:
- Validates colour selected + at least one size qty > 0
- Validates design provided (either file upload or saved design selected)
- Uploads new files to Firebase Storage: `orders/{orderId}/{timestamp}_{filename}`
- Uses saved design URLs directly (no re-upload)
- Saves order doc to Firestore `/orders/{orderId}` — stores both `designUrl` (first), `designUrls` (array), `mockupUrl`, `mockupUrls` (array)
- Sends admin email via Web3Forms (non-blocking)
- Shows success modal with order summary (ID, brand, product+colour, qty, ETA)

### dashboard.html — Customer Dashboard
- Shows only logged-in user's orders (`where userId == uid, orderBy createdAt DESC`)
- Stats: Total, Pending, In Production, Delivered
- Filter by status
- Click order row → modal with full order details + file download links
- Requires Firestore composite index: `userId ASC + createdAt DESC`
- **My Saved Designs** — section above orders table; loads from `/mockups` (limit 20, no orderBy)
  - Composite thumbnail: `blankUrl` as background image + `imageUrl` as overlay (CSS position)
  - Click thumbnail → opens `imageUrl` in new tab
  - "+ Create New" button links to `/mockup.html`
  - Section hidden if user has no saved designs
- **Become a Brand Owner** — sidebar link that opens registration modal
  - Pre-fills name + email from logged-in user
  - Checks `reg_index` on login — if already registered, sidebar shows "Brand Owner Registered ✓" in green
  - Clicking when already registered shows info message instead of opening form
  - Saves to `/registrations` with `registeredFrom: 'portal'` + writes `reg_index` entries atomically
  - Duplicate phone/email blocked with clear error message

### mockup.html — Mockup Builder (Staging)
- Login-required page — redirects to index if not authenticated
- **Product/colour selector** — dropdown picks product + colour; loads blank photos from Firestore `/products/{key}` Storage URLs
- **View tabs** — Front / Back / Left / Right; each loads corresponding blank photo
- **Canvas rendering:**
  - Blank product photo displayed as CSS `background-image` on `.canvas-wrapper` div (NOT drawn into canvas — avoids CORS taint)
  - Fabric.js canvas sits on top with `backgroundColor: 'transparent'` — holds only the design layer
  - `canvas.toDataURL()` works cleanly since no cross-origin pixels are in the canvas
- **Design upload** — user uploads PNG; `fabric.Image.fromURL` adds it to canvas, scalable/moveable
- **Tools panel** — delete selected object, download mockup (merges blank + canvas via off-screen canvas), save mockup
- **Save Mockup** — saves to Firestore `/mockups`:
  - `imageUrl`: canvas layer PNG (transparent background, just the design) uploaded to Storage `mockups/{uid}/{id}.png`
  - `blankUrl`: product blank photo Storage URL (saved separately, not composited in canvas)
  - Thumbnail on dashboard composites them with CSS overlay
- **My Saved Designs panel** — grid of saved mockups with delete; clicking opens design in new tab
- **Save Design Only** — upload PNG directly to `/mockups` without using canvas (for storing finished artwork)
  - Supports up to 6 files at once
  - `blankUrl` stored as empty string; `productKey` and `colour` stored as empty string

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
| designUrl | string | Storage URL — first/primary design file |
| designUrls | array | Storage URLs — all design files (up to 6) |
| mockupUrl | string | Storage URL — first/primary mockup (optional) |
| mockupUrls | array | Storage URLs — all mockup files (up to 6, optional) |
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

### `/mockups/{mockupId}`
Saved designs and mockups per user.
| Field | Type | Notes |
|-------|------|-------|
| userId | string | Firebase Auth UID |
| userEmail | string | |
| productKey | string | One of the 7 product keys (empty for direct design saves) |
| colour | string | Product colour (empty for direct design saves) |
| view | string | `front/back/left/right` or original filename for direct saves |
| imageUrl | string | Storage URL — transparent design layer PNG |
| blankUrl | string | Storage URL — product blank photo (empty for direct design saves) |
| createdAt | timestamp | Server timestamp |

Storage path: `mockups/{uid}/{timestamp}_{filename}`

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
    match /mockups/{mockupId} {
      allow create: if request.auth != null;
      allow read, delete: if request.auth != null && resource.data.userId == request.auth.uid;
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
`cors.json` allows origins: `https://taddaportal.web.app`, `https://taddaportal--staging-tm3zjr94.web.app`, and `http://localhost:5000`

**Note:** CORS headers are not strictly required for the Mockup Builder because product blank photos are rendered via CSS `background-image` on a wrapper div (not drawn into the Fabric.js canvas). This keeps the canvas untainted and `toDataURL()` works without CORS. Proper CORS headers would enable future canvas-merge export features.

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
**Delivered: April 2026**

**Order Portal (taddaportal.web.app)**
- [x] Login (Google + Email/Password)
- [x] Dynamic order form — 7 products, colour swatches, dynamic size tables
- [x] Auto-fill customer details (name, brand, phone) from last order for returning customers
- [x] Order confirmation modal before submit — shows full summary + pricing breakdown
- [x] Delivery address fields (shown when Tadda arranges shipping)
- [x] Design & mockup file upload — multiple files (up to 6), tab switcher (Upload New / Choose from Saved)
- [x] File uploads to Firebase Storage (parallel — all files uploaded simultaneously)
- [x] Order saved first with `unpaid` status, then Razorpay payment attempted
- [x] Order doc stores `designUrl` + `designUrls[]`, `mockupUrl` + `mockupUrls[]`
- [x] Customer dashboard — own orders only, status filter, order details modal
- [x] My Saved Designs section on dashboard (loaded from `/mockups` collection)
- [x] Payment column in orders table (Paid / Unpaid)
- [x] "Pay Now" button on dashboard for unpaid orders (works once Razorpay key is configured)
- [x] "Become a Brand Owner" in customer dashboard (pre-fill + duplicate check + already-registered state)
- [x] Admin dashboard — all orders, status management, admin notes, payment info
- [x] Registrations tab in admin — brand owner leads management
- [x] Product Photos tab in admin — upload/delete photos per product (stored in Firestore + Storage)
- [x] Product photos shown to customers in order form when product is selected (horizontal scroll)
- [x] Duplicate registration prevention via `reg_index` collection (phone + email)
- [x] Firestore security rules (orders, mockups user-scoped; products readable by auth; admin-write only)
- [x] Firebase Storage + CORS
- [x] Admin email notifications on new order + new registration

**Mockup Builder (mockup.html) — Staging ✅, Production pending**
- [x] DIY canvas — upload design PNG, position on real product blank photos
- [x] Product/colour/view selector (Front, Back, Left, Right)
- [x] Fabric.js canvas with transparent background (CSS background approach — no CORS taint)
- [x] Save Mockup to `/mockups` collection (imageUrl = design layer, blankUrl = product photo)
- [x] My Saved Designs panel on mockup builder
- [x] Save Design Only — upload PNG directly to library (up to 6 files)
- [x] Saved designs selectable from order form (tab switcher)

**Marketing Website (tadda-web.web.app)**
- [x] Full single-page marketing site (Hero, About, Why Us, How It Works, Products, Pricing, T&C, Contact)
- [x] Actual Tadda logo in nav (full black brand text)
- [x] Product viewer modal with 7 products (photos, GSM, price, features, sizes)
- [x] Brand Owner registration modal with duplicate check (phone + email)
- [x] Contact form via Web3Forms

**Pitch Documents**
- [x] `pitch.html` — T-ADDA specific pitch (7 pages, PDF-ready via Chrome print)
- [x] `pitch-product.html` — General "OrderFlow" product pitch (8 pages) — T-ADDA as live client reference

### Phase 2 — Planned (₹25,000 one-time)
**Features:**
- [ ] Mockup Builder → deploy to production (staging already done)
- [ ] Role system: Super Admin (platform), Admin (business, max 2 seats), Customer
  - Admin roles from `/admins/{email}` Firestore collection (no hardcoded emails)
  - Super admin panel (`superadmin.html`) — service level, admin management
- [ ] Service Level Control (4 levels: Active → Warning → Restricted → Limited → Suspended)
- [ ] Employee Management — add team members (name, phone, email); assign Primary + Secondary owner per order
- [ ] Vendor Portal — multiple vendors, assigned orders only, production status updates
- [ ] Ticketing System — customers raise queries from dashboard; admin responds with thread; Open → In Progress → Resolved
- [ ] New Product Category Management — admin adds products, colours, sizes, pricing from panel (zero code changes)
- [ ] Wallet System — admin tops up customer wallet, 5% bonus; used at checkout alongside Razorpay
- [ ] Invoice PDF auto-generation on order confirmation (jsPDF); Credit Note PDF for cancellations
- [ ] Data Export — admin downloads all orders + registrations as CSV/JSON backup
- [ ] Smart Notifications — email/WhatsApp alerts to assigned employees on new order; customer notified on status change

### Phase 3 — Planned (Pricing TBD)
- Razorpay advance payment (50% at order, balance before dispatch) — integration built, activates with credentials
- Brand logo & product file upload — user profile with one-time upload, auto-attached to orders
- Data policy page (`policy.html`) — ownership, encryption, backup, deletion policies

---

## Known Issues / Notes
- GitHub Actions auto-deploy is broken (FIREBASE_TOKEN expired) — use manual `firebase deploy` for now
- To fix auto-deploy: run `firebase login:ci`, copy token, update `FIREBASE_TOKEN` secret in GitHub repo settings
- Storage bucket was created manually via Google Cloud Console (region didn't support free-tier auto-creation)
- `let` / `const` variables cause TDZ errors if referenced in inline `onclick=` handlers — use `var` for module-level state or move handlers to `addEventListener`
- When adding multiple click handlers to the same element, use a flag variable (e.g. `alreadyRegistered`) to control behaviour rather than `onclick` which conflicts with `addEventListener`
- Web3Forms free tier: 250 emails/month — monitor as order volume grows; upgrade or switch service if exceeded
- Mockup Builder: `fabric.Image.fromURL` with `crossOrigin: 'anonymous'` causes browser to cache CORS failures silently — solved by rendering product blanks via CSS `background-image` (not drawn into canvas)
- Firestore `orderBy` on `/mockups` requires a composite index — removed `orderBy` to avoid the error; results returned in natural order
- Mockup Builder blank photos only uploaded for Regular 180 GSM Black (4 views) — other products/colours need photos added via Admin → Product Photos tab for Mockup Builder to work fully

## Pending Actions (Production)
- [ ] **Razorpay credentials** — T-ADDA to provide Key ID + Secret to activate payment gateway
- [ ] **Deploy Mockup Builder** — run `firebase deploy --only hosting:taddaportal` to push staging changes live
- [ ] **Upload remaining product blank photos** — use Admin → Product Photos tab for all products/colours/views
- [ ] **Custom domain** — register tadda.in (~₹1,000/year), point to Firebase Hosting (optional)
- [ ] **Fix GitHub Actions auto-deploy** — run `firebase login:ci`, update `FIREBASE_TOKEN` secret in GitHub repo settings

## Scalability Notes
- Firebase Storage: each user uploads to isolated path `orders/{orderId}/` — no contention between users
- Mockup designs stored at `mockups/{uid}/` — isolated per user
- Firestore: each order is a separate document — no locking or queuing issues at scale
- File uploads use `Promise.all()` so all files upload in parallel (not sequential) — roughly halves wait time
- Web3Forms 250/month limit is the first constraint to hit at scale
- Firebase free tier limits: 50K Firestore reads/day, 20K writes/day, 1GB Storage — sufficient for current B2B scale
