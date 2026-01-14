# QR Code Generator - Setup Guide

Follow these steps to deploy your QR Code Generator with Google authentication.

## Prerequisites

- A Google account
- Node.js installed on your computer

## Step 1: Install Firebase CLI

Open your terminal and run:

```bash
npm install -g firebase-tools
```

## Step 2: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter a project name (e.g., "qr-code-generator")
4. Follow the prompts (you can disable Google Analytics if you want)
5. Wait for the project to be created

## Step 3: Enable Google Authentication

1. In Firebase Console, go to your project
2. Click "Authentication" in the left sidebar
3. Click "Get started"
4. In the "Sign-in method" tab, click "Google"
5. Toggle "Enable" on
6. Add your email as the project support email
7. Click "Save"

## Step 4: Register Your Web App

1. In Firebase Console, click the gear icon > "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Enter a nickname (e.g., "QR Generator Web")
5. Check "Also set up Firebase Hosting"
6. Click "Register app"
7. Copy the `firebaseConfig` object shown

## Step 5: Update Configuration

1. Open `public/js/config.js`
2. Replace the placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

## Step 6: Add Your Payment QR Code

1. Save your payment QR code image as `payment-qr.png`
2. Place it in the `public/images/` folder
3. The image should be square (recommended: 300x300 pixels)

## Step 7: Deploy to Firebase

Open terminal in your project folder and run:

```bash
# Login to Firebase
firebase login

# Initialize hosting (select your project)
firebase init hosting

# When prompted:
# - Select "Use an existing project" and choose your project
# - Public directory: public
# - Single-page app: Yes
# - Overwrite index.html: No

# Deploy
firebase deploy
```

## Step 8: Configure Authorized Domains

1. Go to Firebase Console > Authentication > Settings
2. Under "Authorized domains", your Firebase domain should already be added
3. If you have a custom domain, add it here

## Your Site is Live!

After deployment, Firebase will give you a URL like:
`https://your-project-id.web.app`

Share this URL with your users!

---

## Troubleshooting

### "auth/unauthorized-domain" Error
- Make sure your domain is added in Firebase Console > Authentication > Settings > Authorized domains

### Google Sign-in Popup Blocked
- Users need to allow popups for your site
- Or they can try a different browser

### Payment QR Not Showing
- Make sure the image is named exactly `payment-qr.png`
- Make sure it's in the `public/images/` folder
- Image formats supported: PNG, JPG, JPEG

---

## Customization

### Change Colors
Edit `public/css/style.css` - look for the gradient colors:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Change Title/Text
Edit `public/index.html` to modify any text content.
