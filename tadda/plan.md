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

## Phase 2 — API & Licensing Cost Summary

| Feature | External API / Service | Cost |
|---------|----------------------|------|
| Role system + service levels | Firestore only | ₹0 |
| Employee management | Firestore only | ₹0 |
| Vendor portal | Firestore only | ₹0 |
| Ticketing system | Firestore + Web3Forms (existing) | ₹0 |
| Ticketing at scale (>250 emails/month) | SendGrid free tier | ₹0 |
| Wallet system | Firestore only | ₹0 |
| Wallet top-up payments | Razorpay (already integrated) | 2% per txn |
| Invoice / Credit Note PDF | jsPDF (MIT, CDN) | ₹0 |
| Data export (CSV/JSON) | Pure JS (no API) | ₹0 |
| Product category management | Firestore only | ₹0 |
| Smart notifications (email) | SendGrid free (3,000/month) | ₹0 |
| Smart notifications (WhatsApp) | Not recommended at current scale | ₹999–1,399/month if needed |
| Mockup Builder → production deploy | Already built on staging | ₹0 |
| **Total new monthly cost** | | **₹0** |

> WhatsApp notification via API (Interakt/AiSensy/WATI) is optional — only worth adding once order volume justifies it. Email notifications cover all Phase 2 needs at ₹0.

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
| Wallet system (Firestore + admin top-up + dashboard + order checkout) | 2 hrs |
| Ticketing system (Firestore + dashboard Support tab + admin Tickets tab) | 2.5 hrs |
| Employee management + order assignment | 1 hr |
| New product category management (admin panel) | 1.5 hrs |
| Vendor portal (login, assigned orders, status update) | 2 hrs |
| Testing + deploy | 30 min |
| **Total** | **~12 hours** |

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

**API / Licensing cost: ₹0**
- Pure Firestore implementation — no external API or SDK needed
- Razorpay already integrated (2% per transaction — already budgeted)
- jsPDF for invoice PDF — MIT license, free CDN
- No new monthly costs

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

**Build steps:**
1. Create `/wallets/{uid}` doc on first admin top-up (or on user creation)
2. Admin panel: add "Wallet" column to customer list + "Top Up" button → modal (amount input → write topup + bonus transactions + update balance atomically via `db.batch()`)
3. `order.html`: show wallet balance if available → checkbox "Use wallet balance" → deduct at submission (inside existing submit handler, before/after Razorpay)
4. `dashboard.html`: wallet balance card in stats row + Wallet History tab (`where userId == uid, orderBy createdAt DESC`)
5. Security rules: `/wallets/{uid}` — read by owner + admin; write only by admin or server-side logic (use `request.auth.token.email` check)

**Time estimate: ~2 hours**

**Dependencies:** Should be built after Razorpay integration is activated so both payment methods work together.

---

### Ticketing System

**Concept:** Customers raise support queries or concerns from their dashboard. Admin views, responds, and closes tickets. Full conversation thread per ticket with status tracking.

**API / Licensing cost: ₹0 (with note on email volume)**
- Pure Firestore implementation — no external ticketing API or SDK needed
- Ticket thread uses Firestore `onSnapshot()` for real-time updates — no WebSocket service needed
- Email notifications: Web3Forms handles new-ticket alerts (shared 250/month quota)
  - **If email volume grows:** switch ticket notifications to **SendGrid free tier (3,000/month, ₹0)** — simple config swap, no code change beyond the fetch URL and API key
  - Do NOT use WhatsApp API for tickets at current scale — cost not justified (₹999–1,399/month via Interakt/AiSensy)

**How it works:**

```
1. Customer raises a ticket
   Dashboard → Support tab → "New Ticket" button
   → Subject + description + optional file attachment
   → Ticket saved to Firestore with status: "open"
   → Admin receives email notification (Web3Forms)

2. Admin responds
   Admin panel → Tickets tab → click ticket
   → Types reply → saved as message doc in thread
   → Status can be updated: Open → In Progress → Resolved
   → Customer sees reply in real-time (onSnapshot)

3. Customer sees reply
   Dashboard → Support tab → click ticket
   → Full conversation thread shown (newest last)
   → Customer can reply, add more info
   → Once resolved, customer can reopen if issue persists

4. Ticket closed
   Admin marks as "Resolved"
   → Customer notified by email (optional)
   → Ticket archived but still visible in history
```

**Firestore structure:**

| Collection | Purpose |
|------------|---------|
| `/tickets/{ticketId}` | `{ userId, userEmail, subject, status: 'open/in_progress/resolved', createdAt, updatedAt, adminNotes }` |
| `/ticket_messages/{autoId}` | `{ ticketId, userId, senderRole: 'customer/admin', message, attachmentUrl, createdAt }` |

**Status flow:** `open → in_progress → resolved` (customer can reopen → back to `open`)

**Key rules:**
- Customer can create tickets and read/write only their own (`userId == request.auth.uid`)
- Admin can read/write all tickets
- Attachments stored in Firebase Storage: `tickets/{ticketId}/{timestamp}_{filename}`

**Pages affected:**
- `dashboard.html` — new "Support" tab: ticket list + new ticket form + thread view
- `admin.html` — new "Tickets" tab: all tickets filterable by status + thread view + status update

**Build steps:**
1. Firestore: add security rules for `/tickets` and `/ticket_messages`
2. `dashboard.html` Support tab: ticket list (filter: open/in_progress/resolved), "New Ticket" button → inline form (subject + description + optional file), click ticket → thread modal with `onSnapshot` listener
3. `admin.html` Tickets tab: all tickets table (filter by status, search by email/subject), click → thread modal, reply input, status dropdown (Open / In Progress / Resolved), admin notes field
4. Email notification on new ticket: Web3Forms POST (same pattern as order notifications)
5. Storage: upload attachment in ticket message (optional, can skip in v1)

**Time estimate: ~2.5 hours**

**Note on SendGrid migration (if needed):**
```js
// Current (Web3Forms)
fetch('https://api.web3forms.com/submit', {
  method: 'POST',
  body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject, message })
});

// Switch to SendGrid (free, 3000/month)
fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ personalizations: [...], from: {...}, subject, content: [...] })
});
```
SendGrid key stored in `config.js` (not in git) alongside existing Firebase config.

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
