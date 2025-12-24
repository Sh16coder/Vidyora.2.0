// Authentication Functions
class Auth {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
    }

    // Login user with email and password
    async loginUser(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('User logged in:', user.email);
            
            // Check if email is verified
            if (!user.emailVerified) {
                console.log('Email not verified');
                // You can show a message to user to verify email
            }
            
            return user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Register new user
    async registerUser(email, password, sendVerification = true) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('User registered:', user.email);
            
            // Send email verification if requested
            if (sendVerification) {
                await user.sendEmailVerification();
                console.log('Verification email sent');
            }
            
            // Create initial user document in Firestore
            await this.createUserDocument(user.uid, {
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return user;
        } catch (error) {
            console.error('Registration error:', error);
            
            // If registration fails but user was created, delete the user
            if (error.code === 'auth/email-already-in-use') {
                const existingUser = await this.auth.fetchSignInMethodsForEmail(email);
                if (existingUser.length > 0) {
                    throw new Error('email-already-in-use');
                }
            }
            
            throw error;
        }
    }

    // Create user document in Firestore
    async createUserDocument(userId, userData) {
        try {
            await this.db.collection('users').doc(userId).set(userData, { merge: true });
            console.log('User document created for:', userId);
        } catch (error) {
            console.error('Error creating user document:', error);
            throw error;
        }
    }

    // Logout user
    async logoutUser() {
        try {
            await this.auth.signOut();
            console.log('User logged out');
            
            // Clear any local storage
            localStorage.removeItem('userProfile');
            sessionStorage.clear();
            
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            console.log('Password reset email sent to:', email);
            return true;
        } catch (error) {
            console.error('Password reset error:', error);
            
            // Handle specific errors
            if (error.code === 'auth/user-not-found') {
                throw new Error('No user found with this email address');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Invalid email address');
            } else {
                throw error;
            }
        }
    }

    // Get current user
    getCurrentUser() {
        return this.auth.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.auth.currentUser !== null;
    }

    // Get user ID
    getUserId() {
        const user = this.auth.currentUser;
        return user ? user.uid : null;
    }

    // Update user email
    async updateUserEmail(newEmail) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');
            
            await user.updateEmail(newEmail);
            console.log('Email updated to:', newEmail);
            
            // Update in Firestore
            await this.db.collection('users').doc(user.uid).update({
                email: newEmail,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Email update error:', error);
            throw error;
        }
    }

    // Update user password
    async updateUserPassword(newPassword) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');
            
            await user.updatePassword(newPassword);
            console.log('Password updated');
            
            return true;
        } catch (error) {
            console.error('Password update error:', error);
            throw error;
        }
    }

    // Delete user account
    async deleteUserAccount() {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');
            
            // Delete from Firestore first
            await this.db.collection('users').doc(user.uid).delete();
            
            // Delete from Authentication
            await user.delete();
            
            console.log('User account deleted');
            
            // Clear local storage
            localStorage.clear();
            sessionStorage.clear();
            
            return true;
        } catch (error) {
            console.error('Account deletion error:', error);
            throw error;
        }
    }

    // Re-authenticate user (required for sensitive operations)
    async reauthenticateUser(password) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');
            
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.reauthenticateWithCredential(credential);
            
            console.log('User re-authenticated');
            return true;
        } catch (error) {
            console.error('Re-authentication error:', error);
            throw error;
        }
    }

    // Get auth state changes
    onAuthStateChanged(callback) {
        return this.auth.onAuthStateChanged(callback);
    }

    // Get user token
    async getUserToken() {
        try {
            const user = this.auth.currentUser;
            if (!user) return null;
            
            const token = await user.getIdToken();
            return token;
        } catch (error) {
            console.error('Token error:', error);
            return null;
        }
    }

    // Check if email is verified
    isEmailVerified() {
        const user = this.auth.currentUser;
        return user ? user.emailVerified : false;
    }

    // Send email verification
    async sendEmailVerification() {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('No user logged in');
            
            await user.sendEmailVerification();
            console.log('Verification email sent');
            return true;
        } catch (error) {
            console.error('Verification email error:', error);
            throw error;
        }
    }

    // Get user profile from Firestore
    async getUserProfile(userId = null) {
        try {
            const targetUserId = userId || this.getUserId();
            if (!targetUserId) throw new Error('No user ID provided');
            
            const userDoc = await this.db.collection('users').doc(targetUserId).get();
            
            if (userDoc.exists) {
                return { id: userDoc.id, ...userDoc.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    }
}

// Initialize Auth
const auth = new Auth();

// Export functions for global use
async function loginUser(email, password) {
    return await auth.loginUser(email, password);
}

async function registerUser(email, password, sendVerification = true) {
    return await auth.registerUser(email, password, sendVerification);
}

async function logoutUser() {
    return await auth.logoutUser();
}

async function resetPassword(email) {
    return await auth.resetPassword(email);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        auth,
        loginUser,
        registerUser,
        logoutUser,
        resetPassword
    };
}

// Make available globally
window.auth = auth;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.resetPassword = resetPassword;
