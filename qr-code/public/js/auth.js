// Authentication handling
const auth = firebase.auth();
// Note: db is declared in analytics.js (loaded before this file)
const provider = new firebase.auth.GoogleAuthProvider();

const loginSection   = document.getElementById('loginSection');
const appSection     = document.getElementById('appSection');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn      = document.getElementById('logoutBtn');
const userPhoto      = document.getElementById('userPhoto');
const userName       = document.getElementById('userName');

googleLoginBtn.addEventListener('click', async () => {
    try {
        googleLoginBtn.disabled = true;
        googleLoginBtn.innerHTML = 'Signing in...';
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to sign in. Please try again.');
        googleLoginBtn.disabled = false;
        googleLoginBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Sign in with Google`;
    }
});

logoutBtn.addEventListener('click', async () => {
    try { await auth.signOut(); } catch (e) { console.error(e); }
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        window.currentUser = user;
        showApp(user);
        trackLogin(user);
        fetchAndSaveLocation(user.uid);
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            const data = doc.exists ? doc.data() : {};
            const isProActive     = checkProExpiry(data.isProQR,      data.isProQRExpiresAt);
            const isBundleActive  = checkProExpiry(data.isProBundle,  data.isProBundleExpiresAt);
            window.userProData = {
                isProQR:     isProActive,
                isPro:       checkProExpiry(data.isPro, data.isProExpiresAt),
                isProBundle: isBundleActive
            };
            window.singlePurchases = Array.isArray(data.singlePurchases) ? data.singlePurchases : [];
            window.singlePurchaseCount = window.singlePurchases.length;
            const isQRPro = isProActive || isBundleActive;
            if (typeof applyQRProStatus === 'function') applyQRProStatus(isQRPro);
            showRenewalBanner(data, isQRPro);
        } catch (e) {
            window.userProData = { isProQR: false, isPro: false, isProBundle: false };
            if (typeof applyQRProStatus === 'function') applyQRProStatus(false);
        }
    } else {
        window.currentUser = null;
        showLogin();
    }
});

async function fetchAndSaveLocation(uid) {
    try {
        const resp = await fetch('https://ipapi.co/json/');
        if (!resp.ok) return;
        const geo = await resp.json();
        const city = geo.city || '';
        const country = geo.country_name || '';
        if (city || country) {
            await db.collection('users').doc(uid).set({ city, country }, { merge: true });
        }
    } catch (e) { /* silent fail */ }
}

// Returns true if pro flag is set AND not expired (no expiry = legacy one-time = keep active)
function checkProExpiry(flag, expiresAt) {
    if (!flag) return false;
    if (!expiresAt) return true; // legacy one-time purchase — no expiry
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return expiry > new Date();
}

function showRenewalBanner(data, isQRPro) {
    if (!isQRPro) return;
    const expiry = data.isProQRExpiresAt || data.isProBundleExpiresAt;
    if (!expiry) return; // legacy user, no banner needed
    const expiryDate = expiry.toDate ? expiry.toDate() : new Date(expiry);
    const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 30) return;
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#fef3c7;color:#92400e;text-align:center;padding:10px 16px;font-size:0.85rem;font-weight:600;';
    banner.innerHTML = `⚠️ Your Pro subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${expiryDate.toLocaleDateString()}). <a href="#" onclick="showQRUpgradeModal();return false;" style="color:#b45309;text-decoration:underline;">Renew now</a>`;
    document.body.prepend(banner);
}

function showApp(user) {
    loginSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    userPhoto.src = user.photoURL || 'https://via.placeholder.com/36';
    userName.textContent = user.displayName || 'User';
}

function showLogin() {
    loginSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    googleLoginBtn.disabled = false;
}
