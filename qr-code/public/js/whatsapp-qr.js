// WhatsApp Dynamic QR — create, manage and track WhatsApp QR codes
const wqDB = firebase.firestore();
let wqEditingId = null;
let wqImageFile = null;
let wqExistingImageUrl = null;

const WQ_FREE_LIMIT = 2;

// ── Tab switching ──────────────────────────────────────────
document.querySelectorAll('.qr-type-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.qr-type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const type = tab.dataset.type;
        document.getElementById('urlForm').classList.toggle('hidden', type !== 'url');
        document.getElementById('whatsappForm').classList.toggle('hidden', type !== 'whatsapp');
        document.getElementById('myQRSection').classList.toggle('hidden', type !== 'whatsapp');
        document.getElementById('howItWorksSection').classList.toggle('hidden', type !== 'whatsapp');
        if (type === 'whatsapp') loadMyQRCodes();
    });
});

// ── Pro gating helpers ─────────────────────────────────────
function wqIsPro() { return typeof isQRPro !== 'undefined' && isQRPro; }

function lockProWQFeatures() {
    // Formatting toolbar
    const toolbar = document.getElementById('fmtToolbar');
    if (toolbar) toolbar.classList.toggle('pro-locked', !wqIsPro());

    // Image upload
    const imgBox = document.getElementById('imgUploadBox');
    if (imgBox) imgBox.classList.toggle('pro-locked', !wqIsPro());
    const imgInput = document.getElementById('wqImage');
    if (imgInput) imgInput.disabled = !wqIsPro();

    // PIN input
    const pinInput = document.getElementById('wqPin');
    if (pinInput) pinInput.disabled = !wqIsPro();
    const pinLock = document.getElementById('pinProLock');
    if (pinLock) pinLock.classList.toggle('hidden', wqIsPro());
}

// ── Generate short ID ──────────────────────────────────────
function genId() { return Math.random().toString(36).substr(2, 8); }

// ── Text formatting ────────────────────────────────────────
function wqFormat(type) {
    if (!wqIsPro()) { showQRUpgradeModal(); return; }
    const ta = document.getElementById('wqMessage');
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = ta.value.substring(start, end);
    const map = { bold: '*', italic: '_', strike: '~', mono: '`' };
    const wrap = map[type];
    if (!wrap) return;
    ta.setRangeText(wrap + (sel || 'text') + wrap, start, end, 'select');
    ta.focus();
}

// ── Image selection ────────────────────────────────────────
function wqImageSelected(input) {
    if (!wqIsPro()) { showQRUpgradeModal(); input.value = ''; return; }
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB.'); input.value = ''; return; }
    wqImageFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('wqImgThumb').src = e.target.result;
        document.getElementById('wqImagePreview').style.display = 'block';
        document.getElementById('imgUploadLabel').textContent = file.name;
    };
    reader.readAsDataURL(file);
}

function wqRemoveImage() {
    wqImageFile = null;
    wqExistingImageUrl = null;
    document.getElementById('wqImage').value = '';
    document.getElementById('wqImagePreview').style.display = 'none';
    document.getElementById('imgUploadLabel').textContent = 'Click to upload image (JPG, PNG — max 2MB)';
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const MAX = 900;
            let w = img.width, h = img.height;
            if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
            if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = url;
    });
}

// ── Save / Update WhatsApp QR ──────────────────────────────
async function saveWhatsappQR() {
    const name    = document.getElementById('wqName').value.trim();
    const phone   = document.getElementById('wqPhone').value.trim();
    const message = document.getElementById('wqMessage').value.trim();
    const pin     = wqIsPro() ? document.getElementById('wqPin').value.trim() : '';
    const errEl   = document.getElementById('wqError');
    const saveBtn = document.getElementById('wqSaveBtn');

    if (!name || !phone || !message) { errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';

    // Free tier: max 2 QR codes
    if (!wqIsPro() && !wqEditingId) {
        const snap = await wqDB.collection('qr_codes')
            .where('userId', '==', currentUser.uid).get();
        if (snap.size >= WQ_FREE_LIMIT) {
            showQRUpgradeModal();
            return;
        }
    }

    saveBtn.disabled = true;
    saveBtn.textContent = wqEditingId ? 'Updating...' : 'Saving...';

    try {
        const id = wqEditingId || genId();

        let imageUrl = wqExistingImageUrl || '';
        if (wqImageFile && wqIsPro()) {
            saveBtn.textContent = 'Processing image...';
            imageUrl = await compressImage(wqImageFile);
        }

        const data = {
            userId:    currentUser.uid,
            userEmail: currentUser.email,
            type:      'whatsapp',
            name, phone, message,
            pin:       pin || '',
            imageUrl:  imageUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!wqEditingId) {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            data.scans     = 0;
        }

        await wqDB.collection('qr_codes').doc(id).set(data, { merge: true });

        const redirectUrl = `https://create-your-qr.web.app/q/${id}`;
        const resultEl = document.getElementById('wqResult');
        const qrEl     = document.getElementById('wqQRCode');
        qrEl.innerHTML = '';
        new QRCode(qrEl, { text: redirectUrl, width: 200, height: 200, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });

        const linkEl = document.getElementById('wqShortLink');
        linkEl.textContent = redirectUrl;
        linkEl.href = redirectUrl;
        resultEl.classList.remove('hidden');

        wqEditingId = null;
        wqImageFile = null;
        wqExistingImageUrl = null;
        document.getElementById('wqImage').value = '';
        document.getElementById('wqImagePreview').style.display = 'none';
        document.getElementById('imgUploadLabel').textContent = 'Click to upload image (JPG, PNG — max 2MB)';
        saveBtn.textContent = 'Generate & Save QR';
        loadMyQRCodes();

    } catch (e) {
        console.error(e);
        alert('Failed to save. Please try again.');
    } finally {
        saveBtn.disabled = false;
        if (!saveBtn.textContent.includes('QR')) saveBtn.textContent = 'Generate & Save QR';
    }
}

// ── Download WhatsApp QR ───────────────────────────────────
function downloadWQR() {
    const canvas = document.querySelector('#wqQRCode canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'whatsapp-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ── Copy link ──────────────────────────────────────────────
function copyWQRLink() {
    const link = document.getElementById('wqShortLink').href;
    navigator.clipboard.writeText(link).then(() => {
        const btn = event.target;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy Link', 2000);
    });
}

// ── Load My QR Codes ───────────────────────────────────────
async function loadMyQRCodes() {
    const listEl  = document.getElementById('myQRList');
    const countEl = document.getElementById('myQRCount');
    const section = document.getElementById('myQRSection');
    section.classList.remove('hidden');
    listEl.innerHTML = '<p class="wq-loading">Loading your QR codes...</p>';

    try {
        const snap = await wqDB.collection('qr_codes')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc').get();

        countEl.textContent = snap.size ? `${snap.size} QR code${snap.size > 1 ? 's' : ''}` : '';

        if (snap.empty) {
            listEl.innerHTML = '<p class="wq-empty">No WhatsApp QR codes yet. Create your first one above!</p>';
            return;
        }

        listEl.innerHTML = snap.docs.map(doc => {
            const d   = doc.data();
            const url = `https://create-your-qr.web.app/q/${doc.id}`;
            const msg = d.message.length > 80 ? d.message.substring(0, 80) + '…' : d.message;
            return `
                <div class="wq-card" id="card-${doc.id}">
                    <div class="wq-card-qr" id="mini-${doc.id}"></div>
                    <div class="wq-card-body">
                        <div class="wq-card-name">${escHtml(d.name)}</div>
                        <div class="wq-card-phone">${escHtml(d.phone)}</div>
                        <div class="wq-card-msg">${escHtml(msg)}</div>
                        <div class="wq-card-meta">
                            <span class="wq-scans">👁 ${d.scans || 0} scans</span>
                            ${d.pin ? '<span class="wq-pin-badge">🔒 PIN protected</span>' : '<span class="wq-public-badge">🌐 Public</span>'}
                            <a href="${url}" target="_blank" class="wq-card-link">${url}</a>
                        </div>
                    </div>
                    <div class="wq-card-actions">
                        <button class="btn-wq-action btn-wq-edit" onclick="editQR('${doc.id}')">Edit</button>
                        <button class="btn-wq-action btn-wq-dl" onclick="downloadQRCard('${doc.id}', '${url}')">Download</button>
                        <button class="btn-wq-action btn-wq-del" onclick="deleteQR('${doc.id}')">Delete</button>
                    </div>
                </div>`;
        }).join('');

        snap.docs.forEach(doc => {
            const url = `https://create-your-qr.web.app/q/${doc.id}`;
            new QRCode(document.getElementById(`mini-${doc.id}`), {
                text: url, width: 80, height: 80, colorDark: '#000000', colorLight: '#ffffff'
            });
        });

    } catch (e) {
        console.error(e);
        listEl.innerHTML = '<p class="wq-empty">Failed to load QR codes.</p>';
    }
}

// ── Edit QR ────────────────────────────────────────────────
async function editQR(id) {
    const doc = await wqDB.collection('qr_codes').doc(id).get();
    if (!doc.exists) return;
    const d = doc.data();

    document.getElementById('wqName').value    = d.name;
    document.getElementById('wqPhone').value   = d.phone;
    document.getElementById('wqMessage').value = d.message;
    document.getElementById('wqPin').value     = d.pin || '';
    document.getElementById('wqResult').classList.add('hidden');

    wqImageFile = null;
    wqExistingImageUrl = d.imageUrl || null;
    if (d.imageUrl) {
        document.getElementById('wqImgThumb').src = d.imageUrl;
        document.getElementById('wqImagePreview').style.display = 'block';
        document.getElementById('imgUploadLabel').textContent = 'Image attached (upload new to replace)';
    } else {
        document.getElementById('wqImagePreview').style.display = 'none';
        document.getElementById('imgUploadLabel').textContent = 'Click to upload image (JPG, PNG — max 2MB)';
    }

    wqEditingId = id;
    document.getElementById('wqSaveBtn').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Update QR`;
    document.getElementById('whatsappForm').scrollIntoView({ behavior: 'smooth' });
}

// ── Delete QR ──────────────────────────────────────────────
async function deleteQR(id) {
    if (!confirm('Delete this QR code? Anyone using this link will see an error.')) return;
    try {
        await wqDB.collection('qr_codes').doc(id).delete();
        loadMyQRCodes();
    } catch (e) { alert('Failed to delete. Please try again.'); }
}

// ── Download from card ─────────────────────────────────────
function downloadQRCard(id, url) {
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(tmp);
    new QRCode(tmp, { text: url, width: 400, height: 400, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
    setTimeout(() => {
        const canvas = tmp.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `whatsapp-qr-${id}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
        document.body.removeChild(tmp);
    }, 300);
}

// ── How it works toggle ────────────────────────────────────
function toggleHowItWorks() {
    const body    = document.getElementById('hiwBody');
    const chevron = document.getElementById('hiwChevron');
    const open    = body.classList.toggle('hidden');
    chevron.classList.toggle('open', !open);
}

// ── Helpers ────────────────────────────────────────────────
function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
