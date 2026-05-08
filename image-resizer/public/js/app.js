// Image Resizer App Logic
// Note: db is declared in auth.js (loaded first) and shared across scripts
let originalImage = null;
let originalWidth = 0;
let originalHeight = 0;
let originalFileSize = 0;
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
    ['bgLock','pngLock','webpLock'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', isPro);
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

// DOM Elements
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
    editorSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    fileInput.value = '';
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Gate pro-only tabs
        if (!isPro && tab.dataset.tab === 'bgremove') {
            showUpgradeModal();
            return;
        }

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');

        // Reinitialize cropper when crop tab is shown
        if (tab.dataset.tab === 'crop' && originalImage) {
            setTimeout(() => initCropper(), 100);
        }
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

    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0, width, height);

    switch (currentFormat) {

        case 'jpeg': {
            canvas.toBlob(blob => triggerDownload(blob, 'resized-image.jpg'), 'image/jpeg', currentQuality / 100);
            break;
        }

        case 'png': {
            canvas.toBlob(blob => triggerDownload(blob, 'resized-image.png'), 'image/png');
            break;
        }

        case 'webp': {
            canvas.toBlob(blob => triggerDownload(blob, 'resized-image.webp'), 'image/webp', currentQuality / 100);
            break;
        }

        case 'avif': {
            canvas.toBlob(blob => {
                if (!blob) { alert('AVIF encoding failed. Try Chrome 94+ or Firefox 113+.'); return; }
                triggerDownload(blob, 'resized-image.avif');
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
                pdf.save('resized-image.pdf');
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
            triggerDownload(blob, 'resized-image.bmp');
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
                triggerDownload(blob, 'resized-image.tiff');
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
                const gif = new GIF({ workers: 2, quality: 10, width, height, workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js' });
                gif.addFrame(canvas, { delay: 0 });
                gif.on('finished', blob => {
                    triggerDownload(blob, 'resized-image.gif');
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
            triggerDownload(blob, 'favicon.ico');
            break;
        }
    }
});

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
