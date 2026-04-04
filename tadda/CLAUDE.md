# Tadda Portal — Project Context

## Overview
Tadda is a print-on-demand and bulk clothing order management portal.
Customers place orders; admin (Sachin) reviews, manages, and fulfills them through vendors.

- **Live URL:** https://taddaportal.web.app
- **Firebase Project:** `tadda-81f3e`
- **Hosting Site:** `taddaportal`
- **Directory:** `C:\Users\Richa\OneDrive\Apps\create-your-qr\tadda\`

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Auth:** Firebase Authentication (Google Sign-In + Email/Password)
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage (file uploads)
- **Hosting:** Firebase Hosting
- **Email:** Web3Forms (admin notification on new order — free, 250/month)

## Deploy Command
```bash
cd "C:\Users\Richa\OneDrive\Apps\create-your-qr\tadda"
firebase deploy --only hosting:taddaportal
```

## Project Structure
```
tadda/
├── firebase.json          # Hosting config — site: taddaportal
├── cors.json              # CORS config for Firebase Storage (applied via gsutil)
├── CLAUDE.md              # This file
└── public/
    ├── index.html         # Login page (Google + Email/Password)
    ├── order.html         # New order form
    ├── dashboard.html     # Customer dashboard (own orders only)
    ├── admin.html         # Admin dashboard (all orders)
    ├── css/style.css      # Full design system
    └── js/
        └── config.js      # Firebase config + Web3Forms key (NOT in git)
```

## Pages

### index.html — Login
- Google Sign-In + Email/Password login
- Redirects to `/dashboard.html` on login
- Admin (`parashar.sachin@gmail.com`) also goes to `/dashboard.html` but can navigate to `/admin.html`

### order.html — New Order Form
Sections:
1. Customer Details (name, brand, email, phone — auto-filled from auth)
2. Product Selection (T-Shirt Regular 180GSM / Oversized 220GSM / Hoodie 350GSM)
3. Size-wise quantity (S/M/L/XL/XXL) with auto total + dispatch ETA
4. Design & Artwork (design file PNG required, mockup optional, placement, design size)
5. Neck Label (yes/no + upload)
6. Shipping (self-managed or Tadda arranges + shipping label upload)
7. Additional notes

File uploads go to Firebase Storage: `orders/{orderId}/{timestamp}_{filename}`

On submit:
- Saves order to Firestore `/orders/{orderId}`
- Sends admin email via Web3Forms
- Shows success modal with order summary

### dashboard.html — Customer Dashboard
- Shows only logged-in user's orders (`where userId == uid`)
- Stats: Total, Pending, In Production, Delivered
- Filter by status (All / Pending / Confirmed / In Production / Dispatched / Delivered / Cancelled)
- Click order row → modal with full order details + file links
- Requires Firestore composite index: `userId ASC + createdAt DESC`

### admin.html — Admin Dashboard
- Restricted to `parashar.sachin@gmail.com` — others redirected to dashboard
- Stats: Total, Pending, In Production, Dispatched
- Filter by status + search by order ID / brand / email
- Click order → modal with full details + Update Status + Admin Notes
- Statuses: Pending → Confirmed → In Production → Dispatched → Delivered → Cancelled
- Customers tab: lists all registered users

## Firestore Structure

### `/orders/{orderId}`
| Field | Type | Description |
|-------|------|-------------|
| orderId | string | e.g. `TAD-2026-0404-AB12C` |
| userId | string | Firebase Auth UID |
| userEmail | string | Customer email |
| custName | string | Full name |
| brandName | string | Brand/company name |
| custPhone | string | Contact number |
| product | string | `tshirt_regular` / `tshirt_oversized` / `hoodie` |
| colour | string | e.g. "Black" |
| sizes | map | `{S, M, L, XL, XXL}` — quantities |
| totalQty | number | Sum of all sizes |
| designUrl | string | Firebase Storage URL |
| mockupUrl | string | Firebase Storage URL (optional) |
| placementDetails | string | e.g. "Front chest center" |
| designSize | string | e.g. `10"×12"` |
| neckLabel | string | `yes` / `no` |
| neckLabelUrl | string | Firebase Storage URL (optional) |
| shipping | string | `self` / `arrange` |
| shippingLabelUrl | string | Firebase Storage URL (optional) |
| notes | string | Additional notes (optional) |
| status | string | `pending` / `confirmed` / `production` / `dispatched` / `delivered` / `cancelled` |
| dispatchEta | string | `24–72 hours` or `48–120 hours` |
| adminNotes | string | Internal notes added by admin |
| createdAt | timestamp | Server timestamp |
| updatedAt | timestamp | Set when admin updates status |

### `/users/{uid}`
Managed by Firebase Auth — used for customer list in admin

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
Applied via gsutil (one-time):
```bash
gsutil cors set cors.json gs://tadda-81f3e.firebasestorage.app
```
cors.json allows: `https://taddaportal.web.app` and `http://localhost:5000`

## config.js (NOT in git — gitignored)
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
window.WEB3FORMS_KEY = '...'; // web3forms.com access key
```

## Email Notifications (Web3Forms)
- On every new order, admin gets email at `parashar.sachin@gmail.com`
- Contains full order details + link to admin panel
- Free tier: 250 emails/month
- Key stored in `config.js` as `window.WEB3FORMS_KEY`

## Phase 1 Status — COMPLETE ✅
- [x] Login (Google + Email/Password)
- [x] Order form with file uploads
- [x] Customer dashboard (own orders, status filter)
- [x] Admin dashboard (all orders, status management, customer list)
- [x] Firestore security rules
- [x] Firebase Storage + CORS
- [x] Admin email notification on new order
- [x] Enhanced success modal with order summary

## Phase 2 — Planned
- Razorpay advance payment (% of order value)
- Wallet balance + 5% discount for wallet payments
- Credit note PDF generation (jsPDF)
- Invoice download

## Phase 3 — Planned
- Franchise/vendor portal
- Vendor-wise order assignment
- Vendor dashboard

## Admin Access
- URL: https://taddaportal.web.app/admin.html
- Login: `parashar.sachin@gmail.com` (Google or email/password)
