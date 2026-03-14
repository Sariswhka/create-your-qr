// QR Code Generator Logic
let qrcode = null;
let currentUser = null;
let currentQRUrl = null;
let selectedColor = '#000000';
let selectedFrame = 'none';

// Listen for auth state changes
firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
});

// Color selection
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = btn.dataset.color;
    });
});

// Frame selection
document.querySelectorAll('.frame-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.frame-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFrame = btn.dataset.frame;
    });
});

function isValidURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function generateQR() {
    const urlInput = document.getElementById('urlInput');
    const qrContainer = document.getElementById('qrContainer');
    const qrcodeDiv = document.getElementById('qrcode');
    const errorMessage = document.getElementById('errorMessage');
    const urlDisplay = document.getElementById('urlDisplay');
    const emailStatus = document.getElementById('emailStatus');
    const qrFrame = document.getElementById('qrFrame');
    const frameTextTop = document.getElementById('frameTextTop');
    const frameTextBottom = document.getElementById('frameTextBottom');

    let url = urlInput.value.trim();

    // Add https:// if no protocol specified
    if (url && !url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
        urlInput.value = url;
    }

    // Validate URL
    if (!url || !isValidURL(url)) {
        errorMessage.style.display = 'block';
        qrContainer.classList.remove('active');
        return;
    }

    errorMessage.style.display = 'none';
    emailStatus.textContent = '';
    emailStatus.className = 'email-status';

    // Clear previous QR code
    qrcodeDiv.innerHTML = '';

    // Generate new QR code with selected color
    qrcode = new QRCode(qrcodeDiv, {
        text: url,
        width: 200,
        height: 200,
        colorDark: selectedColor,
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });

    // Apply frame styles
    qrFrame.className = 'qr-frame';
    qrFrame.style.borderColor = selectedColor;
    frameTextTop.style.color = selectedColor;
    frameTextBottom.style.color = selectedColor;
    frameTextTop.textContent = '';
    frameTextBottom.textContent = '';

    switch(selectedFrame) {
        case 'scan-me':
            qrFrame.classList.add('has-frame');
            frameTextTop.textContent = 'SCAN ME';
            break;
        case 'scan-here':
            qrFrame.classList.add('has-frame');
            frameTextBottom.textContent = 'SCAN HERE';
            break;
        case 'point':
            qrFrame.classList.add('has-frame', 'point-style');
            break;
        default:
            // No frame
            break;
    }

    // Store current URL
    currentQRUrl = url;

    // Show QR container and URL
    qrContainer.classList.add('active');
    urlDisplay.textContent = url;

    // Track QR generation in Google Analytics
    gtag('event', 'generate_qr', {
        'event_category': 'QR Code',
        'event_label': url,
        'color': selectedColor,
        'frame': selectedFrame
    });

    // Track in Firestore
    if (currentUser) trackQRGenerated(currentUser, url, selectedColor, selectedFrame);
}

function downloadQR() {
    const qrFrameWrapper = document.getElementById('qrFrameWrapper');

    // Use html2canvas to capture the frame with QR code
    if (typeof html2canvas !== 'undefined') {
        html2canvas(qrFrameWrapper, {
            backgroundColor: null,
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Track download in Google Analytics
            gtag('event', 'download_qr', {
                'event_category': 'QR Code',
                'event_label': currentQRUrl
            });

            // Track in Firestore
            if (currentUser) trackQRDownloaded(currentUser, currentQRUrl);
        });
    } else {
        // Fallback to simple QR download
        const qrcodeDiv = document.getElementById('qrcode');
        const canvas = qrcodeDiv.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Track download in Google Analytics
            gtag('event', 'download_qr', {
                'event_category': 'QR Code',
                'event_label': currentQRUrl
            });

            // Track in Firestore
            if (currentUser) trackQRDownloaded(currentUser, currentQRUrl);
        }
    }
}

async function sendToEmail() {
    if (!currentUser) {
        alert('Please sign in to send QR code to email');
        return;
    }

    const emailBtn = document.getElementById('emailBtn');
    const emailStatus = document.getElementById('emailStatus');
    const qrFrameWrapper = document.getElementById('qrFrameWrapper');

    if (!currentQRUrl) {
        emailStatus.textContent = 'Please generate a QR code first';
        emailStatus.className = 'email-status error';
        return;
    }

    // Disable button while sending
    emailBtn.disabled = true;
    emailBtn.textContent = 'Sending...';
    emailStatus.textContent = '';

    try {
        let qrImageData;

        // Try to capture with frame using html2canvas
        if (typeof html2canvas !== 'undefined') {
            const canvas = await html2canvas(qrFrameWrapper, {
                backgroundColor: '#ffffff',
                scale: 2
            });
            qrImageData = canvas.toDataURL('image/png');
        } else {
            // Fallback to simple QR
            const qrcodeDiv = document.getElementById('qrcode');
            const canvas = qrcodeDiv.querySelector('canvas');
            qrImageData = canvas.toDataURL('image/png');
        }

        // Send email using EmailJS
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: currentUser.email,
            to_name: currentUser.displayName || 'User',
            qr_url: currentQRUrl,
            qr_image: qrImageData
        });

        emailStatus.textContent = `QR code sent to ${currentUser.email}`;
        emailStatus.className = 'email-status success';

        // Track email send in Google Analytics
        gtag('event', 'email_qr', {
            'event_category': 'QR Code',
            'event_label': currentQRUrl
        });

        // Track in Firestore
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

// Generate QR on Enter key press
document.getElementById('urlInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        generateQR();
    }
});
