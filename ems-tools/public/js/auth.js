// Authentication Logic
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// DOM Elements
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userPhoto = document.getElementById('userPhoto');

// Auth State Observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        loginSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        userName.textContent = user.displayName || user.email;
        userPhoto.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User');
    } else {
        // User is signed out
        loginSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    }
});

// Google Sign In
googleLoginBtn.addEventListener('click', () => {
    auth.signInWithPopup(provider)
        .catch((error) => {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        });
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});
