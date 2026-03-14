// Firestore Instrumentation — logs user and QR activity for the app owner
const db = firebase.firestore();

/**
 * Called on every login. Upserts the user document and logs a login event.
 */
function trackLogin(user) {
    const userRef = db.collection('users').doc(user.uid);

    userRef.get().then(doc => {
        const data = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            loginCount: firebase.firestore.FieldValue.increment(1)
        };
        if (!doc.exists) {
            data.firstSeen = firebase.firestore.FieldValue.serverTimestamp();
        }
        return userRef.set(data, { merge: true });
    }).catch(console.error);

    logEvent('login', user, {});
}

/**
 * Called when a QR code is successfully generated.
 */
function trackQRGenerated(user, url, color, frame) {
    logEvent('generate_qr', user, { url, color, frame });
}

/**
 * Called when a QR code is downloaded.
 */
function trackQRDownloaded(user, url) {
    logEvent('download_qr', user, { url });
}

/**
 * Called when a QR code is sent by email.
 */
function trackQREmailed(user, url) {
    logEvent('email_qr', user, { url });
}

/**
 * Generic event logger — writes to /events collection.
 */
function logEvent(type, user, extra) {
    db.collection('events').add({
        type,
        userId: user.uid,
        userEmail: user.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ...extra
    }).catch(console.error);
}
