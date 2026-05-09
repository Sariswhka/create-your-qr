// Authentication handling
const auth = firebase.auth();
const db   = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// DOM Elements
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');

// Google Sign In
googleLoginBtn.addEventListener('click', async () => {
    try {
        googleLoginBtn.disabled = true;
        googleLoginBtn.innerHTML = 'Signing in...';

        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to sign in. Please try again.');
        googleLoginBtn.disabled = false;
        googleLoginBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
        `;
    }
});

// ── Email Auth ─────────────────────────────────────────────
let authMode = 'signin'; // 'signin' | 'signup'

const signInToggle  = document.getElementById('signInToggle');
const signUpToggle  = document.getElementById('signUpToggle');
const emailAuthBtn  = document.getElementById('emailAuthBtn');
const authError     = document.getElementById('authError');
const authSuccess   = document.getElementById('authSuccess');

signInToggle.addEventListener('click', () => {
    authMode = 'signin';
    signInToggle.classList.add('active');
    signUpToggle.classList.remove('active');
    emailAuthBtn.textContent = 'Sign In';
    document.getElementById('nameField').classList.add('hidden');
    document.getElementById('forgotPasswordLink').classList.remove('hidden');
    clearAuthMessages();
});

signUpToggle.addEventListener('click', () => {
    authMode = 'signup';
    signUpToggle.classList.add('active');
    signInToggle.classList.remove('active');
    emailAuthBtn.textContent = 'Create Account';
    document.getElementById('nameField').classList.remove('hidden');
    document.getElementById('forgotPasswordLink').classList.add('hidden');
    clearAuthMessages();
});

emailAuthBtn.addEventListener('click', async () => {
    const email    = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name     = document.getElementById('authName').value.trim();

    if (!email || !password) { showAuthError('Please enter email and password.'); return; }
    if (authMode === 'signup' && password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

    emailAuthBtn.disabled = true;
    emailAuthBtn.textContent = authMode === 'signup' ? 'Creating account...' : 'Signing in...';
    clearAuthMessages();

    try {
        if (authMode === 'signup') {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            if (name) await cred.user.updateProfile({ displayName: name });
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }
    } catch(e) {
        showAuthError(friendlyAuthError(e.code));
        emailAuthBtn.disabled = false;
        emailAuthBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
    }
});

document.getElementById('forgotPassword').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    if (!email) { showAuthError('Enter your email address above first.'); return; }
    try {
        await auth.sendPasswordResetEmail(email);
        showAuthSuccess('Password reset email sent — check your inbox.');
    } catch(e) {
        showAuthError(friendlyAuthError(e.code));
    }
});

function showAuthError(msg) {
    authError.textContent = msg;
    authError.classList.remove('hidden');
    authSuccess.classList.add('hidden');
}

function showAuthSuccess(msg) {
    authSuccess.textContent = msg;
    authSuccess.classList.remove('hidden');
    authError.classList.add('hidden');
}

function clearAuthMessages() {
    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');
}

function friendlyAuthError(code) {
    const map = {
        'auth/user-not-found':       'No account found with this email.',
        'auth/wrong-password':       'Incorrect password. Try again.',
        'auth/email-already-in-use': 'This email is already registered. Sign in instead.',
        'auth/invalid-email':        'Please enter a valid email address.',
        'auth/weak-password':        'Password must be at least 6 characters.',
        'auth/too-many-requests':    'Too many attempts. Please try again later.',
        'auth/invalid-credential':   'Incorrect email or password.',
    };
    return map[code] || 'Something went wrong. Please try again.';
}

// ── Logout ─────────────────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Auth state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        window.currentUser = user;
        showApp(user);
        try {
            const ref = db.collection('users').doc(user.uid);
            const doc = await ref.get();
            const data = doc.exists ? doc.data() : {};

            // Start trial on first login if not already set
            if (!data.trialStartedAt) {
                await ref.set({ trialStartedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
                data.trialStartedAt = new Date();
            }

            // Calculate trial status
            const trialStart   = data.trialStartedAt?.toDate ? data.trialStartedAt.toDate() : new Date(data.trialStartedAt);
            const daysElapsed  = (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
            const trialDaysLeft = Math.max(0, Math.ceil(15 - daysElapsed));
            window.isOnTrial   = trialDaysLeft > 0;
            window.trialDaysLeft = trialDaysLeft;

            // Pro status
            const isImgProActive = checkProExpiry(data.isPro,       data.isProExpiresAt);
            const isBundleActive = checkProExpiry(data.isProBundle, data.isProBundleExpiresAt);
            window.userProData = {
                isProQR:     checkProExpiry(data.isProQR, data.isProQRExpiresAt),
                isPro:       isImgProActive,
                isProBundle: isBundleActive
            };

            const isPro = isImgProActive || isBundleActive;
            if (typeof applyProStatus === 'function') applyProStatus(isPro);
            showRenewalBanner(data, isPro);
            showTrialBanner(isPro, trialDaysLeft);

        } catch (e) {
            window.userProData = { isProQR: false, isPro: false, isProBundle: false };
            window.isOnTrial   = false;
            window.trialDaysLeft = 0;
            if (typeof applyProStatus === 'function') applyProStatus(false);
        }
    } else {
        window.currentUser = null;
        showLogin();
    }
});

function checkProExpiry(flag, expiresAt) {
    if (!flag) return false;
    if (!expiresAt) return true;
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return expiry > new Date();
}

function showTrialBanner(isPro, trialDaysLeft) {
    if (isPro || trialDaysLeft <= 0) return;
    const existing = document.getElementById('trialBanner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'trialBanner';
    banner.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-align:center;padding:10px 16px;font-size:0.85rem;font-weight:600;';
    banner.innerHTML = `🎉 Free Pro Trial — <strong>${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining</strong> · All Pro features unlocked · No credit card needed · <a href="#" onclick="showUpgradeModal();return false;" style="color:#d1fae5;text-decoration:underline;">Upgrade to keep access</a>`;
    document.body.prepend(banner);
}

function showRenewalBanner(data, isPro) {
    if (!isPro) return;
    const expiry = data.isProExpiresAt || data.isProBundleExpiresAt;
    if (!expiry) return;
    const expiryDate = expiry.toDate ? expiry.toDate() : new Date(expiry);
    const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 30) return;
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#fef3c7;color:#92400e;text-align:center;padding:10px 16px;font-size:0.85rem;font-weight:600;';
    banner.innerHTML = `⚠️ Your Pro subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${expiryDate.toLocaleDateString()}). <a href="#" onclick="showUpgradeModal();return false;" style="color:#b45309;text-decoration:underline;">Renew now</a>`;
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
