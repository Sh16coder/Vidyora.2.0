// Profile Management Functions
class ProfileManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.storage = firebase.storage ? firebase.storage() : null;
        this.currentUser = null;
        this.profileData = null;
    }

    // Initialize profile manager
    async init() {
        this.currentUser = this.auth.currentUser;
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        return this.currentUser;
    }

    // Save profile to Firestore (using Base64 for images)
    async saveProfile(fullName, phone, className, profileImageBase64 = null) {
        try {
            await this.init();
            
            const profileData = {
                fullName: fullName.trim(),
                phone: phone.trim(),
                class: className,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add profile image if provided
            if (profileImageBase64) {
                // Validate Base64 string
                if (this.isValidBase64(profileImageBase64)) {
                    // Check if Base64 string is too large (Firestore has 1MB limit)
                    const base64Size = this.getBase64Size(profileImageBase64);
                    const maxSize = 1 * 1024 * 1024; // 1MB
                    
                    if (base64Size > maxSize) {
                        throw new Error('Image is too large. Please use a smaller image or compress it further.');
                    }
                    
                    profileData.profileImage = profileImageBase64;
                    profileData.hasProfileImage = true;
                } else {
                    throw new Error('Invalid image format');
                }
            }
            
            // Add email from auth if not already in profile
            if (!profileData.email) {
                profileData.email = this.currentUser.email;
            }
            
            // Add creation timestamp if this is the first time
            const existingDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            if (!existingDoc.exists) {
                profileData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                profileData.userId = this.currentUser.uid;
            }
            
            // Save to Firestore
            await this.db.collection('users').doc(this.currentUser.uid).set(profileData, { merge: true });
            
            console.log('Profile saved successfully');
            this.profileData = profileData;
            
            return profileData;
        } catch (error) {
            console.error('Error saving profile:', error);
            throw error;
        }
    }

    // Get user profile
    async getProfile() {
        try {
            await this.init();
            
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            
            if (userDoc.exists) {
                this.profileData = { id: userDoc.id, ...userDoc.data() };
                return this.profileData;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting profile:', error);
            throw error;
        }
    }

    // Update profile fields
    async updateProfile(updates) {
        try {
            await this.init();
            
            // Add update timestamp
            updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Update in Firestore
            await this.db.collection('users').doc(this.currentUser.uid).update(updates);
            
            // Update local profile data
            if (this.profileData) {
                this.profileData = { ...this.profileData, ...updates };
            }
            
            console.log('Profile updated successfully');
            return this.profileData;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    // Update profile image
    async updateProfileImage(imageBase64) {
        try {
            if (!this.isValidBase64(imageBase64)) {
                throw new Error('Invalid Base64 image format');
            }
            
            // Check size
            const base64Size = this.getBase64Size(imageBase64);
            const maxSize = 1 * 1024 * 1024; // 1MB
            if (base64Size > maxSize) {
                throw new Error('Image is too large. Maximum size is 1MB.');
            }
            
            const updates = {
                profileImage: imageBase64,
                hasProfileImage: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            return await this.updateProfile(updates);
        } catch (error) {
            console.error('Error updating profile image:', error);
            throw error;
        }
    }

    // Delete profile image
    async deleteProfileImage() {
        try {
            const updates = {
                profileImage: null,
                hasProfileImage: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            return await this.updateProfile(updates);
        } catch (error) {
            console.error('Error deleting profile image:', error);
            throw error;
        }
    }

    // Check if profile is complete
    async isProfileComplete() {
        try {
            const profile = await this.getProfile();
            
            if (!profile) return false;
            
            // Check required fields
            const requiredFields = ['fullName', 'phone', 'class'];
            for (const field of requiredFields) {
                if (!profile[field] || profile[field].trim() === '') {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error checking profile completeness:', error);
            return false;
        }
    }

    // Get class teacher based on class
    getClassTeacher(className) {
        const teachers = {
            '9A': 'Mrs. Sharma',
            '9B': 'Mr. Verma',
            '10A': 'Ms. Patel',
            '10B': 'Mr. Singh',
            '11A': 'Dr. Kumar',
            '11B': 'Mrs. Gupta',
            '12A': 'Mr. Joshi',
            '12B': 'Ms. Reddy'
        };
        
        return teachers[className] || 'Not assigned';
    }

    // Get stream based on class
    getStreamFromClass(className) {
        const scienceClasses = ['9A', '9B', '10A', '10B', '11A', '12A'];
        const commerceClasses = ['11B', '12B'];
        
        if (scienceClasses.includes(className)) {
            return 'Science';
        } else if (commerceClasses.includes(className)) {
            return 'Commerce';
        }
        
        return 'General';
    }

    // Get subjects based on stream
    getSubjectsByStream(stream) {
        const subjects = {
            'Science': [
                'Mathematics',
                'Physics',
                'Chemistry',
                'English',
                'Hindi',
                'Computer Science'
            ],
            'Commerce': [
                'Accountancy',
                'Business Studies',
                'Economics',
                'English',
                'Hindi',
                'Informatics Practices'
            ],
            'General': [
                'English',
                'Hindi',
                'Mathematics',
                'Science',
                'Social Studies',
                'Computer Science'
            ]
        };
        
        return subjects[stream] || subjects['General'];
    }

    // Compress image using browser-image-compression
    async compressImage(file, options = {}) {
        try {
            const defaultOptions = {
                maxSizeMB: 0.5, // Max 500KB
                maxWidthOrHeight: 800, // Max dimension
                useWebWorker: true,
                fileType: 'image/jpeg',
                initialQuality: 0.8
            };
            
            const compressionOptions = { ...defaultOptions, ...options };
            
            // Validate file
            if (!file || !file.type.startsWith('image/')) {
                throw new Error('Please select a valid image file');
            }
            
            // Check if browser-image-compression is available
            if (typeof imageCompression === 'undefined') {
                throw new Error('Image compression library not loaded');
            }
            
            console.log('Original file size:', this.formatFileSize(file.size));
            
            // Compress image
            const compressedFile = await imageCompression(file, compressionOptions);
            
            console.log('Compressed file size:', this.formatFileSize(compressedFile.size));
            console.log('Compression ratio:', Math.round((1 - compressedFile.size / file.size) * 100) + '%');
            
            return compressedFile;
        } catch (error) {
            console.error('Image compression error:', error);
            throw error;
        }
    }

    // Convert file to Base64
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Validate Base64 string
    isValidBase64(str) {
        if (typeof str !== 'string') return false;
        
        // Check if it's a data URL
        if (!str.startsWith('data:image/')) return false;
        
        try {
            // Extract the Base64 part
            const base64Data = str.split(',')[1];
            if (!base64Data) return false;
            
            // Check if it's valid Base64
            const binary = atob(base64Data);
            
            // Check if it's a reasonable size (not too small, not too large)
            if (binary.length < 100) return false; // Too small to be a real image
            if (binary.length > 2 * 1024 * 1024) return false; // Too large (2MB)
            
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get size of Base64 string in bytes
    getBase64Size(base64String) {
        try {
            const base64Data = base64String.split(',')[1];
            if (!base64Data) return 0;
            
            // Base64 size calculation: (string_length * 3/4) - padding
            const stringLength = base64Data.length;
            const paddingCount = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
            return (stringLength * 3) / 4 - paddingCount;
        } catch (error) {
            return 0;
        }
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Validate phone number
    validatePhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10;
    }

    // Validate name
    validateName(name) {
        return name && name.trim().length >= 2 && name.trim().length <= 50;
    }

    // Validate class selection
    validateClass(className) {
        const validClasses = ['9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'];
        return validClasses.includes(className);
    }

    // Get all valid classes
    getValidClasses() {
        return [
            { value: '9A', label: 'Class 9A' },
            { value: '9B', label: 'Class 9B' },
            { value: '10A', label: 'Class 10A' },
            { value: '10B', label: 'Class 10B' },
            { value: '11A', label: 'Class 11A' },
            { value: '11B', label: 'Class 11B' },
            { value: '12A', label: 'Class 12A' },
            { value: '12B', label: 'Class 12B' }
        ];
    }
}

// Initialize Profile Manager
const profileManager = new ProfileManager();

// Export functions for global use
async function saveProfileToFirestore(fullName, phone, className, profileImageBase64 = null) {
    return await profileManager.saveProfile(fullName, phone, className, profileImageBase64);
}

async function getUserProfile() {
    return await profileManager.getProfile();
}

async function updateProfileImage(imageBase64) {
    return await profileManager.updateProfileImage(imageBase64);
}

async function isProfileComplete() {
    return await profileManager.isProfileComplete();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        profileManager,
        saveProfileToFirestore,
        getUserProfile,
        updateProfileImage,
        isProfileComplete
    };
}

// Make available globally
window.profileManager = profileManager;
window.saveProfileToFirestore = saveProfileToFirestore;
window.getUserProfile = getUserProfile;
window.updateProfileImage = updateProfileImage;
window.isProfileComplete = isProfileComplete;