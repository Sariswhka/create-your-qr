# Create Your QR - Project Context

## Project Overview
A collection of three privacy-focused web tools hosted on Firebase:

| App | URL | Directory |
|-----|-----|-----------|
| QR Code Generator | https://create-your-qr.web.app | `/qr-code` |
| Image Resizer | https://imageresizer-online.web.app | `/image-resizer` |
| EMS Tools | https://emstools.web.app | `/ems-tools` |

## Repository
- **GitHub:** https://github.com/Sariswhka/create-your-qr
- **Auto-deploy:** GitHub Actions deploys to Firebase on push to `main`

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Auth:** Firebase Authentication (Google Sign-In)
- **Hosting:** Firebase Hosting
- **Libraries:**
  - QRCode.js (QR generation)
  - Cropper.js (image cropping)
  - Mermaid.js (diagrams in EMS Tools)
  - JSZip (file compression)

## Project Structure
```
create-your-qr/
├── .github/workflows/deploy.yml  # Auto-deployment
├── qr-code/
│   ├── firebase.json
│   └── public/
│       ├── index.html
│       ├── css/style.css
│       └── js/app.js, auth.js, config.js
├── image-resizer/
│   ├── firebase.json
│   └── public/
│       ├── index.html
│       ├── css/style.css
│       └── js/app.js, auth.js, config.js
├── ems-tools/
│   ├── firebase.json
│   └── public/
│       ├── index.html
│       ├── docs.html
│       ├── css/style.css
│       └── js/app.js, auth.js, config.js
└── README.md
```

## EMS Tools Features
1. **TL1 Parser/Builder** - Parse and build TL1 commands
2. **Alarm Mapper** - Map EMS alarms to OSS format
3. **Payload Transformer** - Convert JSON/XML/CSV/YAML
4. **SNMP OID Browser** - Decode OIDs, parse SNMP walks
5. **NETCONF/XML Tools** - XML validation, XPath testing
6. **E2E Integration Generator** - 4-phase wizard:
   - Phase 1: Requirements (project, source, dest, mapping, rules, technical)
   - Phase 2: Design (auto-generated diagrams)
   - Phase 3: Development (code artifacts)
   - Phase 4: Execution (deployment scripts)

## E2E Generator Validation
- **Errors (block progression):** Project name, source/dest schema, mappings required
- **Warnings (allow progression):** No business rules, no security options
- **Auto-trim:** All text fields trim whitespace on blur

## Deployment Workflow
```bash
# Make changes locally
cd /path/to/create-your-qr

# Commit and push (auto-deploys via GitHub Actions)
git add .
git commit -m "Description"
git push origin main

# Or manual deploy
cd ems-tools && firebase deploy
```

## Key Files
- `ems-tools/public/js/app.js` - Main application logic (~3000 lines)
- `ems-tools/public/docs.html` - User documentation
- `.github/workflows/deploy.yml` - CI/CD pipeline

## Firebase Projects
- Project ID: `create-your-qr`
- Hosting sites: `create-your-qr`, `imageresizer-online`, `emstools`

## Local Development Paths
- Original: `C:\Users\Richa\OneDrive\Apps\EMS Tools\`
- Git repo: `C:\Users\Richa\OneDrive\Apps\create-your-qr\`

## Notes
- `config.js` files contain Firebase API keys - excluded from git via `.gitignore`
- All processing happens client-side (privacy-first design)
- No backend/database required
