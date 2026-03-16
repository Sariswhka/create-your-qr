// WhatsApp Dynamic QR — create, manage and track WhatsApp QR codes
const wqDB = firebase.firestore();
let wqEditingId = null;

// ── Tab switching ─────────────────────────────────────────
document.querySelectorAll('.qr-type-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.qr-type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const type = tab.dataset.type;
        document.getElementById('urlForm').classList.toggle('hidden', type !== 'url');
        document.getElementById('whatsappForm').classList.toggle('hidden', type !== 'whatsapp');
        document.getElementById('myQRSection').classList.toggle('hidden', type !== 'whatsapp');

        if (type === 'whatsapp') loadMyQRCodes();
    });
});

// ── Generate short ID ─────────────────────────────────────
function genId() {
    return Math.random().toString(36).substr(2, 8);
}

// ── Save / Update WhatsApp QR ─────────────────────────────
async function saveWhatsappQR() {
    const name    = document.getElementById('wqName').value.trim();
    const phone   = document.getElementById('wqPhone').value.trim();
    const message = document.getElementById('wqMessage').value.trim();
    const errEl   = document.getElementById('wqError');
    const saveBtn = document.getElementById('wqSaveBtn');

    if (!name || !phone || !message) {
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';

    saveBtn.disabled = true;
    saveBtn.textContent = wqEditingId ? 'Updating...' : 'Saving...';

    try {
        const id   = wqEditingId || genId();
        const data = {
            userId:    currentUser.uid,
            userEmail: currentUser.email,
            type:      'whatsapp',
            name, phone, message,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!wqEditingId) {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            data.scans     = 0;
        }

        await wqDB.collection('qr_codes').doc(id).set(data, { merge: true });

        const redirectUrl = `https://create-your-qr.web.app/q/${id}`;

        // Show result with QR
        const resultEl = document.getElementById('wqResult');
        const qrEl     = document.getElementById('wqQRCode');
        qrEl.innerHTML = '';
        new QRCode(qrEl, {
            text: redirectUrl,
            width: 200, height: 200,
            colorDark: '#000000', colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        const linkEl = document.getElementById('wqShortLink');
        linkEl.textContent = redirectUrl;
        linkEl.href        = redirectUrl;
        resultEl.classList.remove('hidden');

        wqEditingId = null;
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

// ── Download WhatsApp QR ──────────────────────────────────
function downloadWQR() {
    const canvas = document.querySelector('#wqQRCode canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'whatsapp-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ── Copy link ─────────────────────────────────────────────
function copyWQRLink() {
    const link = document.getElementById('wqShortLink').href;
    navigator.clipboard.writeText(link).then(() => {
        const btn = event.target;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy Link', 2000);
    });
}

// ── Load My QR Codes ──────────────────────────────────────
async function loadMyQRCodes() {
    const listEl   = document.getElementById('myQRList');
    const countEl  = document.getElementById('myQRCount');
    const section  = document.getElementById('myQRSection');
    section.classList.remove('hidden');
    listEl.innerHTML = '<p class="wq-loading">Loading your QR codes...</p>';

    try {
        const snap = await wqDB.collection('qr_codes')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

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

        // Generate mini QR codes
        snap.docs.forEach(doc => {
            const url = `https://create-your-qr.web.app/q/${doc.id}`;
            new QRCode(document.getElementById(`mini-${doc.id}`), {
                text: url, width: 80, height: 80,
                colorDark: '#000000', colorLight: '#ffffff'
            });
        });

    } catch (e) {
        console.error(e);
        listEl.innerHTML = '<p class="wq-empty">Failed to load QR codes.</p>';
    }
}

// ── Edit QR ───────────────────────────────────────────────
async function editQR(id) {
    const doc = await wqDB.collection('qr_codes').doc(id).get();
    if (!doc.exists) return;
    const d = doc.data();

    document.getElementById('wqName').value    = d.name;
    document.getElementById('wqPhone').value   = d.phone;
    document.getElementById('wqMessage').value = d.message;
    document.getElementById('wqResult').classList.add('hidden');

    wqEditingId = id;
    document.getElementById('wqSaveBtn').innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Update QR`;

    // Scroll to form
    document.getElementById('whatsappForm').scrollIntoView({ behavior: 'smooth' });
}

// ── Delete QR ─────────────────────────────────────────────
async function deleteQR(id) {
    if (!confirm('Delete this QR code? Anyone using this link will see an error.')) return;
    try {
        await wqDB.collection('qr_codes').doc(id).delete();
        loadMyQRCodes();
    } catch (e) {
        alert('Failed to delete. Please try again.');
    }
}

// ── Download from card ────────────────────────────────────
function downloadQRCard(id, url) {
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(tmp);
    new QRCode(tmp, {
        text: url, width: 400, height: 400,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
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

// ── Helpers ───────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
