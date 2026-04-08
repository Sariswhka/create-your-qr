// QR Code Generator Logic
let qrcode = null;
let currentUser = null;
let currentQRUrl = null;
let selectedColor = '#000000';
let selectedBgColor = '#ffffff';
let selectedDarkBgActive = false;
let invertColors = false;
let selectedFrame = 'none';
let isQRPro = false;
let logoDataUrl = null;

// Single-purchase state
window.hasPaidSession = false;
let pendingDownloadFn = null;
let pendingWQRId = null;

const RAZORPAY_KEY = 'rzp_live_frEA3PTBCni695';

// Listen for auth state changes
firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
});

// ── Pro status ─────────────────────────────────────────────
function applyQRProStatus(status) {
    isQRPro = status;
    const badge = document.getElementById('qrProBadge');
    const upBtn = document.getElementById('qrUpgradeBtn');
    if (badge) badge.classList.toggle('hidden', !isQRPro);
    if (upBtn) upBtn.classList.toggle('hidden', isQRPro);

    // Remove blur if pro
    if (isQRPro) {
        document.getElementById('qrFrameWrapper')?.classList.remove('qr-blurred');
        document.getElementById('qrLockOverlay')?.classList.add('hidden');
    }

    // All pro features are open to everyone — only download is paywalled
    document.querySelectorAll('.color-btn.pro-color').forEach(btn => { btn.disabled = false; });
    document.getElementById('colorProLock')?.classList.add('hidden');
    document.getElementById('logoProLock')?.classList.add('hidden');
    const logoInput = document.getElementById('logoUploadInput');
    if (logoInput) logoInput.disabled = false;

    // WhatsApp QR features — delegate if whatsapp-qr.js is loaded
    if (typeof lockProWQFeatures === 'function') lockProWQFeatures();
}

// ── Bundle discount helpers ────────────────────────────────
function getBundleAmountQR() {
    const d = window.userProData || {};
    if (d.isProQR) return 9900 - 4900; // already paid ₹49
    if (d.isPro)   return 9900 - 8900; // already paid ₹89
    return 9900;
}
function getBundleLabelQR() {
    const d = window.userProData || {};
    if (d.isProQR) return { price: '₹50', desc: 'You already have QR Pro — pay just ₹50 more for the bundle' };
    if (d.isPro)   return { price: '₹10', desc: 'You already have Image Resizer Pro — pay just ₹10 more for the bundle' };
    return { price: '₹99', desc: '/year · save ₹38' };
}

// ── Upgrade modal ──────────────────────────────────────────
function showQRUpgradeModal() {
    // Update bundle card with discounted price if applicable
    const { price, desc } = getBundleLabelQR();
    const priceEl = document.getElementById('bundlePriceQR');
    const descEl  = document.getElementById('bundleDescQR');
    const btnEl   = document.getElementById('bundleBtnQR');
    if (priceEl) priceEl.textContent = price;
    if (descEl)  descEl.textContent  = desc;
    if (btnEl)   btnEl.textContent   = `Get Bundle — ${price}`;
    document.getElementById('qrUpgradeModal').classList.remove('hidden');
}

// Attach modal listeners after DOM is fully ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('qrUpgradeBtn')?.addEventListener('click', showQRUpgradeModal);
    document.getElementById('closeQRUpgradeModal')?.addEventListener('click', () => {
        document.getElementById('qrUpgradeModal').classList.add('hidden');
    });
    document.getElementById('qrUpgradeModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('qrUpgradeModal'))
            document.getElementById('qrUpgradeModal').classList.add('hidden');
    });
    document.getElementById('closeDownloadModal')?.addEventListener('click', () => {
        document.getElementById('downloadModal').classList.add('hidden');
    });
    document.getElementById('downloadModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('downloadModal'))
            document.getElementById('downloadModal').classList.add('hidden');
    });
});

// ── Razorpay payments ──────────────────────────────────────
function startPayment(plan) {
    const user = window.currentUser;
    if (!user) return;

    const plans = {
        qr:      { amount: 4900,  name: 'QR Generator Pro',      desc: 'QR Generator Pro — ₹49/year',               cb: 'https://create-your-qr.web.app/?rzp_success=qr' },
        bundle:  { amount: getBundleAmountQR(), name: 'Pro Bundle (Both Apps)', desc: 'QR + Image Resizer Pro Bundle — ₹99/year', cb: 'https://create-your-qr.web.app/?rzp_success=bundle' },
        imgtools:{ amount: 8900,  name: 'Image Resizer Pro',      desc: 'Image Resizer Pro — ₹89/year',    cb: 'https://create-your-qr.web.app/?rzp_success=imgtools' }
    };

    const p = plans[plan];
    if (!p) return;

    const options = {
        key: RAZORPAY_KEY,
        amount: p.amount,
        currency: 'INR',
        name: p.name,
        description: p.desc,
        callback_url: p.cb,
        redirect: true,
        handler: async (response) => { await saveQRProAndUnlock(plan, response.razorpay_payment_id); },
        prefill: { name: user.displayName || '', email: user.email || '' },
        theme: { color: '#667eea' },
        modal: { ondismiss: function() {} }
    };
    new Razorpay(options).open();
}

async function saveQRProAndUnlock(plan, paymentId) {
    const user = window.currentUser;
    if (!user) return;
    try {
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        const update = {
            email: user.email,
            displayName: user.displayName,
            proPaymentId: paymentId || 'redirect_flow',
            proUpgradeDate: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (plan === 'qr')       { update.isProQR      = true; update.isProQRExpiresAt      = expiresAt; }
        if (plan === 'bundle')   { update.isProBundle   = true; update.isProBundleExpiresAt  = expiresAt; }
        if (plan === 'imgtools') { update.isPro         = true; update.isProExpiresAt        = expiresAt; }

        await db.collection('users').doc(user.uid).set(update, { merge: true });
    } catch (e) { console.error('Firestore write error:', e); }

    document.getElementById('qrUpgradeModal').classList.add('hidden');

    if (plan === 'qr' || plan === 'bundle') applyQRProStatus(true);

    const toast = document.getElementById('qrProToast');
    if (toast) {
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    }
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Handle redirect flow
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('rzp_success');
    if (success) {
        const waitForUser = setInterval(() => {
            if (window.currentUser) {
                clearInterval(waitForUser);
                saveQRProAndUnlock(success, params.get('razorpay_payment_id') || 'redirect_flow');
            }
        }, 300);
    }
});

// ── Color selection ────────────────────────────────────────
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = btn.dataset.color;
        if (btn.dataset.bgColor) {
            selectedBgColor = btn.dataset.bgColor;
            selectedDarkBgActive = true;
            const fgPicker = document.getElementById('customColorFg');
            const bgPicker = document.getElementById('customColorBg');
            if (fgPicker) fgPicker.value = selectedColor;
            if (bgPicker) bgPicker.value = selectedBgColor;
        } else {
            selectedDarkBgActive = false;
            selectedBgColor = '#ffffff';
        }
    });
});

// Custom color picker
document.getElementById('customColorFg')?.addEventListener('input', (e) => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    selectedColor = e.target.value;
    selectedDarkBgActive = false;
});

document.getElementById('customColorBg')?.addEventListener('input', (e) => {
    selectedBgColor = e.target.value;
});

// Frame selection
document.querySelectorAll('.frame-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.frame-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFrame = btn.dataset.frame;
        const msgGroup = document.getElementById('frameMsgGroup');
        if (msgGroup) msgGroup.classList.toggle('hidden', selectedFrame === 'none');
    });
});

// Invert toggle
function toggleInvert() {
    invertColors = !invertColors;
    const btn = document.getElementById('invertBtn');
    if (btn) btn.classList.toggle('invert-active', invertColors);
}

// Logo upload
document.getElementById('logoUploadInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        logoDataUrl = ev.target.result;
        document.getElementById('logoPreview').src = logoDataUrl;
        document.getElementById('logoPreviewWrap').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

document.getElementById('logoRemoveBtn')?.addEventListener('click', () => {
    logoDataUrl = null;
    document.getElementById('logoUploadInput').value = '';
    document.getElementById('logoPreviewWrap').classList.add('hidden');
});

// ── URL validation ─────────────────────────────────────────
function isValidURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) { return false; }
}

// ── Generate QR ────────────────────────────────────────────
function generateQR() {
    const urlInput     = document.getElementById('urlInput');
    const qrContainer  = document.getElementById('qrContainer');
    const qrcodeDiv    = document.getElementById('qrcode');
    const errorMessage = document.getElementById('errorMessage');
    const urlDisplay   = document.getElementById('urlDisplay');
    const emailStatus  = document.getElementById('emailStatus');
    const qrFrame      = document.getElementById('qrFrame');
    const frameTextTop    = document.getElementById('frameTextTop');
    const frameTextBottom = document.getElementById('frameTextBottom');

    let url = urlInput.value.trim();
    if (url && !url.match(/^https?:\/\//i)) { url = 'https://' + url; urlInput.value = url; }
    if (!url || !isValidURL(url)) {
        errorMessage.style.display = 'block';
        qrContainer.classList.remove('active');
        return;
    }

    errorMessage.style.display = 'none';
    emailStatus.textContent = '';
    emailStatus.className = 'email-status';
    qrcodeDiv.innerHTML = '';

    // Dark bg presets apply for all users; custom picker only for Pro
    let resolvedFg = selectedColor;
    let resolvedBg = selectedDarkBgActive ? selectedBgColor : selectedBgColor;
    if (invertColors) { const tmp = resolvedFg; resolvedFg = resolvedBg; resolvedBg = tmp; }
    const bgColor = resolvedBg;

    qrcode = new QRCode(qrcodeDiv, {
        text: url,
        width: 200,
        height: 200,
        colorDark:  resolvedFg,
        colorLight: resolvedBg,
        correctLevel: QRCode.CorrectLevel.H
    });

    // Apply logo overlay after QR renders (open to all)
    if (logoDataUrl) {
        setTimeout(() => applyLogoToQR(qrcodeDiv, logoDataUrl), 300);
    }

    // Apply bg to frame wrapper
    const qrFrameWrapper = document.getElementById('qrFrameWrapper');
    qrFrameWrapper.style.background = bgColor;
    qrFrameWrapper.style.borderRadius = '12px';
    qrFrameWrapper.style.padding = bgColor !== '#ffffff' ? '12px' : '';

    // Custom frame message (open to all)
    const customMsg = document.getElementById('frameMsgText')?.value.trim() || '';
    const msgPos    = document.getElementById('frameMsgPos')?.value || 'bottom';

    // Frame
    qrFrame.className = 'qr-frame';
    qrFrame.style.borderColor = selectedColor;
    frameTextTop.style.color = selectedColor;
    frameTextBottom.style.color = selectedColor;
    frameTextTop.textContent = '';
    frameTextBottom.textContent = '';

    if (customMsg && selectedFrame !== 'none') {
        qrFrame.classList.add('has-frame');
        if (msgPos === 'top')    frameTextTop.textContent = customMsg;
        if (msgPos === 'bottom') frameTextBottom.textContent = customMsg;
    } else {
        switch(selectedFrame) {
            case 'scan-me':   qrFrame.classList.add('has-frame'); frameTextTop.textContent = 'SCAN ME'; break;
            case 'scan-here': qrFrame.classList.add('has-frame'); frameTextBottom.textContent = 'SCAN HERE'; break;
            case 'point':     qrFrame.classList.add('has-frame', 'point-style'); break;
        }
    }

    currentQRUrl = url;
    qrContainer.classList.add('active');
    urlDisplay.textContent = url;

    // Blur QR preview for non-pro users
    const lockOverlay = document.getElementById('qrLockOverlay');
    if (!isQRPro) {
        qrFrameWrapper.classList.add('qr-blurred');
        if (lockOverlay) lockOverlay.classList.remove('hidden');
    } else {
        qrFrameWrapper.classList.remove('qr-blurred');
        if (lockOverlay) lockOverlay.classList.add('hidden');
    }

    gtag('event', 'generate_qr', { event_category: 'QR Code', event_label: url, color: selectedColor, frame: selectedFrame });
    if (currentUser) trackQRGenerated(currentUser, url, selectedColor, selectedFrame);
}

function applyLogoToQR(container, logoSrc, attempt = 0) {
    const canvas = container.querySelector('canvas');
    if (!canvas) {
        if (attempt < 5) setTimeout(() => applyLogoToQR(container, logoSrc, attempt + 1), 100);
        return;
    }
    const ctx  = canvas.getContext('2d');
    const size = canvas.width;
    const logoImg = new Image();
    logoImg.onload = () => {
        const logoSize = size * 0.22;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x - 4, y - 4, logoSize + 8, logoSize + 8, 6);
        } else {
            ctx.rect(x - 4, y - 4, logoSize + 8, logoSize + 8);
        }
        ctx.fill();
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
        // Update the display img if QRCode.js created one
        const displayImg = container.querySelector('img');
        if (displayImg) displayImg.src = canvas.toDataURL('image/png');
    };
    logoImg.src = logoSrc;
}

// ── Download ───────────────────────────────────────────────
function downloadQR() {
    if (!currentQRUrl) return;
    if (isQRPro || window.hasPaidSession) {
        doDownloadQR();
        return;
    }
    pendingDownloadFn = () => doDownloadQR();
    pendingWQRId = null;
    showDownloadModal();
}

function doDownloadQR() {
    const qrFrameWrapper = document.getElementById('qrFrameWrapper');
    const scale = isQRPro ? 4 : 2;

    if (typeof html2canvas !== 'undefined') {
        html2canvas(qrFrameWrapper, { backgroundColor: null, scale }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            gtag('event', 'download_qr', { event_category: 'QR Code', event_label: currentQRUrl });
            if (currentUser) trackQRDownloaded(currentUser, currentQRUrl);
        });
    } else {
        const canvas = document.querySelector('#qrcode canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            if (currentUser) trackQRDownloaded(currentUser, currentQRUrl);
        }
    }
}

// ── Download modal ─────────────────────────────────────────
function showDownloadModal() {
    const count = window.singlePurchaseCount || 0;
    const progressEl = document.getElementById('singlePurchaseProgress');
    if (progressEl) {
        progressEl.textContent = count > 0
            ? `${count}/5 purchases made — ${5 - count} more for auto Pro`
            : '5 purchases automatically upgrades to Pro';
    }
    document.getElementById('downloadModal').classList.remove('hidden');
}

// ── Single QR payment (₹10) ────────────────────────────────
function startSingleQRPayment() {
    const user = window.currentUser;
    if (!user) return;
    const options = {
        key: RAZORPAY_KEY,
        amount: 1000,
        currency: 'INR',
        name: 'Single QR Download',
        description: 'Download this QR code — ₹10',
        redirect: false,
        handler: async (response) => {
            await saveSinglePurchase(response.razorpay_payment_id, pendingWQRId);
            document.getElementById('downloadModal').classList.add('hidden');
            if (pendingDownloadFn) { pendingDownloadFn(); pendingDownloadFn = null; }
        },
        prefill: { name: user.displayName || '', email: user.email || '' },
        theme: { color: '#667eea' },
        modal: { ondismiss: function() {} }
    };
    new Razorpay(options).open();
}

async function saveSinglePurchase(paymentId, qrId) {
    const user = window.currentUser;
    if (!user) return;
    try {
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        const data = userDoc.exists ? userDoc.data() : {};
        const purchases = Array.isArray(data.singlePurchases) ? [...data.singlePurchases] : [];
        purchases.push({ date: new Date(), paymentId, qrId: qrId || null });

        const update = { singlePurchases: purchases };

        // Auto-upgrade at 5th purchase (only if not already pro)
        if (purchases.length >= 5 && !checkProExpiry(data.isProQR, data.isProQRExpiresAt) && !checkProExpiry(data.isProBundle, data.isProBundleExpiresAt)) {
            const thirdDate = purchases[2].date instanceof Date ? purchases[2].date : new Date(purchases[2].date);
            update.isProQR = true;
            update.isProQRExpiresAt = new Date(thirdDate.getTime() + 365 * 24 * 60 * 60 * 1000);
            update.proPaymentId = paymentId;
            update.proUpgradeDate = firebase.firestore.FieldValue.serverTimestamp();
        }

        await userRef.set(update, { merge: true });

        // Mark WhatsApp QR as paid if applicable
        if (qrId) {
            await db.collection('qr_codes').doc(qrId).set({ paidDownload: true }, { merge: true });
        }

        window.hasPaidSession = true;
        window.singlePurchaseCount = purchases.length;
        window.singlePurchases = purchases;

        // Apply pro if auto-upgraded
        if (purchases.length >= 5) {
            applyQRProStatus(true);
            const toast = document.getElementById('qrProToast');
            if (toast) {
                toast.textContent = '🎉 You\'ve auto-upgraded to Pro! All features unlocked.';
                toast.classList.remove('hidden');
                setTimeout(() => { toast.textContent = '🎉 You\'re now a Pro user! All features unlocked.'; toast.classList.add('hidden'); }, 5000);
            }
        }
    } catch (e) { console.error('Error saving single purchase:', e); }
}

// ── Send to email ──────────────────────────────────────────
async function sendToEmail() {
    if (!currentUser) { alert('Please sign in to send QR code to email'); return; }
    const emailBtn    = document.getElementById('emailBtn');
    const emailStatus = document.getElementById('emailStatus');
    const qrFrameWrapper = document.getElementById('qrFrameWrapper');

    if (!currentQRUrl) {
        emailStatus.textContent = 'Please generate a QR code first';
        emailStatus.className = 'email-status error';
        return;
    }

    emailBtn.disabled = true;
    emailBtn.textContent = 'Sending...';
    emailStatus.textContent = '';

    try {
        let qrImageData;
        if (typeof html2canvas !== 'undefined') {
            const canvas = await html2canvas(qrFrameWrapper, { backgroundColor: '#ffffff', scale: 2 });
            qrImageData = canvas.toDataURL('image/png');
        } else {
            const canvas = document.querySelector('#qrcode canvas');
            qrImageData = canvas.toDataURL('image/png');
        }
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: currentUser.email,
            to_name:  currentUser.displayName || 'User',
            qr_url:   currentQRUrl,
            qr_image: qrImageData
        });
        emailStatus.textContent = `QR code sent to ${currentUser.email}`;
        emailStatus.className = 'email-status success';
        gtag('event', 'email_qr', { event_category: 'QR Code', event_label: currentQRUrl });
        if (currentUser) trackQREmailed(currentUser, currentQRUrl);
    } catch (error) {
        console.error('Email error:', error);
        emailStatus.textContent = 'Failed to send email. Please try again.';
        emailStatus.className = 'email-status error';
    } finally {
        emailBtn.disabled = false;
        emailBtn.textContent = 'Send to Email';
    }
}

document.getElementById('urlInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateQR();
});
