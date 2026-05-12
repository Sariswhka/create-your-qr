// Image Resizer App Logic
// Note: db is declared in auth.js (loaded first) and shared across scripts
let originalImage = null;
let originalWidth = 0;
let originalHeight = 0;
let originalFileSize = 0;
let originalFileName = 'image';
let aspectRatioLocked = true;
let aspectRatio = 1;
let cropper = null;
let currentQuality = 80;
let currentFormat = 'jpeg';
let isPro = false;

const FREE_MAX_SIZE = 5 * 1024 * 1024;   // 5 MB
const PRO_MAX_SIZE  = 20 * 1024 * 1024;  // 20 MB
const RAZORPAY_KEY  = 'rzp_live_frEA3PTBCni695';

// ── Pro status ────────────────────────────────────────────
function applyProStatus(status) {
    isPro = status;

    // Header badge / upgrade button
    document.getElementById('proBadge').classList.toggle('hidden', !isPro);
    document.getElementById('upgradeBtn').classList.toggle('hidden', isPro);

    // Lock indicators on tabs and format buttons
    ['bgLock','pngLock','webpLock','watermarkLock'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', isPro || window.isOnTrial);
    });

    // Bulk mode PRO lock
    document.querySelectorAll('#bulkModeBtn .pro-lock').forEach(el => {
        el.classList.toggle('hidden', isPro || window.isOnTrial);
    });

    // Crop aspect ratio pro locks
    document.querySelectorAll('.pro-aspect-btn .pro-lock').forEach(el => {
        el.classList.toggle('hidden', isPro);
    });
    document.querySelectorAll('.pro-aspect-btn').forEach(btn => {
        btn.disabled = isPro ? false : false; // always clickable, gated in handler
    });

    // Hide the free crop hint note for pro users
    const freeCropNote = document.getElementById('freeCropNote');
    if (freeCropNote) freeCropNote.classList.toggle('hidden', isPro);

    // File size label
    document.getElementById('maxSizeLabel').textContent = isPro ? 'Max 20 MB' : 'Max 5 MB';
}

// ── Bundle discount helpers ────────────────────────────────
function getBundleAmountImg() {
    const d = window.userProData || {};
    if (d.isPro)   return 9900 - 8900; // already paid ₹89
    if (d.isProQR) return 9900 - 4900; // already paid ₹49
    return 9900;
}
function getBundleLabelImg() {
    const d = window.userProData || {};
    if (d.isPro)   return { price: '₹10', desc: 'You already have Image Resizer Pro — pay just ₹10 more for the bundle' };
    if (d.isProQR) return { price: '₹50', desc: 'You already have QR Pro — pay just ₹50 more for the bundle' };
    return { price: '₹99', desc: '/year · save ₹38' };
}

// ── Upgrade modal ─────────────────────────────────────────
function showUpgradeModal() {
    // Hide trial offer if already on trial or paid Pro
    const trialBlock = document.getElementById('trialOfferBlock');
    if (trialBlock) {
        trialBlock.style.display = (isPro || window.isOnTrial) ? 'none' : 'block';
    }
    const { price, desc } = getBundleLabelImg();
    const priceEl = document.getElementById('bundlePriceImg');
    const descEl  = document.getElementById('bundleDescImg');
    const btnEl   = document.getElementById('bundleBtnImg');
    if (priceEl) priceEl.textContent = price;
    if (descEl)  descEl.textContent  = desc;
    if (btnEl)   btnEl.textContent   = `Get Bundle — ${price}`;
    document.getElementById('upgradeModal').classList.remove('hidden');
}

document.getElementById('closeUpgradeModal').addEventListener('click', () => {
    document.getElementById('upgradeModal').classList.add('hidden');
});

// Start free trial button
document.getElementById('startTrialBtn')?.addEventListener('click', async () => {
    const user = window.currentUser;
    if (!user) return;
    try {
        // Record trial start in Firestore if not already set
        const ref = db.collection('users').doc(user.uid);
        const doc = await ref.get();
        const data = doc.exists ? doc.data() : {};
        if (!data.trialStartedAt) {
            await ref.set({ trialStartedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        window.isOnTrial = true;
        window.trialDaysLeft = 15;

        // Unlock UI
        applyProStatus(false);
        document.getElementById('upgradeModal').classList.add('hidden');

        // Show trial banner
        const existing = document.getElementById('trialBanner');
        if (!existing) {
            const banner = document.createElement('div');
            banner.id = 'trialBanner';
            banner.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-align:center;padding:10px 16px;font-size:0.85rem;font-weight:600;';
            banner.innerHTML = `🎉 Free Pro Trial active — <strong>15 days remaining</strong> · No credit card needed · <a href="#" onclick="showUpgradeModal();return false;" style="color:#d1fae5;text-decoration:underline;">Upgrade to keep access</a>`;
            document.body.prepend(banner);
        }

        showProToast('🎉 15-day free trial activated! All Pro features unlocked.');
    } catch(e) {
        alert('Could not start trial. Please try again.');
    }
});

document.getElementById('upgradeBtn').addEventListener('click', showUpgradeModal);

// Close modal on backdrop click
document.getElementById('upgradeModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('upgradeModal')) {
        document.getElementById('upgradeModal').classList.add('hidden');
    }
});

// ── Razorpay payment ──────────────────────────────────────
function startImgPayment(plan) {
    const user = window.currentUser;
    if (!user) return;

    const plans = {
        imgtools: { amount: 8900, name: 'Image Resizer Pro',      desc: 'Image Resizer Pro — ₹89/year', cb: 'https://imgtools.web.app/?rzp_success=imgtools' },
        bundle:   { amount: getBundleAmountImg(), name: 'Pro Bundle (Both Apps)', desc: 'QR + Image Resizer Pro Bundle — ₹99/year', cb: 'https://imgtools.web.app/?rzp_success=bundle' },
        qr:       { amount: 4900, name: 'QR Generator Pro',       desc: 'QR Generator Pro — ₹49/year',   cb: 'https://imgtools.web.app/?rzp_success=qr' }
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
        handler: async (response) => { await saveImgProAndUnlock(plan, response.razorpay_payment_id); },
        prefill: { name: user.displayName || '', email: user.email || '' },
        theme: { color: '#10b981' },
        modal: { ondismiss: function() {} }
    };
    new Razorpay(options).open();
}

document.getElementById('payNowBtn')?.addEventListener('click',    () => startImgPayment('imgtools'));
document.getElementById('payBundleBtn')?.addEventListener('click', () => startImgPayment('bundle'));
document.getElementById('payQRBtn')?.addEventListener('click',     () => startImgPayment('qr'));

async function saveImgProAndUnlock(plan, paymentId) {
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
        if (plan === 'imgtools' || plan === 'bundle') { update.isPro       = true; update.isProExpiresAt       = expiresAt; }
        if (plan === 'bundle')                         { update.isProBundle = true; update.isProBundleExpiresAt = expiresAt; }
        if (plan === 'qr')                             { update.isProQR     = true; update.isProQRExpiresAt     = expiresAt; }

        await db.collection('users').doc(user.uid).set(update, { merge: true });
    } catch (e) { console.error('Firestore write error:', e); }

    document.getElementById('upgradeModal').classList.add('hidden');
    if (plan === 'imgtools' || plan === 'bundle') { applyProStatus(true); showProToast(); }
    else showProToast('🎉 QR Generator Pro unlocked! Visit create-your-qr.web.app to use it.');
    if (typeof trackEvent === 'function') trackEvent('pro_upgrade', { plan, paymentId });
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Handle redirect flow — check URL params after Razorpay redirect
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('rzp_success');
    if (success) {
        const waitForUser = setInterval(() => {
            if (window.currentUser) {
                clearInterval(waitForUser);
                saveImgProAndUnlock(success, params.get('razorpay_payment_id') || 'redirect_flow');
            }
        }, 300);
        // Timeout after 10s
        setTimeout(() => clearInterval(waitForUser), 10000);
    }
});

function showProToast(msg) {
    const toast = document.getElementById('proToast');
    if (!toast) return;
    toast.textContent = msg || '🎉 You\'re now a Pro user! All features unlocked.';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ── Bulk Resize ───────────────────────────────────────────
let bulkFiles = [];

const singleModeBtn   = document.getElementById('singleModeBtn');
const bulkModeBtn     = document.getElementById('bulkModeBtn');
const singleUploadArea = document.getElementById('singleUploadArea');
const bulkUploadArea  = document.getElementById('bulkUploadArea');
const bulkDropArea    = document.getElementById('bulkDropArea');
const bulkFileInput   = document.getElementById('bulkFileInput');

// Mode toggle
singleModeBtn.addEventListener('click', () => {
    singleModeBtn.classList.add('active');
    bulkModeBtn.classList.remove('active');
    singleUploadArea.classList.remove('hidden');
    bulkUploadArea.classList.add('hidden');
});

bulkModeBtn.addEventListener('click', () => {
    if (!hasProAccess()) {
        showUpgradeModal();
        return;
    }
    bulkModeBtn.classList.add('active');
    singleModeBtn.classList.remove('active');
    bulkUploadArea.classList.remove('hidden');
    singleUploadArea.classList.add('hidden');
});

// Bulk file input
bulkDropArea.addEventListener('click', () => bulkFileInput.click());

bulkDropArea.addEventListener('dragover', e => { e.preventDefault(); bulkDropArea.classList.add('dragover'); });
bulkDropArea.addEventListener('dragleave', () => bulkDropArea.classList.remove('dragover'));
bulkDropArea.addEventListener('drop', e => {
    e.preventDefault();
    bulkDropArea.classList.remove('dragover');
    handleBulkFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
});

bulkFileInput.addEventListener('change', e => {
    handleBulkFiles(Array.from(e.target.files));
});

document.getElementById('bulkQuality').addEventListener('input', e => {
    document.getElementById('bulkQualityVal').textContent = e.target.value;
});

// Preset selector auto-fills dimensions
document.getElementById('bulkPreset').addEventListener('change', e => {
    const val = e.target.value;
    if (!val) return;
    const [w, h] = val.split(',');
    document.getElementById('bulkWidth').value  = w;
    document.getElementById('bulkHeight').value = h;
});

// Watermark toggle
document.getElementById('bulkWmEnabled').addEventListener('change', e => {
    document.getElementById('bulkWmPanel').classList.toggle('hidden', !e.target.checked);
});

// Watermark slider labels
document.getElementById('bulkWmSize').addEventListener('input', e =>
    document.getElementById('bulkWmSizeVal').textContent = e.target.value);
document.getElementById('bulkWmOpacity').addEventListener('input', e =>
    document.getElementById('bulkWmOpacityVal').textContent = e.target.value);

function handleBulkFiles(files) {
    const maxSize = isPro ? PRO_MAX_SIZE : FREE_MAX_SIZE;
    const valid = files.filter(f => f.size <= maxSize);
    const skipped = files.length - valid.length;

    if (skipped > 0) showToast(`${skipped} file(s) skipped — exceed size limit`);
    if (valid.length === 0) return;

    bulkFiles = [...bulkFiles, ...valid];
    renderBulkThumbnails();
    document.getElementById('bulkSettings').classList.remove('hidden');
}

function renderBulkThumbnails() {
    // Compact the drop area after first load
    const dropArea = document.getElementById('bulkDropArea');
    dropArea.classList.add('bulk-drop-compact');
    dropArea.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>Add more images</span>
        <input type="file" id="bulkFileInput" accept="image/*" multiple hidden>
    `;
    // Re-bind click after innerHTML replace
    dropArea.querySelector('input').addEventListener('change', e => handleBulkFiles(Array.from(e.target.files)));
    dropArea.onclick = () => dropArea.querySelector('input').click();

    const container = document.getElementById('bulkThumbnails');
    container.classList.remove('hidden');
    container.innerHTML = `<p class="bulk-count">${bulkFiles.length} image${bulkFiles.length > 1 ? 's' : ''} selected</p>`;

    bulkFiles.forEach((file, idx) => {
        const url = URL.createObjectURL(file);
        const div = document.createElement('div');
        div.className = 'bulk-thumb';
        div.innerHTML = `
            <img src="${url}" alt="${file.name}">
            <span class="bulk-thumb-name">${file.name}</span>
            <button class="bulk-thumb-remove" data-idx="${idx}">✕</button>
        `;
        container.appendChild(div);
    });

    // Remove individual image
    container.querySelectorAll('.bulk-thumb-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            bulkFiles.splice(parseInt(btn.dataset.idx), 1);
            if (bulkFiles.length === 0) {
                container.classList.add('hidden');
                document.getElementById('bulkSettings').classList.add('hidden');
                // Restore full drop area
                const dropArea = document.getElementById('bulkDropArea');
                dropArea.classList.remove('bulk-drop-compact');
                dropArea.innerHTML = `
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <h3>Drop multiple images here</h3>
                    <p>or click to browse</p>
                    <p class="file-types">Select multiple files · JPG, PNG, WEBP · Max 5 MB each</p>
                    <input type="file" id="bulkFileInput" accept="image/*" multiple hidden>
                `;
                dropArea.querySelector('input').addEventListener('change', e => handleBulkFiles(Array.from(e.target.files)));
                dropArea.onclick = () => dropArea.querySelector('input').click();
            } else {
                renderBulkThumbnails();
            }
        });
    });
}

function showToast(msg) {
    const toast = document.getElementById('proToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
}

// Bulk download
document.getElementById('bulkDownloadBtn').addEventListener('click', async () => {
    if (bulkFiles.length === 0) return;

    const btn        = document.getElementById('bulkDownloadBtn');
    const progressEl = document.getElementById('bulkProgress');
    const fillEl     = document.getElementById('bulkProgressFill');
    const textEl     = document.getElementById('bulkProgressText');
    const format     = document.getElementById('bulkFormat').value;
    const quality    = parseInt(document.getElementById('bulkQuality').value) / 100;
    const targetW    = parseInt(document.getElementById('bulkWidth').value)  || 0;
    const targetH    = parseInt(document.getElementById('bulkHeight').value) || 0;

    // Bulk watermark settings
    const bulkWm = {
        enabled:  document.getElementById('bulkWmEnabled').checked,
        text:     document.getElementById('bulkWmText').value,
        fontSize: parseInt(document.getElementById('bulkWmSize').value),
        color:    document.getElementById('bulkWmColor').value,
        opacity:  parseInt(document.getElementById('bulkWmOpacity').value) / 100,
        position: document.getElementById('bulkWmPosition').value,
    };

    btn.disabled = true;
    btn.textContent = 'Preparing...';
    progressEl.classList.remove('hidden');
    fillEl.style.width = '0%';

    try {
        if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        const zip = new JSZip();

        for (let i = 0; i < bulkFiles.length; i++) {
            fillEl.style.width = Math.round((i / bulkFiles.length) * 90) + '%';
            textEl.textContent = `Processing ${i + 1} of ${bulkFiles.length}: ${bulkFiles[i].name}`;
            const blob = await resizeFileToBlob(bulkFiles[i], targetW, targetH, format, quality, bulkWm);
            const ext  = format === 'jpeg' ? 'jpg' : format;
            const name = bulkFiles[i].name.replace(/\.[^.]+$/, '') + '.' + ext;
            zip.file(name, blob);
        }

        fillEl.style.width = '95%';
        textEl.textContent = 'Creating ZIP...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        triggerDownload(zipBlob, 'mockify-resized-images.zip');
        if (typeof trackEvent === 'function') trackEvent('bulk_download', { count: bulkFiles.length, format, targetWidth: targetW, targetHeight: targetH });
        fillEl.style.width = '100%';
        textEl.textContent = `Done! ${bulkFiles.length} images downloaded.`;

    } catch(e) {
        textEl.textContent = 'Error: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download All as ZIP`;
    }
});

function resizeFileToBlob(file, targetW, targetH, format, quality, bulkWm) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = async () => {
                try {
                    let w = format === 'ico' ? 256 : (targetW || img.width);
                    let h = format === 'ico' ? 256 : (targetH || img.height);

                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, w, h);

                    // Apply bulk watermark if enabled
                    if (bulkWm && bulkWm.enabled && bulkWm.text) {
                        ctx.globalAlpha = bulkWm.opacity;
                        ctx.fillStyle   = bulkWm.color;
                        ctx.font        = `bold ${bulkWm.fontSize}px Inter, sans-serif`;
                        ctx.textBaseline = 'middle';
                        const tw = ctx.measureText(bulkWm.text).width;
                        const pad = Math.min(w, h) * 0.03;
                        const [x, y] = getWatermarkXY(bulkWm.position, w, h, tw, bulkWm.fontSize, pad);
                        ctx.fillText(bulkWm.text, x, y);
                        ctx.globalAlpha = 1;
                    }

                    switch (format) {
                        case 'jpeg':
                            canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', quality);
                            break;
                        case 'png':
                            canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
                            break;
                        case 'webp':
                            canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/webp', quality);
                            break;
                        case 'avif':
                            canvas.toBlob(b => b ? resolve(b) : reject(new Error('AVIF not supported')), 'image/avif', quality);
                            break;
                        case 'bmp':
                            resolve(encodeBMP(ctx.getImageData(0, 0, w, h), w, h));
                            break;
                        case 'ico':
                            resolve(encodeICO(ctx.getImageData(0, 0, 256, 256), 256, 256));
                            break;
                        case 'tiff': {
                            if (!window.UTIF) await loadScript('https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js');
                            const buf = UTIF.encodeImage(ctx.getImageData(0, 0, w, h).data, w, h);
                            resolve(new Blob([buf], { type: 'image/tiff' }));
                            break;
                        }
                        case 'gif': {
                            if (!window.GIF) await loadScript('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js');
                            const workerResp = await fetch('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');
                            const workerUrl  = URL.createObjectURL(await workerResp.blob());
                            const gif = new GIF({ workers: 1, quality: 10, width: w, height: h, workerScript: workerUrl });
                            gif.addFrame(canvas, { delay: 0 });
                            gif.on('finished', blob => { URL.revokeObjectURL(workerUrl); resolve(blob); });
                            gif.render();
                            break;
                        }
                        case 'pdf': {
                            if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                            const { jsPDF } = window.jspdf;
                            const pdf = new jsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
                            pdf.addImage(canvas.toDataURL('image/jpeg', quality), 'JPEG', 0, 0, w, h);
                            resolve(pdf.output('blob'));
                            break;
                        }
                        default:
                            canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', quality);
                    }
                } catch(err) { reject(err); }
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ── Image Comparison Slider ────────────────────────────────
let beforeImageSrc = null;
let compareActive = false;

const compareBtn       = document.getElementById('compareBtn');
const compareContainer = document.getElementById('compareContainer');
const normalPreview    = document.getElementById('normalPreview');
const compareAfterEl   = document.getElementById('compareAfter');
const compareHandle    = document.getElementById('compareHandle');

function captureBeforeState() {
    if (previewImage && previewImage.src) {
        beforeImageSrc = previewImage.src;
    }
}

function enableCompareBtn() {
    compareBtn.style.display = 'inline-flex';
}

compareBtn.addEventListener('click', () => {
    compareActive = !compareActive;
    if (compareActive) {
        document.getElementById('compareBeforeImg').src = beforeImageSrc || previewImage.src;
        document.getElementById('compareAfterImg').src  = previewImage.src;
        normalPreview.classList.add('hidden');
        compareContainer.classList.remove('hidden');
        compareAfterEl.style.width = '50%';
        compareHandle.style.left   = '50%';
        compareBtn.textContent = '✕ Close Compare';
    } else {
        normalPreview.classList.remove('hidden');
        compareContainer.classList.add('hidden');
        compareBtn.textContent = '⇔ Compare';
    }
});

// Drag logic
let isDragging = false;

compareHandle.addEventListener('mousedown',  () => isDragging = true);
compareHandle.addEventListener('touchstart', () => isDragging = true, { passive: true });

document.addEventListener('mouseup',  () => isDragging = false);
document.addEventListener('touchend', () => isDragging = false);

document.addEventListener('mousemove', moveSlider);
document.addEventListener('touchmove', e => moveSlider(e.touches[0]), { passive: true });

function moveSlider(e) {
    if (!isDragging || !compareActive) return;
    const rect = compareContainer.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    x = Math.max(2, Math.min(98, x));
    compareAfterEl.style.width  = x + '%';
    compareHandle.style.left    = x + '%';
}

// ── DOM Elements ───────────────────────────────────────────
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const editorSection = document.getElementById('editorSection');
const previewImage = document.getElementById('previewImage');
const cropImage = document.getElementById('cropImage');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const lockRatio = document.getElementById('lockRatio');
const customPercent = document.getElementById('customPercent');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');

// Initialize
lockRatio.classList.add('locked');

// File Upload Handlers
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        loadImage(file);
    }
});

// Load Image
function loadImage(file) {
    const maxSize = isPro ? PRO_MAX_SIZE : FREE_MAX_SIZE;
    if (file.size > maxSize) {
        if (!isPro && file.size <= PRO_MAX_SIZE) {
            // File would work with Pro — show upgrade modal
            showUpgradeModal();
        } else {
            showFileSizeError(file.size);
        }
        return;
    }

    originalFileSize = file.size;
    originalFileName = file.name.replace(/\.[^.]+$/, ''); // store name without extension
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            originalWidth = img.width;
            originalHeight = img.height;
            aspectRatio = originalWidth / originalHeight;

            // Update preview
            previewImage.src = e.target.result;
            cropImage.src = e.target.result;

            // Update info
            document.getElementById('originalSize').textContent = `Original: ${originalWidth} x ${originalHeight}`;
            document.getElementById('fileSize').textContent = `Size: ${formatFileSize(originalFileSize)}`;

            // Set initial dimensions
            widthInput.value = originalWidth;
            heightInput.value = originalHeight;
            updateNewDimensions();

            // Show editor
            uploadSection.classList.add('hidden');
            editorSection.classList.remove('hidden');
            if (typeof trackEvent === 'function') trackEvent('image_upload', { fileSizeMB: +(file.size / 1048576).toFixed(2), fileType: file.type });

            // Initialize cropper when crop tab is opened
            initCropper();
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

// Reset to upload
resetBtn.addEventListener('click', () => {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    // Reset compare state
    compareActive = false;
    beforeImageSrc = null;
    compareBtn.style.display = 'none';
    compareBtn.textContent = '⇔ Compare';
    compareContainer.classList.add('hidden');
    normalPreview.classList.remove('hidden');

    editorSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    fileInput.value = '';
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Gate pro-only tabs
        if (!hasProAccess() && (tab.dataset.tab === 'bgremove' || tab.dataset.tab === 'watermark')) {
            showUpgradeModal();
            return;
        }

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');

        // Reinitialize cropper when crop tab is shown — always on current image state
        if (tab.dataset.tab === 'crop' && originalImage) {
            cropImage.src = previewImage.src;
            setTimeout(() => initCropper(), 100);
        }

        // Restore current dimensions when switching back to resize tab
        if (tab.dataset.tab === 'resize' && originalImage) {
            widthInput.value = originalWidth;
            heightInput.value = originalHeight;
            updateNewDimensions();
        }
    });
});

// Social Media Presets
document.querySelectorAll('.social-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const w = parseInt(btn.dataset.w);
        const h = parseInt(btn.dataset.h);

        // Highlight active preset
        document.querySelectorAll('.social-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Switch to dimensions method
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.method-btn[data-method="dimensions"]').classList.add('active');
        document.getElementById('dimensionsGroup').classList.remove('hidden');
        document.getElementById('percentageGroup').classList.add('hidden');

        // Unlock aspect ratio — preset dimensions override original ratio
        aspectRatioLocked = false;
        lockRatio.classList.remove('locked');

        // Set dimensions
        widthInput.value = w;
        heightInput.value = h;
        updateNewDimensions();
    });
});

// Resize Methods
document.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (btn.dataset.method === 'dimensions') {
            document.getElementById('dimensionsGroup').classList.remove('hidden');
            document.getElementById('percentageGroup').classList.add('hidden');
        } else {
            document.getElementById('dimensionsGroup').classList.add('hidden');
            document.getElementById('percentageGroup').classList.remove('hidden');
            applyPercentage(parseInt(customPercent.value));
        }
    });
});

// Dimension Inputs
widthInput.addEventListener('input', () => {
    if (aspectRatioLocked && originalImage) {
        const newWidth = parseInt(widthInput.value) || 0;
        heightInput.value = Math.round(newWidth / aspectRatio);
    }
    updateNewDimensions();
});

heightInput.addEventListener('input', () => {
    if (aspectRatioLocked && originalImage) {
        const newHeight = parseInt(heightInput.value) || 0;
        widthInput.value = Math.round(newHeight * aspectRatio);
    }
    updateNewDimensions();
});

// Lock Ratio Toggle
lockRatio.addEventListener('click', () => {
    aspectRatioLocked = !aspectRatioLocked;
    lockRatio.classList.toggle('locked', aspectRatioLocked);
});

// Percentage Buttons
document.querySelectorAll('.percent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.percent-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        customPercent.value = btn.dataset.percent;
        applyPercentage(parseInt(btn.dataset.percent));
    });
});

customPercent.addEventListener('input', () => {
    document.querySelectorAll('.percent-btn').forEach(b => b.classList.remove('active'));
    applyPercentage(parseInt(customPercent.value) || 100);
});

function applyPercentage(percent) {
    if (originalImage) {
        widthInput.value = Math.round(originalWidth * percent / 100);
        heightInput.value = Math.round(originalHeight * percent / 100);
        updateNewDimensions();
    }
}

function updateNewDimensions() {
    const w = parseInt(widthInput.value) || 0;
    const h = parseInt(heightInput.value) || 0;
    document.getElementById('newSize').textContent = `${w} x ${h}`;
    updateEstimatedSize();
}

// Cropper
function initCropper() {
    if (cropper) {
        cropper.destroy();
    }

    cropper = new Cropper(cropImage, {
        viewMode: 1,
        dragMode: 'crop',
        aspectRatio: NaN,
        autoCropArea: 0.8,
        responsive: true,
        restore: false,
    });
}

// Aspect Ratio Buttons
document.querySelectorAll('.aspect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Gate fixed aspect ratios for pro
        if (!isPro && btn.classList.contains('pro-aspect-btn')) {
            showUpgradeModal();
            return;
        }
        document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (cropper) {
            const aspect = btn.dataset.aspect === 'free' ? NaN : parseFloat(btn.dataset.aspect);
            cropper.setAspectRatio(aspect);
        }
    });
});

document.getElementById('upgradeAspectLink').addEventListener('click', (e) => {
    e.preventDefault();
    showUpgradeModal();
});

// Apply Crop
document.getElementById('applyCrop').addEventListener('click', () => {
    if (cropper) {
        captureBeforeState();
        if (typeof trackEvent === 'function') trackEvent('crop_applied');
        const canvas = cropper.getCroppedCanvas();
        if (canvas) {
            originalImage = new Image();
            originalImage.src = canvas.toDataURL();
            originalWidth = canvas.width;
            originalHeight = canvas.height;
            aspectRatio = originalWidth / originalHeight;

            previewImage.src = originalImage.src;
            widthInput.value = originalWidth;
            heightInput.value = originalHeight;

            document.getElementById('originalSize').textContent = `Cropped: ${originalWidth} x ${originalHeight}`;
            updateNewDimensions();
            enableCompareBtn();

            // Switch to resize tab
            document.querySelector('.tab[data-tab="resize"]').click();
        }
    }
});

// Quality Slider
qualitySlider.addEventListener('input', () => {
    currentQuality = parseInt(qualitySlider.value);
    qualityValue.textContent = currentQuality;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    updateEstimatedSize();
});

// Quality Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentQuality = parseInt(btn.dataset.quality);
        qualitySlider.value = currentQuality;
        qualityValue.textContent = currentQuality;
        updateEstimatedSize();
    });
});

// Format Buttons
document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!isPro && (btn.dataset.format === 'png' || btn.dataset.format === 'webp')) {
            showUpgradeModal();
            return;
        }
        // AVIF: check browser support before selecting
        if (btn.dataset.format === 'avif' && !isAvifSupported()) {
            alert('AVIF encoding is not supported in your browser.\nPlease use Chrome 94+ or Firefox 113+.');
            return;
        }
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFormat = btn.dataset.format;

        // ICO: auto-set dimensions to 256x256
        if (currentFormat === 'ico') {
            widthInput.value = 256;
            heightInput.value = 256;
            updateNewDimensions();
            showFormatNote('ICO format: dimensions set to 256×256 (standard favicon size)');
        } else {
            hideFormatNote();
        }

        // GIF: quality slider doesn't apply
        if (currentFormat === 'gif') {
            showFormatNote('GIF uses a 256-colour palette — quality slider does not apply');
        }

        // PDF: estimated size not applicable
        updateEstimatedSize();
    });
});

function hasProAccess() {
    return isPro || window.isOnTrial === true;
}

function showFormatNote(msg) {
    let note = document.getElementById('formatNote');
    if (!note) {
        note = document.createElement('p');
        note.id = 'formatNote';
        note.style.cssText = 'font-size:12px;color:#6b7280;margin:6px 0 0;';
        document.querySelector('.format-group').appendChild(note);
    }
    note.textContent = msg;
    note.style.display = 'block';
}

function hideFormatNote() {
    const note = document.getElementById('formatNote');
    if (note) note.style.display = 'none';
}

function isAvifSupported() {
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    return canvas.toDataURL('image/avif').startsWith('data:image/avif');
}

let estimateTimeout = null;

function updateEstimatedSize() {
    if (!originalImage) return;

    document.getElementById('estimatedSize').textContent = 'Calculating…';

    clearTimeout(estimateTimeout);
    estimateTimeout = setTimeout(() => {
        const w = parseInt(widthInput.value) || originalWidth;
        const h = parseInt(heightInput.value) || originalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(originalImage, 0, 0, w, h);

        // PDF, BMP, TIFF, GIF, ICO — can't estimate via canvas.toBlob
        if (['pdf', 'bmp', 'tiff', 'gif', 'ico'].includes(currentFormat)) {
            document.getElementById('estimatedSize').textContent = 'varies';
            return;
        }

        let mimeType = 'image/jpeg';
        if (currentFormat === 'png')  mimeType = 'image/png';
        else if (currentFormat === 'webp') mimeType = 'image/webp';
        else if (currentFormat === 'avif') mimeType = 'image/avif';

        canvas.toBlob((blob) => {
            if (blob) {
                document.getElementById('estimatedSize').textContent = formatFileSize(blob.size);
            }
        }, mimeType, currentQuality / 100);
    }, 300);
}

// Download
downloadBtn.addEventListener('click', async () => {
    if (!originalImage) return;

    const width  = parseInt(widthInput.value)  || originalWidth;
    const height = parseInt(heightInput.value) || originalHeight;
    if (typeof trackEvent === 'function') trackEvent('image_download', { format: currentFormat, width, height, quality: currentQuality });

    // If watermark is active, use watermarked canvas
    const baseCanvas = wmState.active
        ? applyWatermarkToCanvas(originalImage, width, height)
        : (() => {
            const c = document.createElement('canvas');
            c.width = width; c.height = height;
            const cx = c.getContext('2d');
            cx.imageSmoothingEnabled = true;
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(originalImage, 0, 0, width, height);
            return c;
        })();

    const canvas = baseCanvas;
    const ctx = canvas.getContext('2d');

    switch (currentFormat) {

        case 'jpeg': {
            canvas.toBlob(blob => triggerDownload(blob, `${originalFileName}_Updated.jpg`), 'image/jpeg', currentQuality / 100);
            break;
        }

        case 'png': {
            canvas.toBlob(blob => triggerDownload(blob, `${originalFileName}_Updated.png`), 'image/png');
            break;
        }

        case 'webp': {
            canvas.toBlob(blob => triggerDownload(blob, `${originalFileName}_Updated.webp`), 'image/webp', currentQuality / 100);
            break;
        }

        case 'avif': {
            canvas.toBlob(blob => {
                if (!blob) { alert('AVIF encoding failed. Try Chrome 94+ or Firefox 113+.'); return; }
                triggerDownload(blob, `${originalFileName}_Updated.avif`);
            }, 'image/avif', currentQuality / 100);
            break;
        }

        case 'pdf': {
            downloadBtn.textContent = 'Generating PDF…';
            downloadBtn.disabled = true;
            try {
                if (!window.jspdf) {
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                }
                const { jsPDF } = window.jspdf;
                const orientation = width >= height ? 'landscape' : 'portrait';
                const pdf = new jsPDF({ orientation, unit: 'px', format: [width, height], hotfixes: ['px_scaling'] });
                const imgData = canvas.toDataURL('image/jpeg', currentQuality / 100);
                pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
                pdf.save(`${originalFileName}_Updated.pdf`);
            } catch(e) {
                alert('PDF generation failed: ' + e.message);
            } finally {
                downloadBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Image`;
                downloadBtn.disabled = false;
            }
            break;
        }

        case 'bmp': {
            const imageData = ctx.getImageData(0, 0, width, height);
            const blob = encodeBMP(imageData, width, height);
            triggerDownload(blob, `${originalFileName}_Updated.bmp`);
            break;
        }

        case 'tiff': {
            downloadBtn.textContent = 'Generating TIFF…';
            downloadBtn.disabled = true;
            try {
                if (!window.UTIF) {
                    await loadScript('https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js');
                }
                const imageData = ctx.getImageData(0, 0, width, height);
                const tiffBuffer = UTIF.encodeImage(imageData.data, width, height);
                const blob = new Blob([tiffBuffer], { type: 'image/tiff' });
                triggerDownload(blob, `${originalFileName}_Updated.tiff`);
            } catch(e) {
                alert('TIFF generation failed: ' + e.message);
            } finally {
                downloadBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Image`;
                downloadBtn.disabled = false;
            }
            break;
        }

        case 'gif': {
            downloadBtn.textContent = 'Generating GIF…';
            downloadBtn.disabled = true;
            try {
                if (!window.GIF) {
                    await loadScript('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js');
                }
                // Fetch worker script and create blob URL to bypass CORS restrictions
                const workerResp = await fetch('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');
                const workerBlob = await workerResp.blob();
                const workerUrl = URL.createObjectURL(workerBlob);

                const gif = new GIF({ workers: 2, quality: 10, width, height, workerScript: workerUrl });
                gif.addFrame(canvas, { delay: 0 });
                gif.on('finished', blob => {
                    URL.revokeObjectURL(workerUrl);
                    triggerDownload(blob, `${originalFileName}_Updated.gif`);
                    downloadBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Image`;
                    downloadBtn.disabled = false;
                });
                gif.render();
            } catch(e) {
                alert('GIF generation failed: ' + e.message);
                downloadBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Image`;
                downloadBtn.disabled = false;
            }
            break;
        }

        case 'ico': {
            // ICO: always 256x256
            const icoCanvas = document.createElement('canvas');
            icoCanvas.width = 256; icoCanvas.height = 256;
            icoCanvas.getContext('2d').drawImage(originalImage, 0, 0, 256, 256);
            const icoImageData = icoCanvas.getContext('2d').getImageData(0, 0, 256, 256);
            const blob = encodeICO(icoImageData, 256, 256);
            triggerDownload(blob, `${originalFileName}_Updated.ico`);
            break;
        }
    }
});

// ── Watermark ─────────────────────────────────────────────
const wmState = {
    active: false,
    mode: 'text',         // 'text' | 'logo'
    text: '',
    fontSize: 24,
    color: '#ffffff',
    opacity: 0.7,
    position: 'center',
    logoImage: null,
    logoSize: 0.2,
};

// Mode toggle
document.getElementById('wmTextMode').addEventListener('click', () => {
    wmState.mode = 'text';
    document.getElementById('wmTextMode').classList.add('active');
    document.getElementById('wmLogoMode').classList.remove('active');
    document.getElementById('wmTextPanel').classList.remove('hidden');
    document.getElementById('wmLogoPanel').classList.add('hidden');
});

document.getElementById('wmLogoMode').addEventListener('click', () => {
    wmState.mode = 'logo';
    document.getElementById('wmLogoMode').classList.add('active');
    document.getElementById('wmTextMode').classList.remove('active');
    document.getElementById('wmLogoPanel').classList.remove('hidden');
    document.getElementById('wmTextPanel').classList.add('hidden');
});

// Input bindings
document.getElementById('wmText').addEventListener('input', e => wmState.text = e.target.value);
document.getElementById('wmFontSize').addEventListener('input', e => {
    wmState.fontSize = parseInt(e.target.value);
    document.getElementById('wmFontSizeVal').textContent = e.target.value;
});
document.getElementById('wmColor').addEventListener('input', e => wmState.color = e.target.value);
document.getElementById('wmOpacity').addEventListener('input', e => {
    wmState.opacity = parseInt(e.target.value) / 100;
    document.getElementById('wmOpacityVal').textContent = e.target.value;
});
document.getElementById('wmLogoSize').addEventListener('input', e => {
    wmState.logoSize = parseInt(e.target.value) / 100;
    document.getElementById('wmLogoSizeVal').textContent = e.target.value;
});
document.getElementById('wmLogoInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => { wmState.logoImage = img; };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

// Position grid
document.querySelectorAll('.wm-pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.wm-pos-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        wmState.position = btn.dataset.pos;
    });
});

// Preview button
document.getElementById('wmPreviewBtn').addEventListener('click', () => {
    if (!originalImage) return;
    if (typeof trackEvent === 'function') trackEvent('watermark_applied', { mode: wmState.mode });
    const canvas = applyWatermarkToCanvas(originalImage, originalWidth, originalHeight);
    previewImage.src = canvas.toDataURL('image/png');
    wmState.active = true;
});

// Clear button
document.getElementById('wmClearBtn').addEventListener('click', () => {
    wmState.active = false;
    previewImage.src = originalImage.src;
    document.getElementById('wmText').value = '';
    document.getElementById('wmLogoInput').value = '';
    wmState.logoImage = null;
    wmState.text = '';
});

function applyWatermarkToCanvas(image, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);

    ctx.globalAlpha = wmState.opacity;
    const pad = Math.min(width, height) * 0.03;

    if (wmState.mode === 'text' && wmState.text) {
        ctx.fillStyle   = wmState.color;
        ctx.font        = `bold ${wmState.fontSize}px Inter, sans-serif`;
        ctx.textBaseline = 'middle';
        const metrics   = ctx.measureText(wmState.text);
        const tw = metrics.width;
        const th = wmState.fontSize;
        const [x, y] = getWatermarkXY(wmState.position, width, height, tw, th, pad);
        ctx.fillText(wmState.text, x, y);

    } else if (wmState.mode === 'logo' && wmState.logoImage) {
        const lw = width * wmState.logoSize;
        const lh = wmState.logoImage.height * (lw / wmState.logoImage.width);
        const [x, y] = getWatermarkXY(wmState.position, width, height, lw, lh, pad);
        ctx.drawImage(wmState.logoImage, x, y, lw, lh);
    }

    ctx.globalAlpha = 1;
    return canvas;
}

function getWatermarkXY(position, imgW, imgH, elW, elH, pad) {
    const positions = {
        'top-left':      [pad,                pad + elH / 2],
        'top-center':    [imgW / 2 - elW / 2, pad + elH / 2],
        'top-right':     [imgW - elW - pad,   pad + elH / 2],
        'middle-left':   [pad,                imgH / 2],
        'center':        [imgW / 2 - elW / 2, imgH / 2],
        'middle-right':  [imgW - elW - pad,   imgH / 2],
        'bottom-left':   [pad,                imgH - pad - elH / 2],
        'bottom-center': [imgW / 2 - elW / 2, imgH - pad - elH / 2],
        'bottom-right':  [imgW - elW - pad,   imgH - pad - elH / 2],
    };
    return positions[position] || positions['center'];
}

// ── Helper: trigger file download ─────────────────────────
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

// ── Helper: load external script ──────────────────────────
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(script);
    });
}

// ── BMP encoder (pure JS, no library) ─────────────────────
function encodeBMP(imageData, width, height) {
    const rowSize = Math.floor((24 * width + 31) / 32) * 4;
    const pixelDataSize = rowSize * height;
    const fileSize = 54 + pixelDataSize;
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // File header
    view.setUint8(0, 0x42); view.setUint8(1, 0x4D); // 'BM'
    view.setUint32(2, fileSize, true);
    view.setUint32(6, 0, true);
    view.setUint32(10, 54, true);

    // DIB header (BITMAPINFOHEADER)
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, -height, true); // negative = top-down
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true); // 24-bit
    view.setUint32(30, 0, true);
    view.setUint32(34, pixelDataSize, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);

    // Pixel data (BGR order)
    const data = imageData.data;
    let offset = 54;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            view.setUint8(offset++, data[i + 2]); // B
            view.setUint8(offset++, data[i + 1]); // G
            view.setUint8(offset++, data[i]);     // R
        }
        // Row padding
        for (let p = 0; p < (rowSize - width * 3); p++) view.setUint8(offset++, 0);
    }

    return new Blob([buffer], { type: 'image/bmp' });
}

// ── ICO encoder (pure JS, 256x256 single frame) ───────────
function encodeICO(imageData, width, height) {
    // ICO with embedded PNG for 256x256 (browser standard)
    const pngCanvas = document.createElement('canvas');
    pngCanvas.width = width; pngCanvas.height = height;
    const pngCtx = pngCanvas.getContext('2d');
    pngCtx.putImageData(imageData, 0, 0);

    // Get PNG data
    const pngData = pngCanvas.toDataURL('image/png');
    const pngBytes = atob(pngData.split(',')[1]);
    const pngArray = new Uint8Array(pngBytes.length);
    for (let i = 0; i < pngBytes.length; i++) pngArray[i] = pngBytes.charCodeAt(i);

    // ICO header + directory
    const icoHeader = new ArrayBuffer(6 + 16);
    const view = new DataView(icoHeader);
    view.setUint16(0, 0, true);   // reserved
    view.setUint16(2, 1, true);   // type: ICO
    view.setUint16(4, 1, true);   // 1 image

    // Directory entry
    view.setUint8(6, 0);    // width (0 = 256)
    view.setUint8(7, 0);    // height (0 = 256)
    view.setUint8(8, 0);    // color count
    view.setUint8(9, 0);    // reserved
    view.setUint16(10, 1, true);  // planes
    view.setUint16(12, 32, true); // bit count
    view.setUint32(14, pngArray.length, true); // size of image data
    view.setUint32(18, 22, true); // offset to image data

    return new Blob([icoHeader, pngArray], { type: 'image/x-icon' });
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// File Size Error
function showFileSizeError(fileSize) {
    const errorHTML = `
        <div class="file-error-overlay" id="fileErrorOverlay">
            <div class="file-error-modal">
                <div class="error-icon">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h3>File Too Large</h3>
                <p>Your image is <strong>${formatFileSize(fileSize)}</strong></p>
                <p>Maximum allowed size is <strong>20 MB</strong></p>
                <div class="error-tips">
                    <p>Tips to reduce file size:</p>
                    <ul>
                        <li>Use a smaller resolution image</li>
                        <li>Convert to JPG format</li>
                        <li>Compress the image first</li>
                    </ul>
                </div>
                <button class="btn btn-primary" onclick="closeFileSizeError()">Try Another Image</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', errorHTML);
}

function closeFileSizeError() {
    const overlay = document.getElementById('fileErrorOverlay');
    if (overlay) {
        overlay.remove();
    }
    fileInput.value = '';
}

// Background Removal
const removeBgBtn = document.getElementById('removeBgBtn');
const bgProgress = document.getElementById('bgProgress');
const bgResult = document.getElementById('bgResult');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

let removeBackground = null;

removeBgBtn.addEventListener('click', async () => {
    if (!originalImage) {
        alert('Please upload an image first');
        return;
    }
    captureBeforeState();
    if (typeof trackEvent === 'function') trackEvent('bg_remove');

    // Show progress, hide result
    bgProgress.classList.remove('hidden');
    bgResult.classList.add('hidden');
    removeBgBtn.disabled = true;
    removeBgBtn.textContent = 'Processing...';
    progressFill.style.width = '5%';
    progressText.textContent = 'Loading AI library...';

    try {
        // Load library dynamically if not loaded
        if (!removeBackground) {
            const module = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.1/+esm');
            removeBackground = module.removeBackground;
        }

        progressFill.style.width = '15%';
        progressText.textContent = 'Preparing image...';

        // Convert image to blob
        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        progressFill.style.width = '20%';
        progressText.textContent = 'Downloading AI model (~5MB)... Please wait.';

        // Remove background using the library
        const config = {
            progress: (key, current, total) => {
                if (key.includes('fetch')) {
                    const percent = 20 + Math.round((current / total) * 40);
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `Downloading model... ${Math.round((current / total) * 100)}%`;
                } else if (key.includes('inference')) {
                    const percent = 60 + Math.round((current / total) * 35);
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `Processing image... ${Math.round((current / total) * 100)}%`;
                }
            }
        };

        const result = await removeBackground(blob, config);

        progressFill.style.width = '95%';
        progressText.textContent = 'Finalizing...';

        // Create new image from result
        const resultUrl = URL.createObjectURL(result);
        const newImg = new Image();
        newImg.onload = () => {
            originalImage = newImg;
            previewImage.src = resultUrl;
            cropImage.src = resultUrl;

            // Update info
            document.getElementById('originalSize').textContent = `BG Removed: ${originalWidth} x ${originalHeight}`;

            // Auto-select PNG format for transparency
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.format-btn[data-format="png"]').classList.add('active');
            currentFormat = 'png';

            progressFill.style.width = '100%';
            bgProgress.classList.add('hidden');
            bgResult.classList.remove('hidden');
            enableCompareBtn();

            // Reinitialize cropper if needed
            if (cropper) {
                cropper.destroy();
                initCropper();
            }
        };
        newImg.src = resultUrl;

    } catch (error) {
        console.error('Background removal error:', error);
        bgProgress.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = 'Error: ' + (error.message || 'Could not remove background. Try a smaller image.');
    } finally {
        removeBgBtn.disabled = false;
        removeBgBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 14l2 2 4-4"/>
            </svg>
            Remove Background
        `;
    }
});
