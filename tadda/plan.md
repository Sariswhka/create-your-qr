# Tadda Portal — Phase 2 Build Plan

## Roles

| Role | Who | Access |
|------|-----|--------|
| **Super Admin** | parashar.sachin@gmail.com | Platform control — manage admins, service level (0-4), password reset. No access to business data (orders/registrations) |
| **Admin** | Tadda official email + 1 more (max 2) | Full business access — orders, registrations, customers, notifications. Can add/remove the 2nd admin |
| **Customer** | Anyone who signs up | Own orders only, place orders, brand owner registration |

---

## Service Suspension Levels

| Level | Order Form | Customer Dashboard | Admin Dashboard | Admin Notifications |
|-------|-----------|-------------------|----------------|-------------------|
| 0 - Active | Works | Works | Works | Works |
| 1 - Warning | Works | Works | Works, but new orders hidden | Blocked |
| 2 - Restricted | Works | Works | Blocked entirely | Blocked |
| 3 - Limited | Blocked | Works (past orders only) | Blocked | Blocked |
| 4 - Suspended | Blocked | Blocked | Blocked | Blocked |

- Admin sees generic message: "Service suspended — contact platform admin"
- All data preserved — restoring to Level 0 makes everything visible again
- Nothing is ever deleted during suspension

---

## Firestore Changes

| Collection / Doc | Purpose |
|-----------------|---------|
| `/settings/platform` | `{ serviceLevel: 0, suspendedAt: null, message: '...' }` |
| `/admins/{email}` | `{ role: 'super_admin' or 'admin', addedBy: '...', addedAt: timestamp }` |

---

## Build Tasks

### Step 1: Firestore Setup (foundation)
- [ ] Create `/settings/platform` doc with `{ serviceLevel: 0 }`
- [ ] Create `/admins/{email}` collection — seed with super admin (`parashar.sachin@gmail.com`)
- [ ] Update Firestore security rules — replace hardcoded email with `/admins` collection check
- **Time: 30 min**

### Step 2: Super Admin Panel (`superadmin.html` — NEW)
- [ ] Login restricted to `parashar.sachin@gmail.com` only
- [ ] Service status control (Level 0-4 dropdown with confirmation)
- [ ] Admin management (add/remove admins, max 2)
- [ ] Password reset for any user
- **Time: 45 min**

### Step 3: Admin Panel Updates (`admin.html` — MODIFY)
- [ ] Replace hardcoded email check with `/admins` collection lookup
- [ ] Service level check — Level 1 hides new orders, Level 2+ blocks entire page with message
- [ ] Export to JSON button — download all orders + registrations as backup file
- [ ] Admin management section — add/remove the 2nd admin (admin-level, not super admin)
- **Time: 45 min**

### Step 4: Service Level Checks (MODIFY existing pages)
- [ ] `order.html` — Level 3+ shows "New orders temporarily unavailable"
- [ ] `dashboard.html` — Level 4 blocks access, show "Admin Panel" link if user is an admin
- [ ] `index.html` — Level 4 shows "Service suspended" message, super admin redirect to `superadmin.html`
- **Time: 30 min**

### Step 5: Notification Updates
- [ ] `order.html` — send order notification to all admin emails (from `/admins` collection), blocked at Level 1+
- [ ] `tadda-web/js/app.js` — send registration notification to all admin emails
- **Time: 20 min**

### Step 6: Data Policy Page (`policy.html` — NEW)
- [ ] Who owns the data (Tadda owns their data)
- [ ] Encryption details (AES-256 at rest, HTTPS in transit, Google Cloud infrastructure)
- [ ] Backup policy (export available, scheduled backups on Blaze plan)
- [ ] Super admin access scope (platform management only, no business data)
- [ ] Deletion policy (suspension hides data, never deletes)
- **Time: 15 min**

### Step 7: Brand Logo & Product File Upload
- [ ] Add user profile section (new page `profile.html` or modal in dashboard)
- [ ] Upload brand logo (PNG/JPG, one-time, saved to user profile in Firestore + Storage)
- [ ] Upload product file / catalogue (PDF/PNG/JPG, optional, saved to profile)
- [ ] Brand logo auto-displayed in order details (admin can see it)
- [ ] Order form allows override — upload a different logo per order if needed
- [ ] Store in Firebase Storage: `users/{uid}/brand_logo_{timestamp}` and `users/{uid}/product_file_{timestamp}`
- [ ] Update `/users/{uid}` doc with `brandLogoUrl` and `productFileUrl` fields
- **Time: 45 min**

### Step 8: Deploy + Test
- [ ] Deploy taddaportal
- [ ] Deploy tadda-web
- [ ] Test full flow: super admin login, admin login, customer login
- [ ] Test each service level (0 through 4)
- [ ] Test export button
- [ ] Test notification delivery to all admins
- **Time: 15 min**

---

## Estimated Total Effort

| Block | Time |
|-------|------|
| Firestore setup (admins, settings, rules) | 30 min |
| Super admin panel | 45 min |
| Admin panel updates (role check, export, service level) | 45 min |
| Service level checks on all pages | 30 min |
| Notification updates | 20 min |
| Data policy page | 15 min |
| Brand logo & product file upload | 45 min |
| Testing + deploy | 15 min |
| **Total** | **~4.25 hours** |

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `superadmin.html` | NEW — super admin control panel |
| `policy.html` | NEW — data policy page |
| `admin.html` | MODIFY — role check, service level, export button, admin management |
| `order.html` | MODIFY — service level check, notifications to all admins |
| `dashboard.html` | MODIFY — service level check, admin panel link for admins |
| `index.html` | MODIFY — service level check, super admin redirect |
| `tadda-web/js/app.js` | MODIFY — notifications to all admins |
| `profile.html` | NEW — user profile with brand logo & product file upload |
| `dashboard.html` | MODIFY — add profile link in sidebar |
| Firestore rules | MODIFY — replace hardcoded email with `/admins` collection |

---

## Data Security (for demo pitch)

### Already in place
- Data hosted on Google Cloud (same infra as YouTube, Gmail, Google Pay)
- Customer data isolation — enforced at database level, not just UI
- Firestore security rules reject unauthorized reads/writes
- File uploads in Google Cloud Storage with authenticated access only
- SSL/HTTPS enforced — all data encrypted in transit
- AES-256 encryption at rest (Google default)

### Being added in this phase
- Export to JSON — admin can download all data anytime as backup
- Data policy page — documents ownership, encryption, backup, deletion policies
- Super admin has zero access to business data — platform control only
- Role-based access — max 2 admins, managed from admin panel

### Future (when on Blaze plan)
- Firebase scheduled exports — automatic daily backup to Cloud Storage
- Firestore Point-in-Time Recovery (PITR) — restore to any point in last 7 days

---

## Future Features

### Wallet Management System

**Concept:** Tadda admin tops up a customer's wallet. Customer uses wallet balance to pay for orders. Incentive: 5% bonus on every wallet top-up.

**How it works:**

```
1. Admin adds money to customer wallet
   Admin panel → Select customer → Add ₹10,000 to wallet
   → Customer sees ₹10,500 in wallet (₹500 bonus at 5%)

2. Customer places order
   Order total: ₹20,000 (100 tees × ₹200)
   → Wallet deducted: ₹20,000
   → Remaining balance: ₹500 (if they had ₹20,500)

3. If wallet balance < order total
   → Option A: Pay partial from wallet + rest via Razorpay
   → Option B: Full Razorpay (no wallet discount)

4. Customer can view wallet history
   Dashboard → Wallet tab → all top-ups, deductions, bonuses
```

**Firestore structure:**

| Collection | Purpose |
|------------|---------|
| `/wallets/{uid}` | `{ balance: 10500, totalTopUps: 10000, totalBonus: 500, totalSpent: 0 }` |
| `/wallet_transactions/{autoId}` | `{ userId, type: 'topup'/'deduction'/'bonus', amount, orderId, note, createdBy, createdAt }` |

**Key rules:**
- Only admin can add money (top-up)
- Only the system deducts on order placement (no manual deduction by customer)
- 5% bonus auto-calculated on every top-up
- Full transaction history visible to customer + admin
- Wallet balance shown on customer dashboard header
- Admin sees wallet balance in customer list + order details

**Pages affected:**
- `dashboard.html` — wallet balance display + wallet history tab
- `order.html` — wallet payment option at checkout
- `admin.html` — top-up button per customer, wallet column in customer list

**Dependencies:** Should be built after Razorpay integration (Phase 3) so both payment methods work together.

---

### Razorpay Payment Integration

**Concept:** Collect advance payment (30-50%) at order placement. Full payment before dispatch.

**Flow:**
```
Customer places order (₹20,000 total)
    → Pay 50% advance via Razorpay (₹10,000)
    → OR pay from wallet (if sufficient balance)
    → Order created with status: "Advance Paid"

Before dispatch:
    → Admin requests remaining payment
    → Customer pays balance via Razorpay or wallet
    → Order status: "Fully Paid" → Dispatched
```

**Firestore:**
| Field | Added to `/orders/{orderId}` |
|-------|------------------------------|
| `advanceAmount` | Amount paid upfront |
| `balanceAmount` | Remaining to pay |
| `paymentStatus` | `unpaid / advance_paid / fully_paid` |
| `razorpayPaymentId` | Razorpay transaction ID |

### Invoice & Credit Note PDF

- Auto-generate invoice PDF on order confirmation (jsPDF)
- Credit note PDF for cancellations/returns
- Download from admin panel + customer dashboard
- Includes: order details, payment breakdown, GST (if applicable), Tadda branding

### Vendor/Franchise Portal (Phase 4)

- Vendor login — sees only orders assigned to them
- Admin assigns orders to vendors
- Vendor updates production status
- Vendor dashboard with own stats

### Product Image Management (Phase 2/3)

**Concept:** Admin can upload, replace, and add multiple images per product. Images appear on both the marketing website product viewer and the order form product preview. Multiple images scroll horizontally.

**Admin side (admin panel):**
```
Admin → Products tab (new)
    → Sees all 7 products listed
    → Click a product → opens image manager
    → Upload new images (JPG/PNG), drag to reorder, delete existing
    → First image = primary (shown in product tile/card)
    → Images stored in Firebase Storage: products/{productKey}/{timestamp}_{filename}
    → Image URLs saved to Firestore: /products/{productKey} → { images: [url1, url2, ...] }
```

**Marketing website (tadda-web) product viewer:**
```
Current: single image per product (hardcoded in app.js)
Updated: fetches images from Firestore /products/{productKey}
    → Multiple images shown with horizontal scroll (swipe on mobile, arrows on desktop)
    → Dot indicators below showing current position
    → Tap/click to zoom
```

**Order form (order.html) product preview:**
```
Current: no product image shown
Updated: when customer selects a product from dropdown
    → Product preview card appears below the dropdown
    → Shows product images in horizontal scroll
    → Helps customer confirm they're ordering the right product
```

**Firestore:**

| Collection | Purpose |
|------------|---------|
| `/products/{productKey}` | `{ name, images: [url1, url2, ...], updatedAt }` |

**Pages affected:**
- `admin.html` — new Products tab with image upload/manage UI
- `tadda-web/public/js/app.js` — fetch images from Firestore instead of hardcoded array
- `tadda-web/public/index.html` — horizontal scroll in product viewer modal
- `order.html` — product preview card with horizontal image scroll

---

### Digital Marketing Support Package (Phase 4)

**Concept:** Tadda offers digital marketing as an add-on service for brand owners. Customers can opt in from the portal and Tadda handles their online presence — social media, ads, content creation.

**Packages:**

| Package | Includes | Price (suggested) |
|---------|----------|-------------------|
| Starter | Instagram page setup + 8 posts/month + hashtag strategy | TBD |
| Growth | Starter + Facebook + paid ad management (Meta Ads) | TBD |
| Premium | Growth + influencer outreach + monthly performance report | TBD |

**How it works:**
```
1. Customer goes to Dashboard → Digital Marketing tab
   → Sees available packages with details

2. Customer selects a package
   → Fills brief: brand name, target audience, brand colours, tone, sample content
   → Pays via Razorpay or wallet

3. Tadda team onboards
   → Admin sees the subscription in admin panel
   → Admin assigns to marketing team / manages deliverables
   → Monthly status visible to customer (posts done, reach, followers)

4. Customer views progress
   → Dashboard shows: posts delivered this month, next post date, engagement stats
   → Can upload content / product photos for the team to use
```

**Firestore structure:**

| Collection | Purpose |
|------------|---------|
| `/marketing_subscriptions/{uid}` | `{ package, status, startDate, renewalDate, briefData, assignedTo }` |
| `/marketing_deliverables/{autoId}` | `{ userId, month, postsDelivered, reachStats, reportUrl, createdAt }` |

**Pages affected:**
- `dashboard.html` — new "Digital Marketing" tab for subscribed customers
- `admin.html` — marketing subscriptions management, deliverable tracking
- `profile.html` — brand brief (colours, tone, audience) reusable across orders + marketing

**Key value proposition for Tadda:**
- Recurring revenue (monthly subscription on top of per-order income)
- Stickier customers — if Tadda handles their marketing, they're less likely to switch vendors
- Upsell path: customer starts with printing → adds marketing → full brand partner

---

## Pending Inputs

- [ ] Tadda official email (for first admin account)
- [ ] Confirm: should admins be able to delete orders? (soft delete vs hard delete vs no delete)
- [ ] Confirm: clear existing test orders before demo, or keep as samples?
