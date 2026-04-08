# Tadda — On-Site Migration Runbook
# Moving tadda-81f3e (Sachin's/product owner's account) → Dedicated Firebase Project (Tadda client's account)
#
# Roles:
#   Sachin (parashar.sachin@gmail.com) = OrderFlow product owner — runs the migration
#   Tadda team = client — their Google account will own the new Firebase project

---

## PRE-VISIT CHECKLIST (Do This Before Going)

### On Your Machine
- [ ] Export latest Firestore data from `tadda-81f3e` (do this the night before or morning of)
- [ ] Copy `cors.json` to a USB / Google Drive
- [ ] Copy this `CLAUDE.md` to a USB / Google Drive
- [ ] Note down your Firebase account email (needed for temp login during export)

### Tools to Install on Their System (can do remotely or on arrival)
```bash
# Check if Node.js is installed
node -v        # need v18+

# If not installed — download from nodejs.org (LTS version)

# Install Firebase CLI
npm install -g firebase-tools

# Install Google Cloud CLI (for gsutil Storage copy)
# Download from: cloud.google.com/sdk/docs/install
gcloud --version
```

---

## STEP 1 — THEIR SYSTEM LOGIN

```bash
# Log Sachin into Firebase CLI (uses his Google account)
firebase login

# Confirm it's his account
firebase projects:list
```

---

## STEP 2 — CREATE NEW FIREBASE PROJECT

Do this in **Firebase Console** (console.firebase.google.com) logged in as Sachin:

1. Click **Add project**
2. Name it: `tadda` or `tadda-portal` (whatever he prefers)
3. Disable Google Analytics (not needed)
4. Click **Create project**

Note down the **Project ID** (e.g. `tadda-portal-xxxxx`) — you'll need it throughout.

```bash
# Set it as active project in CLI
firebase use <new-project-id>
```

### Enable services in Firebase Console:

**Authentication**
- Console → Authentication → Get started
- Enable: Google Sign-In + Email/Password

**Firestore**
- Console → Firestore → Create database
- Start in **production mode**
- Region: `asia-south1` (Mumbai — closest to India)

**Storage**
- Console → Storage → Get started
- Region: `asia-south1`
- Note: If auto-creation fails, create bucket manually via Google Cloud Console

**Hosting**
- Console → Hosting → Get started
- Add two sites:
  - `tadda-portal` (for the order portal)
  - `tadda-web` (for the marketing website)

---

## STEP 3 — APPLY FIRESTORE SECURITY RULES

In Firebase Console → Firestore → Rules, paste:

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
      allow create: if true;
      allow read, write: if request.auth != null && request.auth.token.email == 'parashar.sachin@gmail.com';
    }
    match /reg_index/{checkId} {
      allow read, write: if true;
    }
    match /mockups/{mockupId} {
      allow create: if request.auth != null;
      allow read, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.email == 'parashar.sachin@gmail.com';
    }
  }
}
```

**Apply Storage Rules** → Console → Storage → Rules:

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

---

## STEP 4 — EXPORT DATA FROM OLD PROJECT

```bash
# Add your account temporarily for export
firebase login:add
# (log in with your account — parashar.richa or whoever owns tadda-81f3e)

# Switch to old project
firebase use tadda-81f3e

# Export Firestore to old project's Storage bucket
firebase firestore:export gs://tadda-81f3e.firebasestorage.app/migration-export

# Export Auth users
firebase auth:export users-export.json --project tadda-81f3e

# Switch back to new project
firebase use <new-project-id>
```

---

## STEP 5 — COPY STORAGE FILES

```bash
# Log into gcloud with your account (for source bucket access)
gcloud auth login
# (log in as your account that owns tadda-81f3e)

# Copy all files from old bucket to new bucket
gsutil -m rsync -r \
  gs://tadda-81f3e.firebasestorage.app \
  gs://<new-project-id>.firebasestorage.app

# This copies: orders/, mockups/, products/ — everything
# -m flag = parallel copy (faster)
```

---

## STEP 6 — IMPORT FIRESTORE DATA

```bash
# Copy the export from old bucket to new bucket first
gsutil -m cp -r \
  gs://tadda-81f3e.firebasestorage.app/migration-export \
  gs://<new-project-id>.firebasestorage.app/migration-import

# Import into new Firestore
firebase firestore:import \
  gs://<new-project-id>.firebasestorage.app/migration-import \
  --project <new-project-id>
```

---

## STEP 7 — IMPORT AUTH USERS

```bash
firebase auth:import users-export.json \
  --hash-algo=SCRYPT \
  --project <new-project-id>
```

> Note: Google Sign-In users will re-link automatically when they log in for the first time on the new project. Their UID is preserved from the export so their orders/data remain linked.

---

## STEP 8 — FIX STORAGE URLs IN FIRESTORE

Storage URLs in all Firestore documents still point to `tadda-81f3e.firebasestorage.app`.
Run this Node.js script to rewrite them:

```bash
# Create fix-urls.js in the tadda/ directory
```

**fix-urls.js** — create this file and run it:

```js
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-new.json'); // download from new project

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: '<new-project-id>.firebasestorage.app'
});

const db = admin.firestore();
const OLD_BUCKET = 'tadda-81f3e.firebasestorage.app';
const NEW_BUCKET = '<new-project-id>.firebasestorage.app';

function replaceUrls(value) {
  if (typeof value === 'string') return value.replace(OLD_BUCKET, NEW_BUCKET);
  if (Array.isArray(value)) return value.map(replaceUrls);
  return value;
}

async function fixCollection(collectionName, urlFields) {
  console.log(`Fixing ${collectionName}...`);
  const snap = await db.collection(collectionName).get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const update = {};
    let changed = false;
    for (const field of urlFields) {
      if (data[field]) {
        const fixed = replaceUrls(data[field]);
        if (JSON.stringify(fixed) !== JSON.stringify(data[field])) {
          update[field] = fixed;
          changed = true;
        }
      }
    }
    if (changed) {
      await doc.ref.update(update);
      count++;
    }
  }
  console.log(`  Fixed ${count} docs in ${collectionName}`);
}

async function main() {
  await fixCollection('orders', [
    'designUrl', 'designUrls', 'mockupUrl', 'mockupUrls',
    'neckLabelUrl', 'shippingLabelUrl'
  ]);
  await fixCollection('mockups', ['imageUrl', 'blankUrl']);
  await fixCollection('products', ['photoUrls', 'frontUrl', 'backUrl', 'leftUrl', 'rightUrl']);
  console.log('Done. All Storage URLs updated.');
}

main().catch(console.error);
```

```bash
# Get service account key from Firebase Console:
# New project → Project Settings → Service Accounts → Generate new private key
# Save as service-account-new.json in tadda/ directory

# Install admin SDK
npm install firebase-admin

# Run the fix
node fix-urls.js
```

---

## STEP 9 — APPLY STORAGE CORS

```bash
# Log back in as Sachin's gcloud account
gcloud auth login
# (log in as Sachin's Google account)

gcloud config set project <new-project-id>

# Edit cors.json — update the origin URLs to new hosting URLs
# Then apply:
gsutil cors set cors.json gs://<new-project-id>.firebasestorage.app
```

**Updated cors.json** for new project:
```json
[
  {
    "origin": [
      "https://tadda-portal-xxxxx.web.app",
      "https://tadda-web-xxxxx.web.app",
      "http://localhost:5000"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

---

## STEP 10 — UPDATE CONFIG.JS

Get the new Firebase config from:
**Firebase Console → New project → Project Settings → Your apps → Add web app**

Create `tadda/public/js/config.js`:
```js
const firebaseConfig = {
  apiKey: "NEW_API_KEY",
  authDomain: "<new-project-id>.firebaseapp.com",
  projectId: "<new-project-id>",
  storageBucket: "<new-project-id>.firebasestorage.app",
  messagingSenderId: "NEW_SENDER_ID",
  appId: "NEW_APP_ID"
};
firebase.initializeApp(firebaseConfig);
window.ADMIN_EMAIL = 'parashar.sachin@gmail.com';
window.WEB3FORMS_KEY = '1c16ff01-bc48-4d2a-8671-23bf96569cf2';
```

Same file for `tadda-web/public/js/config.js`.

---

## STEP 11 — UPDATE FIREBASE.JSON & .FIREBASERC

**tadda/.firebaserc:**
```json
{
  "projects": {
    "default": "<new-project-id>"
  }
}
```

**tadda-web/.firebaserc:**
```json
{
  "projects": {
    "default": "<new-project-id>"
  }
}
```

Update hosting site names in `firebase.json` if the new hosting site names differ.

---

## STEP 12 — DEPLOY

```bash
# Deploy portal
cd tadda
firebase deploy --only hosting:tadda-portal

# Deploy marketing site
cd ../tadda-web
firebase deploy --only hosting:tadda-web
```

---

## STEP 13 — TESTING CHECKLIST

Go through each of these before leaving:

**Auth**
- [ ] Google Sign-In works
- [ ] Email/Password login works
- [ ] Sachin can log into admin panel

**Customer flow**
- [ ] Place a new order (fill form, upload design)
- [ ] Order appears in customer dashboard
- [ ] Order appears in admin dashboard

**Admin**
- [ ] Status update works
- [ ] Registrations tab loads
- [ ] Product Photos tab loads

**Storage**
- [ ] Old orders still show design file links (URL fix worked)
- [ ] New file upload works and file is accessible

**Marketing site**
- [ ] All sections load
- [ ] Registration form submits
- [ ] Contact form submits

---

## STEP 14 — CLEANUP & HANDOVER

```bash
# Log your account out of Firebase CLI on their machine
firebase logout

# Log your account out of gcloud
gcloud auth revoke <your-email>

# Confirm only Sachin's account remains
firebase login:list
gcloud auth list
```

**Delete temp files from their machine:**
- [ ] `users-export.json`
- [ ] `service-account-new.json`
- [ ] `fix-urls.js`

**Hand over to Sachin:**
- [ ] New portal URL
- [ ] New marketing site URL
- [ ] Firebase Console link (he's already the owner)
- [ ] Razorpay credentials setup reminder (if not done)
- [ ] Inform: to restrict future access → Firebase Console → Project Settings → Members → remove your email

---

## ROLLBACK PLAN

If anything goes wrong during migration:
- Old project `tadda-81f3e` is untouched throughout — it stays live
- Simply revert `config.js` to old credentials and redeploy
- No customer impact — old site keeps running until new site is confirmed working
- Keep old project alive for **4 weeks** after go-live before decommissioning

---

## TIME ESTIMATE ON-SITE

| Step | Time |
|------|------|
| System setup + Firebase project creation | 30 min |
| Firestore export + import | 30 min |
| Storage copy (depends on file size) | 30–60 min |
| URL fix script | 20 min |
| Config + deploy | 20 min |
| Testing | 45 min |
| Cleanup + handover | 15 min |
| **Total** | **~3 hours** |
