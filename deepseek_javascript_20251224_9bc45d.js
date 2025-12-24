// Dashboard Management Functions
class DashboardManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.currentUser = null;
        this.userProfile = null;
        this.streamData = null;
    }

    // Initialize dashboard
    async init() {
        try {
            this.currentUser = this.auth.currentUser;
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }

            // Load user profile
            this.userProfile = await this.loadUserProfile();
            
            // Determine stream based on class
            if (this.userProfile && this.userProfile.class) {
                this.streamData = this.getStreamData(this.userProfile.class);
            }

            return {
                user: this.currentUser,
                profile: this.userProfile,
                stream: this.streamData
            };
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            throw error;
        }
    }

    // Load user profile from Firestore
    async loadUserProfile() {
        try {
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            
            if (userDoc.exists) {
                return { id: userDoc.id, ...userDoc.data() };
            } else {
                // If no profile exists, redirect to profile completion
                window.location.href = 'profile.html';
                return null;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            throw error;
        }
    }

    // Get stream data based on class
    getStreamData(className) {
        const scienceClasses = ['9A', '9B', '10A', '10B', '11A', '12A'];
        const commerceClasses = ['11B', '12B'];
        
        let streamName = 'General';
        let subjects = [];
        
        if (scienceClasses.includes(className)) {
            streamName = 'Science';
            subjects = [
                {
                    name: 'Mathematics',
                    icon: 'fa-calculator',
                    colorClass: 'icon-math',
                    description: 'Algebra, Calculus, Geometry, and Advanced Mathematics',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Physics',
                    icon: 'fa-atom',
                    colorClass: 'icon-physics',
                    description: 'Mechanics, Thermodynamics, Optics, and Modern Physics',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Chemistry',
                    icon: 'fa-flask',
                    colorClass: 'icon-chemistry',
                    description: 'Organic, Inorganic, Physical Chemistry, and Laboratory Work',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'English',
                    icon: 'fa-language',
                    colorClass: 'icon-english',
                    description: 'Literature, Grammar, Composition, and Communication Skills',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Hindi',
                    icon: 'fa-book',
                    colorClass: 'icon-hindi',
                    description: 'साहित्य, व्याकरण, रचना, और संचार कौशल',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Computer Science',
                    icon: 'fa-laptop-code',
                    colorClass: 'icon-computer',
                    description: 'Programming, Databases, Networks, and Software Development',
                    link: 'https://adminsblog.vercel.app/'
                }
            ];
        } else if (commerceClasses.includes(className)) {
            streamName = 'Commerce';
            subjects = [
                {
                    name: 'Accountancy',
                    icon: 'fa-file-invoice-dollar',
                    colorClass: 'icon-accountancy',
                    description: 'Financial Accounting, Book Keeping, and Business Transactions',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Business Studies',
                    icon: 'fa-briefcase',
                    colorClass: 'icon-business',
                    description: 'Management, Marketing, Finance, and Business Operations',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Economics',
                    icon: 'fa-chart-line',
                    colorClass: 'icon-economics',
                    description: 'Microeconomics, Macroeconomics, and Economic Theories',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'English',
                    icon: 'fa-language',
                    colorClass: 'icon-english',
                    description: 'Literature, Grammar, Composition, and Business Communication',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Hindi',
                    icon: 'fa-book',
                    colorClass: 'icon-hindi',
                    description: 'साहित्य, व्याकरण, रचना, और व्यावसायिक संचार',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Informatics Practices',
                    icon: 'fa-database',
                    colorClass: 'icon-informatics',
                    description: 'Data Management, Programming, and Business Informatics',
                    link: 'https://adminsblog.vercel.app/'
                }
            ];
        } else {
            // General stream for other classes
            subjects = [
                {
                    name: 'English',
                    icon: 'fa-language',
                    colorClass: 'icon-english',
                    description: 'Language and Literature Studies',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Hindi',
                    icon: 'fa-book',
                    colorClass: 'icon-hindi',
                    description: 'भाषा और साहित्य अध्ययन',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Mathematics',
                    icon: 'fa-calculator',
                    colorClass: 'icon-math',
                    description: 'Basic and Advanced Mathematics',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Science',
                    icon: 'fa-flask',
                    colorClass: 'icon-chemistry',
                    description: 'Physics, Chemistry, and Biology',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Social Studies',
                    icon: 'fa-globe',
                    colorClass: 'icon-accountancy',
                    description: 'History, Geography, and Civics',
                    link: 'https://adminsblog.vercel.app/'
                },
                {
                    name: 'Computer Science',
                    icon: 'fa-laptop-code',
                    colorClass: 'icon-computer',
                    description: 'Basic Computing and Digital Literacy',
                    link: 'https://adminsblog.vercel.app/'
                }
            ];
        }
        
        return {
            name: streamName,
            subjects: subjects,
            className: className
        };
    }

    // Get class teacher
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

    // Generate subject cards HTML
    generateSubjectCards(subjects) {
        if (!subjects || subjects.length === 0) {
            return '<div class="empty-state"><p>No subjects available for your stream.</p></div>';
        }
        
        let cardsHTML = '';
        subjects.forEach((subject, index) => {
            cardsHTML += `
                <div class="subject-card animate-slide-up" style="animation-delay: ${index * 100}ms">
                    <div class="subject-header">
                        <div class="subject-icon ${subject.colorClass}">
                            <i class="fas ${subject.icon}"></i>
                        </div>
                        <div class="subject-title">
                            <h3>${subject.name}</h3>
                            <p>Core Subject</p>
                        </div>
                    </div>
                    <p class="subject-description">${subject.description}</p>
                    <div class="subject-action">
                        <a href="${subject.link}" target="_blank" rel="noopener noreferrer" class="access-link">
                            Access Materials
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            `;
        });
        
        return cardsHTML;
    }

    // Generate welcome message
    getWelcomeMessage() {
        const hour = new Date().getHours();
        let greeting = 'Welcome';
        
        if (hour < 12) {
            greeting = 'Good morning';
        } else if (hour < 18) {
            greeting = 'Good afternoon';
        } else {
            greeting = 'Good evening';
        }
        
        const userName = this.userProfile?.fullName || 'Student';
        return `${greeting}, ${userName}!`;
    }

    // Get quick links
    getQuickLinks() {
        return [
            {
                name: 'Study Materials',
                icon: 'fa-book',
                link: 'https://adminsblog.vercel.app/',
                external: true
            },
            {
                name: 'Academic Calendar',
                icon: 'fa-calendar-alt',
                link: '#',
                external: false
            },
            {
                name: 'Progress Report',
                icon: 'fa-chart-bar',
                link: '#',
                external: false
            },
            {
                name: 'Help Center',
                icon: 'fa-question-circle',
                link: '#',
                external: false
            },
            {
                name: 'Assignments',
                icon: 'fa-tasks',
                link: '#',
                external: false
            },
            {
                name: 'Class Forum',
                icon: 'fa-comments',
                link: '#',
                external: false
            }
        ];
    }

    // Update last login timestamp
    async updateLastLogin() {
        try {
            if (!this.currentUser) return;
            
            await this.db.collection('users').doc(this.currentUser.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Last login timestamp updated');
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    // Get user statistics (placeholder for future features)
    async getUserStatistics() {
        return {
            completedAssignments: 0,
            pendingAssignments: 0,
            averageScore: 0,
            attendancePercentage: 0
        };
    }

    // Get upcoming events (placeholder for future features)
    async getUpcomingEvents() {
        return [
            {
                title: 'Mathematics Test',
                date: 'Tomorrow',
                time: '10:00 AM',
                subject: 'Mathematics'
            },
            {
                title: 'Physics Assignment Due',
                date: 'In 2 days',
                time: '11:59 PM',
                subject: 'Physics'
            }
        ];
    }

    // Log user activity
    async logActivity(activityType, details = {}) {
        try {
            const activityData = {
                userId: this.currentUser.uid,
                activityType: activityType,
                details: details,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform
            };
            
            await this.db.collection('user_activities').add(activityData);
            console.log('Activity logged:', activityType);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // Check for new notifications
    async checkNotifications() {
        try {
            // This is a placeholder for future notification system
            const notifications = [];
            
            // Example: Check if profile is complete
            if (!this.userProfile?.phone || !this.userProfile?.class) {
                notifications.push({
                    type: 'warning',
                    message: 'Please complete your profile',
                    action: 'profile.html',
                    icon: 'fa-user-edit'
                });
            }
            
            // Example: Check last login (if implemented)
            if (this.userProfile?.lastLogin) {
                const lastLogin = this.userProfile.lastLogin.toDate();
                const daysSinceLastLogin = Math.floor((new Date() - lastLogin) / (1000 * 60 * 60 * 24));
                
                if (daysSinceLastLogin > 7) {
                    notifications.push({
                        type: 'info',
                        message: `Welcome back! It's been ${daysSinceLastLogin} days since your last login.`,
                        icon: 'fa-hand-wave'
                    });
                }
            }
            
            return notifications;
        } catch (error) {
            console.error('Error checking notifications:', error);
            return [];
        }
    }

    // Export user data (for GDPR/Data portability)
    async exportUserData() {
        try {
            const userData = {
                authData: {
                    email: this.currentUser.email,
                    emailVerified: this.currentUser.emailVerified,
                    uid: this.currentUser.uid
                },
                profileData: this.userProfile,
                streamData: this.streamData,
                exportDate: new Date().toISOString()
            };
            
            // Convert to JSON string
            const jsonData = JSON.stringify(userData, null, 2);
            
            // Create download link
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `edusphere-data-${this.currentUser.uid}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Log the export activity
            await this.logActivity('data_export', { format: 'json' });
            
            return true;
        } catch (error) {
            console.error('Error exporting user data:', error);
            throw error;
        }
    }
}

// Initialize Dashboard Manager
const dashboardManager = new DashboardManager();

// Export functions for global use
async function initializeDashboard() {
    return await dashboardManager.init();
}

function generateSubjectCards(subjects) {
    return dashboardManager.generateSubjectCards(subjects);
}

function getWelcomeMessage() {
    return dashboardManager.getWelcomeMessage();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        dashboardManager,
        initializeDashboard,
        generateSubjectCards,
        getWelcomeMessage
    };
}

// Make available globally
window.dashboardManager = dashboardManager;
window.initializeDashboard = initializeDashboard;
window.generateSubjectCards = generateSubjectCards;
window.getWelcomeMessage = getWelcomeMessage;