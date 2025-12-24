// Authentication Functions for EduSphere Pro
class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.currentUser = null;
        this.authStateListeners = [];
    }

    // Initialize auth manager
    async init() {
        return new Promise((resolve, reject) => {
            this.auth.onAuthStateChanged(async (user) => {
                this.currentUser = user;
                
                // Notify all listeners
                this.authStateListeners.forEach(callback => callback(user));
                
                if (user) {
                    console.log('User authenticated:', user.email);
                    
                    // Update last login timestamp
                    try {
                        await this.db.collection('users').doc(user.uid).update({
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } catch (error) {
                        // User might not have a profile yet, that's okay
                        console.log('No profile found for user, will be created later');
                    }
                } else {
                    console.log('No user authenticated');
                }
                
                resolve(user);
            }, reject);
        });
    }

    // Login with email and password
    async login(email, password, rememberMe = false) {
        try {
            // Validate inputs
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Set persistence based on remember me
            const persistence = rememberMe ? 
                firebase.auth.Auth.Persistence.LOCAL : 
                firebase.auth.Auth.Persistence.SESSION;
            
            await this.auth.setPersistence(persistence);
            
            // Sign in
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Login successful for:', user.email);
            
            // Return user data
            return {
                uid: user.uid,
                email: user.email,
                emailVerified: user.emailVerified,
                displayName: user.displayName
            };
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Format error message for user
            let userMessage = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    userMessage = 'Invalid email address format.';
                    break;
                case 'auth/user-disabled':
                    userMessage = 'This account has been disabled.';
                    break;
                case 'auth/user-not-found':
                    userMessage = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    userMessage = 'Incorrect password.';
                    break;
                case 'auth/too-many-requests':
                    userMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    userMessage = 'Network error. Please check your connection.';
                    break;
            }
            
            throw new Error(userMessage);
        }
    }

    // Register new user
    async register(email, password, sendVerification = true) {
        try {
            // Validate inputs
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }
            
            // Create user
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Registration successful for:', user.email);
            
            // Send verification email if requested
            if (sendVerification) {
                try {
                    await user.sendEmailVerification();
                    console.log('Verification email sent to:', email);
                } catch (verificationError) {
                    console.warn('Could not send verification email:', verificationError);
                    // Don't throw error, registration was successful
                }
            }
            
            // Create initial user document in Firestore
            await this.createUserDocument(user.uid, {
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                emailVerified: user.emailVerified
            });
            
            // Return user data
            return {
                uid: user.uid,
                email: user.email,
                emailVerified: user.emailVerified
            };
            
        } catch (error) {
            console.error('Registration error:', error);
            
            // Format error message for user
            let userMessage = 'Registration failed. Please try again.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    userMessage = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'Invalid email address format.';
                    break;
                case 'auth/operation-not-allowed':
                    userMessage = 'Email/password accounts are not enabled.';
                    break;
                case 'auth/weak-password':
                    userMessage = 'Password is too weak. Please use a stronger password.';
                    break;
                case 'auth/network-request-failed':
                    userMessage = 'Network error. Please check your connection.';
                    break;
            }
            
            throw new Error(userMessage);
        }
    }

    // Create user document in Firestore
    async createUserDocument(userId, userData) {
        try {
            await this.db.collection('users').doc(userId).set(userData, { merge: true });
            console.log('User document created for:', userId);
            return true;
        } catch (error) {
            console.error('Error creating user document:', error);
            throw error;
        }
    }

    // Logout user
    async logout() {
        try {
            await this.auth.signOut();
            console.log('User logged out');
            
            // Clear local data
            this.clearLocalData();
            
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            throw new Error('Logout failed. Please try again.');
        }
    }

    // Clear local data
    clearLocalData() {
        // Clear any authentication-related local storage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('firebase:') || key.startsWith('auth_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear session storage
        sessionStorage.clear();
    }

    // Reset password
    async resetPassword(email) {
        try {
            if (!email) {
                throw new Error('Email is required');
            }
            
            await this.auth.sendPasswordResetEmail(email);
            console.log('Password reset email sent to:', email);
            
            return true;
        } catch (error) {
            console.error('Password reset error:', error);
            
            let userMessage = 'Failed to send password reset email.';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    userMessage = 'Invalid email address format.';
                    break;
                case 'auth/user-not-found':
                    userMessage = 'No account found with this email.';
                    break;
                case 'auth/too-many-requests':
                    userMessage = 'Too many attempts. Please try again later.';
                    break;
            }
            
            throw new Error(userMessage);
        }
    }

    // Change password (requires reauthentication for security)
    async changePassword(currentPassword, newPassword) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No user is logged in');
            }
            
            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters long');
            }
            
            // Reauthenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            
            // Update password
            await user.updatePassword(newPassword);
            
            console.log('Password changed successfully');
            return true;
            
        } catch (error) {
            console.error('Change password error:', error);
            
            let userMessage = 'Failed to change password.';
            
            switch (error.code) {
                case 'auth/wrong-password':
                    userMessage = 'Current password is incorrect.';
                    break;
                case 'auth/weak-password':
                    userMessage = 'New password is too weak.';
                    break;
                case 'auth/requires-recent-login':
                    userMessage = 'Please login again to change your password.';
                    break;
            }
            
            throw new Error(userMessage);
        }
    }

    // Update email
    async updateEmail(newEmail, password) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No user is logged in');
            }
            
            // Reauthenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);
            
            // Update email
            await user.updateEmail(newEmail);
            
            // Update in Firestore
            await this.db.collection('users').doc(user.uid).update({
                email: newEmail,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Email updated to:', newEmail);
            return true;
            
        } catch (error) {
            console.error('Update email error:', error);
            
            let userMessage = 'Failed to update email.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    userMessage = 'This email is already in use by another account.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'Invalid email address format.';
                    break;
                case 'auth/requires-recent-login':
                    userMessage = 'Please login again to update your email.';
                    break;
            }
            
            throw new Error(userMessage);
        }
    }

    // Send email verification
    async sendEmailVerification() {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No user is logged in');
            }
            
            await user.sendEmailVerification();
            console.log('Verification email sent');
            
            return true;
        } catch (error) {
            console.error('Send verification error:', error);
            throw new Error('Failed to send verification email.');
        }
    }

    // Delete user account
    async deleteAccount(password) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No user is logged in');
            }
            
            // Reauthenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);
            
            // Delete from Firestore first
            await this.db.collection('users').doc(user.uid).delete();
            
            // Delete user account
            await user.delete();
            
            console.log('User account deleted');
            this.clearLocalData();
            
            return true;
        } catch (error) {
            console.error('Delete account error:', error);
            
            let userMessage = 'Failed to delete account.';
            
            switch (error.code) {
                case 'auth/wrong-password':
                    userMessage = 'Password is incorrect.';
                    break;
                case 'auth/requires-recent-login':
                    userMessage = 'Please login again to delete your account.';
                    break;
            }
            
            throw new Error(userMessage);
        }
    }

    // Get current user data
    getCurrentUser() {
        return this.currentUser ? {
            uid: this.currentUser.uid,
            email: this.currentUser.email,
            emailVerified: this.currentUser.emailVerified,
            displayName: this.currentUser.displayName
        } : null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Add auth state change listener
    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }

    // Get user token (for API calls)
    async getToken() {
        try {
            if (!this.currentUser) {
                return null;
            }
            
            const token = await this.currentUser.getIdToken();
            return token;
        } catch (error) {
            console.error('Get token error:', error);
            return null;
        }
    }

    // Refresh token
    async refreshToken() {
        try {
            if (!this.currentUser) {
                return null;
            }
            
            await this.currentUser.getIdToken(true); // Force refresh
            const newToken = await this.getToken();
            return newToken;
        } catch (error) {
            console.error('Refresh token error:', error);
            return null;
        }
    }

    // Validate email format
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Validate password strength
    validatePasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            hasLower: /[a-z]/.test(password),
            hasUpper: /[A-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const score = Object.values(checks).filter(Boolean).length;
        
        return {
            score: score,
            maxScore: 5,
            checks: checks,
            strength: score < 2 ? 'Weak' : score < 4 ? 'Moderate' : 'Strong'
        };
    }

    // Get user profile from Firestore
    async getUserProfile() {
        try {
            if (!this.currentUser) {
                return null;
            }
            
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            
            if (userDoc.exists) {
                return { id: userDoc.id, ...userDoc.data() };
            }
            
            return null;
        } catch (error) {
            console.error('Get user profile error:', error);
            return null;
        }
    }

    // Update user profile in Firestore
    async updateUserProfile(profileData) {
        try {
            if (!this.currentUser) {
                throw new Error('No user is logged in');
            }
            
            // Add update timestamp
            const updates = {
                ...profileData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await this.db.collection('users').doc(this.currentUser.uid).update(updates);
            
            console.log('User profile updated');
            return true;
        } catch (error) {
            console.error('Update user profile error:', error);
            throw error;
        }
    }
}

// Initialize Auth Manager
const authManager = new AuthManager();

// Initialize when Firebase is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be initialized
    if (firebase.apps.length > 0) {
        authManager.init().catch(console.error);
    }
});

// Export functions for global use
window.authManager = authManager;

// Convenience functions
async function loginUser(email, password, rememberMe = false) {
    return await authManager.login(email, password, rememberMe);
}

async function registerUser(email, password, sendVerification = true) {
    return await authManager.register(email, password, sendVerification);
}

async function logoutUser() {
    return await authManager.logout();
}

async function resetPassword(email) {
    return await authManager.resetPassword(email);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        authManager,
        loginUser,
        registerUser,
        logoutUser,
        resetPassword
    };
}
