# Create Your QR - Project Context

## Project Overview
A collection of three web tools hosted on Firebase:

| App | URL | Directory |
|-----|-----|-----------|
| QR Code Generator | https://create-your-qr.web.app | `/qr-code` |
| Image Resizer | https://imgtools.web.app | `C:\Users\Richa\OneDrive\Apps\Image Resizer` (standalone, not in this repo) |
| EMS Tools | https://emstools.web.app | `/ems-tools` |

## Repository
- **GitHub:** https://github.com/Sariswhka/create-your-qr
- **Auto-deploy:** GitHub Actions deploys to Firebase on push to `main`

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Auth:** Firebase Authentication (Google Sign-In)
- **Database:** Firebase Firestore (activity logging)
- **Hosting:** Firebase Hosting
- **Libraries:**
  - QRCode.js (QR generation)
  - Cropper.js (image cropping)
  - JSZip (file compression)

## Project Structure
```
create-your-qr/
├── .github/workflows/deploy.yml  # Auto-deployment
├── qr-code/
│   ├── firebase.json
│   └── public/
│       ├── index.html            # Main app (login + QR generator + WhatsApp QR)
│       ├── q.html                # WhatsApp QR landing page (PIN screen, Request Access)
│       ├── admin.html            # Owner-only analytics dashboard
│       ├── privacy.html          # Privacy Policy page
│       ├── css/style.css
│       └── js/
│           ├── app.js            # URL QR generation logic
│           ├── auth.js           # Firebase auth
│           ├── analytics.js      # Firestore activity logging
│           ├── whatsapp-qr.js    # WhatsApp QR create/edit/delete + How It Works
│           └── config.js         # Firebase config (excluded from git)
├── ems-tools/
│   ├── firebase.json
│   └── public/
│       ├── index.html
│       ├── docs.html
│       ├── css/style.css
│       └── js/app.js, auth.js, config.js
└── README.md
```

## QR Code App — Instrumentation (Firestore)

### Collections
| Collection | Description |
|------------|-------------|
| `/users/{uid}` | One doc per user — email, displayName, photoURL, firstSeen, lastSeen, loginCount |
| `/events/{auto-id}` | One doc per action — type, userId, userEmail, timestamp, url, color, frame |
| `/qr_codes/{id}` | One doc per WhatsApp QR — userId, userEmail, name, phone, message, pin, imageUrl, scans, createdAt, updatedAt |

### Event Types
- `login` — user signed in
- `generate_qr` — QR code generated (includes url, color, frame)
- `download_qr` — QR code downloaded (includes url)
- `email_qr` — QR code emailed (includes url)

### Key Files
- `js/analytics.js` — `trackLogin()`, `trackQRGenerated()`, `trackQRDownloaded()`, `trackQREmailed()`
- `js/auth.js` — calls `trackLogin(user)` on every auth state change
- `js/app.js` — calls track functions after each user action
- `js/whatsapp-qr.js` — WhatsApp QR CRUD, pro gating, how-it-works toggle
- `q.html` — public landing page for WhatsApp QR links; handles PIN screen, Request Access, scan counter

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /events/{eventId} {
      allow write: if request.auth != null;
    }
    match /{document=**} {
      allow read: if request.auth != null && request.auth.token.email == 'parashar.sachin@gmail.com';
    }
  }
}
```

## WhatsApp QR Feature

### How it works
1. Logged-in user fills in name, phone, message (+ optional PIN and image for Pro)
2. A doc is saved to `/qr_codes/{id}` and a QR is generated pointing to `https://create-your-qr.web.app/q/{id}`
3. Anyone scanning the QR lands on `q.html` which loads the doc from Firestore
4. If `pin` is set, a PIN screen is shown — wrong PIN shows an error; no PIN shows a **Request Access** button
5. **Request Access** opens a pre-filled `mailto:` to `data.userEmail` so the visitor can ask the creator for the PIN
6. On successful unlock (or no PIN), the WhatsApp message page is shown and scan count is incremented

### Pro gating (WhatsApp QR)
| Feature | Free | Pro |
|---------|------|-----|
| WhatsApp QR codes | Max 2 | Unlimited |
| PIN protection | — | ✅ |
| Image attachment | — | ✅ |
| Text formatting toolbar | — | ✅ |

### Landing page URL pattern
- `https://create-your-qr.web.app/q/{id}` — served by `q.html` via Firebase rewrite rule

## Admin Dashboard
- **URL:** https://create-your-qr.web.app/admin.html
- **Access:** Restricted to `parashar.sachin@gmail.com` only
- **Shows:** Total users, QR generated, downloads, emails sent, total logins
- **Tables:** User list (with firstSeen/lastSeen/loginCount) + filterable events feed (last 500)

## Google AdSense
- **Publisher ID:** `ca-pub-5537089551995149`
- **Status:** Submitted for review (March 2026) — awaiting approval
- **Script added to:** `qr-code/public/index.html` `<head>`
- **Next step:** Once approved, add ad unit code to index.html in best placement spots
- **Privacy Policy:** https://create-your-qr.web.app/privacy.html (required for AdSense)

## EMS Tools Features
1. **TL1 Parser/Builder** - Parse and build TL1 commands
2. **Alarm Mapper** - Map EMS alarms to OSS format
3. **Payload Transformer** - Convert JSON/XML/CSV/YAML
4. **SNMP OID Browser** - Decode OIDs, parse SNMP walks
5. **NETCONF/XML Tools** - XML validation, XPath testing
6. **YANG Parser** - Parse, compare, tree-view YANG modules
7. **XML Modifier** - Batch XML edits via Excel/CSV operations file
8. **Config Compare** - Side-by-side config diff
9. **E2E Integration Generator** - 4-phase wizard

## Deployment Workflow
```bash
# Manual deploy (from app subdirectory)
cd qr-code && firebase deploy --only hosting:create-your-qr
cd ems-tools && firebase deploy --only hosting:emstools

# Image Resizer (standalone — separate directory, not in this repo)
cd "C:/Users/Richa/OneDrive/Apps/Image Resizer" && firebase deploy --only hosting:imgtools

# Or commit and push for auto-deploy via GitHub Actions
git add .
git commit -m "Description"
git push origin main
```

## Firebase Projects
- Project ID: `create-your-qr`
- Hosting sites: `create-your-qr`, `imgtools`, `emstools`

## Local Development Paths
- EMS Tools standalone: `C:\Users\Richa\OneDrive\Apps\EMS Tools\`
- Git repo (all apps): `C:\Users\Richa\OneDrive\Apps\create-your-qr\`

## Notes
- `config.js` files contain Firebase API keys — excluded from git via `.gitignore`
- Admin email: `parashar.sachin@gmail.com`
- Google Analytics ID (QR app): `G-187S5HBKCX`
