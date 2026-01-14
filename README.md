# Create Your QR - Web Tools Suite

A collection of free, privacy-focused web tools for everyday tasks. All processing happens in your browser - your data never leaves your device.

## Projects

### 1. QR Code Generator
**Live:** [create-your-qr.web.app](https://create-your-qr.web.app)

Generate QR codes for URLs, text, WiFi credentials, vCards, and more. Features include:
- Multiple QR code types (URL, Text, WiFi, vCard, Email, Phone, SMS)
- Customizable colors and sizes
- Logo embedding
- Download as PNG/SVG

### 2. Image Resizer
**Live:** [imageresizer-online.web.app](https://imageresizer-online.web.app)

Resize, crop, and compress images online. Features include:
- Resize by dimensions or percentage
- Crop with aspect ratio presets
- Quality compression
- AI background removal
- Support for JPG, PNG, WEBP, GIF

### 3. EMS Tools
**Live:** [emstools.web.app](https://emstools.web.app)

Enterprise Management System toolkit for telecom and network professionals. Features include:
- EMS Script Generator
- Bulk Operations Generator
- JSON/XML Converter
- NETCONF/XML Tools
- E2E Integration Solution Generator

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Authentication:** Firebase Auth (Google Sign-In)
- **Hosting:** Firebase Hosting
- **Libraries:**
  - QRCode.js - QR code generation
  - Cropper.js - Image cropping
  - Mermaid.js - Diagram rendering
  - JSZip - File compression

## Project Structure

```
create-your-qr/
├── qr-code/           # QR Code Generator
│   ├── public/
│   │   ├── css/
│   │   ├── js/
│   │   └── index.html
│   └── firebase.json
├── image-resizer/     # Image Resizer
│   ├── public/
│   │   ├── css/
│   │   ├── js/
│   │   └── index.html
│   └── firebase.json
├── ems-tools/         # EMS Tools
│   ├── public/
│   │   ├── css/
│   │   ├── js/
│   │   ├── index.html
│   │   └── docs.html
│   └── firebase.json
└── README.md
```

## Setup

Each project requires Firebase configuration:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Google Authentication
3. Create `public/js/config.js` in each project with your Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Deployment

Each project deploys independently to Firebase Hosting:

```bash
cd qr-code && firebase deploy
cd image-resizer && firebase deploy
cd ems-tools && firebase deploy
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use these tools for personal or commercial purposes.

## Privacy

All tools are designed with privacy in mind:
- No server-side processing
- No data storage
- All operations happen in your browser
- Authentication is only used to prevent abuse

---

Made with care by [Create Your QR](https://create-your-qr.web.app)
