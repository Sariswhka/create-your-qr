// imgtools analytics — tracks feature usage, logins, and location
// Stores to Firestore: /imgtools_events/{auto-id} and /users/{uid}
// Never stores image content — only action metadata

// Fetched once at login, reused for all events in the session
window._analyticsGeo = null;

async function fetchGeo() {
    if (window._analyticsGeo) return window._analyticsGeo;
    try {
        const res  = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        window._analyticsGeo = {
            country:     data.country_name || null,
            countryCode: data.country_code || null,
            city:        data.city         || null,
            region:      data.region       || null,
        };
    } catch (_) {
        window._analyticsGeo = { country: null, countryCode: null, city: null, region: null };
    }
    return window._analyticsGeo;
}

// Called from auth.js on every successful sign-in
async function trackLogin(user) {
    if (!user) return;
    const geo = await fetchGeo();

    try {
        const ref  = db.collection('users').doc(user.uid);
        const snap = await ref.get();
        const data = snap.exists ? snap.data() : {};

        await ref.set({
            email:       user.email,
            displayName: user.displayName || null,
            photoURL:    user.photoURL    || null,
            firstSeen:   data.firstSeen   || firebase.firestore.FieldValue.serverTimestamp(),
            lastSeen:    firebase.firestore.FieldValue.serverTimestamp(),
            loginCount:  firebase.firestore.FieldValue.increment(1),
            country:     geo.country     || data.country     || null,
            countryCode: geo.countryCode || data.countryCode || null,
            city:        geo.city        || data.city        || null,
        }, { merge: true });

        await db.collection('imgtools_events').add({
            type:        'login',
            userId:      user.uid,
            userEmail:   user.email,
            isPro:       !!(window.userProData?.isPro || window.userProData?.isProBundle),
            country:     geo.country,
            countryCode: geo.countryCode,
            city:        geo.city,
            timestamp:   firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
        console.warn('analytics trackLogin failed', e);
    }
}

// Generic event tracker — call this for any feature usage
async function trackEvent(type, extra = {}) {
    const user = window.currentUser;
    if (!user) return;
    const geo = window._analyticsGeo || {};

    try {
        await db.collection('imgtools_events').add({
            type,
            userId:      user.uid,
            userEmail:   user.email,
            isPro:       !!(window.userProData?.isPro || window.userProData?.isProBundle),
            isOnTrial:   !!window.isOnTrial,
            country:     geo.country     || null,
            countryCode: geo.countryCode || null,
            city:        geo.city        || null,
            timestamp:   firebase.firestore.FieldValue.serverTimestamp(),
            ...extra,
        });
    } catch (e) {
        console.warn('analytics trackEvent failed', e);
    }
}
