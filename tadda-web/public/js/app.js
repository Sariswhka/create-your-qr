const db = firebase.firestore();
var pvProductIdx = 0;
var pvImgIdx = 0;

// ── Product Viewer ──
const products = [
    {
        name: 'Regular Tee', gsm: '180 GSM', price: '₹200/pc',
        features: ['100% Cotton', 'Regular Casual Fit', 'Double Bio-Washed', 'Silicon Washed & Double Stitched'],
        sizes: 'S · M · L · XL',
        images: ['images/regular-tee-photo.jpg'],
    },
    {
        name: 'Oversized Tee', gsm: '220 GSM', price: '₹260/pc',
        features: ['100% Cotton', 'Oversized Fit', 'Double Bio-Washed', 'Silicon Washed & Double Stitched'],
        sizes: 'S · M · L · XL',
        images: ['images/oversized-220-photo.jpg'],
    },
    {
        name: 'Oversized Tee (Terry)', gsm: '240 GSM', price: '₹280/pc',
        features: ['100% Cotton Terry', 'Oversized Fit', 'Double Bio-Washed', 'Silicon Washed & Double Stitched'],
        sizes: 'S · M · L · XL',
        images: ['images/oversized-240-photo.jpg'],
    },
    {
        name: 'Polo (Collar Tee)', gsm: '220 GSM', price: '₹300/pc',
        features: ['100% Cotton Matty', 'Regular Polo Fit', 'Smooth Finish', 'Double Bio-Washed'],
        sizes: 'S · M · L · XL',
        images: ['images/polo-photo.jpg'],
    },
    {
        name: 'Sweatshirt', gsm: '350 GSM', price: '₹480/pc',
        features: ['100% Cotton Fleeced', 'Crew Neck / Pullover', 'Warm, Soft & Cozy', 'Double Bio-Washed'],
        sizes: 'S · M · L · XL',
        images: ['images/sweatshirt-photo.jpg'],
    },
    {
        name: 'Hoodie', gsm: '350 GSM', price: '₹505/pc',
        features: ['100% Cotton Fleeced', 'Regular Fit with Kangaroo Pocket', 'Thick, Soft & Cozy', 'Double Bio-Washed'],
        sizes: 'S · M · L · XL',
        images: ['images/hoodie-photo.jpg'],
    },
    {
        name: 'Kids Regular Tee', gsm: '180 GSM', price: '₹145/pc',
        features: ['100% Cotton', 'Regular Comfortable Fit', 'Double Bio-Washed', 'Silicon Washed & Double Stitched'],
        sizes: '5–6 · 7–8 · 9–10 · 11–12 · 13–14 yrs',
        images: ['images/kids-tee-photo.jpg'],
    },
];


function openProduct(idx) {
    pvProductIdx = idx;
    pvImgIdx = 0;
    renderProductViewer();
    document.getElementById('pvOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function renderProductViewer() {
    const p = products[pvProductIdx];
    document.getElementById('pvImg').src = p.images[pvImgIdx];
    document.getElementById('pvCounter').textContent = `${pvImgIdx + 1} / ${p.images.length}`;
    document.getElementById('pvGsm').textContent = p.gsm;
    document.getElementById('pvName').textContent = p.name;
    document.getElementById('pvPrice').textContent = p.price;
    document.getElementById('pvFeatures').innerHTML = p.features.map(f => `<li>${f}</li>`).join('');
    document.getElementById('pvSizes').textContent = p.sizes;
    document.getElementById('pvPrev').style.display = pvImgIdx === 0 ? 'none' : 'flex';
    document.getElementById('pvNext').style.display = pvImgIdx === p.images.length - 1 ? 'none' : 'flex';
}

document.getElementById('pvClose').addEventListener('click', () => {
    document.getElementById('pvOverlay').classList.add('hidden');
    document.body.style.overflow = '';
});
document.getElementById('pvOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('pvOverlay')) {
        document.getElementById('pvOverlay').classList.add('hidden');
        document.body.style.overflow = '';
    }
});
document.getElementById('pvPrev').addEventListener('click', () => {
    if (pvImgIdx > 0) { pvImgIdx--; renderProductViewer(); }
});
document.getElementById('pvNext').addEventListener('click', () => {
    const p = products[pvProductIdx];
    if (pvImgIdx < p.images.length - 1) { pvImgIdx++; renderProductViewer(); }
});
// Keyboard navigation
document.addEventListener('keydown', e => {
    if (document.getElementById('pvOverlay').classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') document.getElementById('pvNext').click();
    if (e.key === 'ArrowLeft') document.getElementById('pvPrev').click();
    if (e.key === 'Escape') document.getElementById('pvClose').click();
});

// Nav scroll effect
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile nav toggle
document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
});

// Close nav on link click
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('navLinks').classList.remove('open');
    });
});

// Brand Owner Registration Modal
const regModal = document.getElementById('regModal');
document.getElementById('brandOwnerBtn').addEventListener('click', (e) => {
    e.preventDefault();
    regModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
});
document.getElementById('regModalClose').addEventListener('click', () => {
    regModal.classList.add('hidden');
    document.body.style.overflow = '';
});
regModal.addEventListener('click', (e) => {
    if (e.target === regModal) {
        regModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
});

document.getElementById('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('regBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    try {
        const phone = document.getElementById('regPhone').value.trim();
        const email = document.getElementById('regEmail').value.trim() || '';

        // Check for duplicate phone
        const phoneKey = 'phone_' + phone.replace(/\D/g, '');
        const phoneCheck = await db.collection('reg_index').doc(phoneKey).get();
        if (phoneCheck.exists) {
            alert('This phone number is already registered. Please WhatsApp us at 7042828078 if you need help.');
            btn.disabled = false;
            btn.textContent = 'Submit Registration Request';
            return;
        }

        // Check for duplicate email (if provided)
        if (email) {
            const emailKey = 'email_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const emailCheck = await db.collection('reg_index').doc(emailKey).get();
            if (emailCheck.exists) {
                alert('This email address is already registered. Please WhatsApp us at 7042828078 if you need help.');
                btn.disabled = false;
                btn.textContent = 'Submit Registration Request';
                return;
            }
        }

        const data = {
            name:      document.getElementById('regName').value.trim(),
            phone,
            email,
            city:      document.getElementById('regCity').value.trim(),
            brand:     document.getElementById('regBrand').value.trim() || '',
            source:    document.getElementById('regSource').value || '',
            message:   document.getElementById('regMessage').value.trim() || '',
            status:    'new',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // Save registration + index entries atomically
        const batch = db.batch();
        const regRef = db.collection('registrations').doc();
        batch.set(regRef, data);
        batch.set(db.collection('reg_index').doc(phoneKey), { type: 'phone', regId: regRef.id });
        if (email) {
            const emailKey = 'email_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
            batch.set(db.collection('reg_index').doc(emailKey), { type: 'email', regId: regRef.id });
        }
        await batch.commit();

        // Email notification (non-blocking)
        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                access_key: window.WEB3FORMS_KEY || '',
                subject: `New Brand Owner Registration — ${data.name}`,
                from_name: data.name,
                message: `New brand owner registration!\n\nName: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email || '—'}\nCity: ${data.city}\nBrand Name: ${data.brand || '—'}\nSource: ${data.source || '—'}\nMessage: ${data.message || '—'}\n\nView in admin: https://taddaportal.web.app/admin.html`,
            })
        }).catch(() => {});

        document.getElementById('regSuccess').classList.remove('hidden');
        document.getElementById('regForm').querySelectorAll('input,select,textarea').forEach(el => el.disabled = true);
        btn.textContent = '✓ Submitted';
    } catch {
        alert('Failed to submit. Please WhatsApp us directly at 7042828078.');
        btn.disabled = false;
        btn.textContent = 'Submit Registration Request';
    }
});

// Contact form via Web3Forms
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('cfBtn');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
        const resp = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                access_key: window.WEB3FORMS_KEY || '',
                subject: `Website Enquiry from ${document.getElementById('cfName').value}`,
                from_name: document.getElementById('cfName').value,
                phone: document.getElementById('cfPhone').value,
                email: document.getElementById('cfEmail').value,
                message: document.getElementById('cfMessage').value,
            })
        });
        const result = await resp.json();
        if (result.success) {
            document.getElementById('cfSuccess').classList.remove('hidden');
            e.target.reset();
        } else {
            throw new Error('Failed');
        }
    } catch {
        alert('Failed to send message. Please call or WhatsApp us directly at 7042828078.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
    }
});
