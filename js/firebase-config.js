// Firebase Configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBDD6jyyNFQtvGO7gibliRBMcIFuM4OqjA",
  authDomain: "whiteboard-a794c.firebaseapp.com",
  projectId: "whiteboard-a794c",
  storageBucket: "whiteboard-a794c.firebasestorage.app",
  messagingSenderId: "996768687477",
  appId: "1:996768687477:web:f0dfeb45b7a9c92c4b9f3c"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();

// Auth State Listener
auth.onAuthStateChanged((user) => {
    console.log('Auth state changed:', user ? 'User logged in' : 'No user');
    
    const currentPage = window.location.pathname.split('/').pop();
    
    if (user) {
        // User is logged in
        if (currentPage === 'login.html' || currentPage === 'register.html' || currentPage === 'index.html') {
            // Check if profile is complete
            checkProfileComplete(user.uid);
        }
    } else {
        // User is logged out
        if (currentPage === 'dashboard.html' || currentPage === 'profile.html') {
            window.location.href = 'login.html';
        }
    }
});

// Check if user profile is complete
async function checkProfileComplete(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            // Profile exists, redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Profile doesn't exist, redirect to profile completion
            window.location.href = 'profile.html';
        }
    } catch (error) {
        console.error('Error checking profile:', error);
        // If there's an error, still go to profile page
        window.location.href = 'profile.html';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth, db, firebaseConfig };
}
