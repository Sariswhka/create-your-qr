// Firebase configuration
// IMPORTANT: Replace these values with your own Firebase project config
// Get these from: Firebase Console > Project Settings > Your Apps > Web App

const firebaseConfig = {
  apiKey: "****",
  authDomain: "create-your-qr.firebaseapp.com",
  projectId: "create-your-qr",
  storageBucket: "create-your-qr.firebasestorage.app",
  messagingSenderId: "820217447050",
  appId: "******",
  measurementId: "G-187S5HBKCX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// EmailJS configuration
// IMPORTANT: Replace these with your EmailJS credentials
// Get these from: https://www.emailjs.com/
const EMAILJS_PUBLIC_KEY = "iwaJG-6o281bM60Dk";
const EMAILJS_SERVICE_ID = "service_ekkk58j";
const EMAILJS_TEMPLATE_ID = "template_pe1shlz";

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);
