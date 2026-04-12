const firebaseConfig = {
  apiKey: "AIzaSyD-gOlFfhmIZRbcLppAew6f_51fmDdSNBI",
  authDomain: "create-your-qr.firebaseapp.com",
  projectId: "create-your-qr",
  storageBucket: "create-your-qr.firebasestorage.app",
  messagingSenderId: "820217447050",
  appId: "1:820217447050:web:267f56620bca712a2aa373",
  measurementId: "G-187S5HBKCX"
};
firebase.initializeApp(firebaseConfig);

const EMAILJS_PUBLIC_KEY = "iwaJG-6o281bM60Dk";
const EMAILJS_SERVICE_ID = "service_ekkk58j";
const EMAILJS_TEMPLATE_ID = "template_pe1shlz";
emailjs.init(EMAILJS_PUBLIC_KEY);

window.GEMINI_API_KEY = 'AIzaSyDAU-okASaNp-Z5jmEBr5WsSlpuzwbRmqQ';
