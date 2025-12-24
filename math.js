// Global Variables
let currentUser = null;
let isTeacher = false;
let onlineUsers = {};

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

// Initialize App
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Check auth state
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            isTeacher = user.email === TEACHER_EMAIL;
            setupUser(user);
            showDashboard();
            setupRealtimeListeners();
            updateOnlineStatus(true);
        } else {
            showLoginScreen();
        }
    });

    // Event Listeners
    loginBtn.addEventListener('click', loginUser);
    registerBtn.addEventListener('click', registerUser);
    logoutBtn.addEventListener('click', logoutUser);
    showRegister.addEventListener('click', showRegisterForm);
    showLogin.addEventListener('click', showLoginForm);
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });
    
    // Chat functionality
    document.getElementById('sendCommunityMsg').addEventListener('click', sendCommunityMessage);
    document.getElementById('communityMessage').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendCommunityMessage();
    });
    
    // Teacher functionality
    document.getElementById('addHomeworkBtn')?.addEventListener('click', addHomework);
    document.getElementById('addResourceBtn')?.addEventListener('click', addResource);
    document.getElementById('askDoubtBtn')?.addEventListener('click', askDoubt);
}

// Authentication Functions
async function loginUser() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        showNotification('Login successful!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function registerUser() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (!name || !email || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Create user document in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: email === TEACHER_EMAIL ? 'teacher' : 'student',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Registration successful!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function logoutUser() {
    try {
        await updateOnlineStatus(false);
        await auth.signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function showRegisterForm() {
    document.querySelector('.login-form').style.display = 'none';
    document.querySelector('.register-form').style.display = 'block';
}

function showLoginForm() {
    document.querySelector('.login-form').style.display = 'block';
    document.querySelector('.register-form').style.display = 'none';
}

// User Management
async function setupUser(user) {
    // Update UI with user info
    document.getElementById('userGreeting').textContent = `Welcome, ${user.displayName || user.email}`;
    
    // Update role badge
    const badge = document.getElementById('userRoleBadge');
    if (isTeacher) {
        badge.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Teacher';
        badge.style.background = 'rgba(255, 193, 7, 0.2)';
        badge.style.borderColor = 'rgba(255, 193, 7, 0.3)';
        
        // Show teacher-only forms
        document.getElementById('teacherHomeworkForm').style.display = 'block';
        document.getElementById('teacherResourceForm').style.display = 'block';
    } else {
        badge.innerHTML = '<i class="fas fa-user-graduate"></i> Student';
    }
    
    // Ensure user document exists
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
        await db.collection('users').doc(user.uid).set({
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            role: isTeacher ? 'teacher' : 'student',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

// Online Status Management
async function updateOnlineStatus(isOnline) {
    if (!currentUser) return;
    
    const status = {
        userId: currentUser.uid,
        name: currentUser.displayName || currentUser.email.split('@')[0],
        email: currentUser.email,
        isOnline: isOnline,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('onlineUsers').doc(currentUser.uid).set(status);
}

// Realtime Listeners
function setupRealtimeListeners() {
    // Listen for online users
    db.collection('onlineUsers')
        .where('isOnline', '==', true)
        .onSnapshot(snapshot => {
            onlineUsers = {};
            snapshot.forEach(doc => {
                onlineUsers[doc.id] = doc.data();
            });
            updateOnlineUsersList();
            document.getElementById('onlineCount').textContent = Object.keys(onlineUsers).length;
        });
    
    // Listen for community messages
    db.collection('community')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot(snapshot => {
            const messagesContainer = document.getElementById('communityMessages');
            messagesContainer.innerHTML = '';
            
            if (snapshot.empty) {
                messagesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comment-slash"></i>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach(doc => {
                const message = doc.data();
                displayMessage(message);
            });
        });
    
    // Listen for homework
    db.collection('homework')
        .orderBy('createdAt', 'desc')
        .onSnapshot(updateHomeworkList);
    
    // Listen for resources
    db.collection('resources')
        .orderBy('createdAt', 'desc')
        .onSnapshot(updateResourcesList);
    
    // Listen for doubts
    db.collection('doubts')
        .orderBy('createdAt', 'desc')
        .onSnapshot(updateDoubtsList);
}

// Community Chat
async function sendCommunityMessage() {
    const input = document.getElementById('communityMessage');
    const message = input.value.trim();
    
    if (!message || !currentUser) return;
    
    try {
        await db.collection('community').add({
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            userEmail: currentUser.email,
            userRole: isTeacher ? 'teacher' : 'student',
            content: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        input.value = '';
    } catch (error) {
        showNotification('Failed to send message', 'error');
    }
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('communityMessages');
    
    // Remove empty state if present
    if (messagesContainer.querySelector('.empty-state')) {
        messagesContainer.innerHTML = '';
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.userRole}`;
    
    const time = message.timestamp?.toDate() || new Date();
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="sender-name">${message.userName} ${message.userRole === 'teacher' ? '👨‍🏫' : '👨‍🎓'}</span>
            <span class="message-time">${timeString}</span>
        </div>
        <div class="message-content">${message.content}</div>
    `;
    
    messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);
}

// Homework Management
async function addHomework() {
    if (!isTeacher) return;
    
    const title = document.getElementById('homeworkTitle').value;
    const description = document.getElementById('homeworkDescription').value;
    const dueDate = document.getElementById('homeworkDueDate').value;
    
    if (!title || !description) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    try {
        await db.collection('homework').add({
            title: title,
            description: description,
            dueDate: dueDate,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            teacherName: 'Mr. Ahmad'
        });
        
        // Clear form
        document.getElementById('homeworkTitle').value = '';
        document.getElementById('homeworkDescription').value = '';
        document.getElementById('homeworkDueDate').value = '';
        
        showNotification('Homework assigned successfully!', 'success');
    } catch (error) {
        showNotification('Failed to assign homework', 'error');
    }
}

function updateHomeworkList(snapshot) {
    const container = document.getElementById('homeworkList');
    container.innerHTML = '';
    
    if (snapshot.empty) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p>No homework assigned yet</p>
            </div>
        `;
        return;
    }
    
    let count = 0;
    snapshot.forEach(doc => {
        const homework = doc.data();
        const homeworkElement = document.createElement('div');
        homeworkElement.className = 'homework-card';
        
        const dueDate = homework.dueDate ? new Date(homework.dueDate).toLocaleDateString() : 'No due date';
        
        homeworkElement.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-book"></i> ${homework.title}
                </h3>
                <span class="card-date">Due: ${dueDate}</span>
            </div>
            <div class="card-description">
                ${homework.description}
            </div>
            <div class="card-footer">
                <small>Assigned by: ${homework.teacherName || 'Teacher'}</small>
            </div>
        `;
        
        container.appendChild(homeworkElement);
        count++;
    });
    
    document.getElementById('totalHomework').textContent = count;
}

// Resources Management
async function addResource() {
    if (!isTeacher) return;
    
    const title = document.getElementById('resourceTitle').value;
    const description = document.getElementById('resourceDescription').value;
    const link = document.getElementById('resourceLink').value;
    const type = document.getElementById('resourceType').value;
    
    if (!title || !link) {
        showNotification('Title and link are required', 'error');
        return;
    }
    
    // Validate Google Drive link
    if (!link.includes('drive.google.com')) {
        showNotification('Please enter a valid Google Drive link', 'error');
        return;
    }
    
    try {
        await db.collection('resources').add({
            title: title,
            description: description,
            link: link,
            type: type,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            teacherName: 'Mr. Ahmad'
        });
        
        // Clear form
        document.getElementById('resourceTitle').value = '';
        document.getElementById('resourceDescription').value = '';
        document.getElementById('resourceLink').value = '';
        
        showNotification('Resource added successfully!', 'success');
    } catch (error) {
        showNotification('Failed to add resource', 'error');
    }
}

function updateResourcesList(snapshot) {
    const container = document.getElementById('resourcesList');
    container.innerHTML = '';
    
    if (snapshot.empty) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No resources available yet</p>
            </div>
        `;
        return;
    }
    
    const typeIcons = {
        pdf: 'fas fa-file-pdf',
        video: 'fas fa-video',
        worksheet: 'fas fa-table',
        presentation: 'fas fa-chart-bar',
        other: 'fas fa-file'
    };
    
    const typeColors = {
        pdf: '#f44336',
        video: '#2196f3',
        worksheet: '#4caf50',
        presentation: '#ff9800',
        other: '#9c27b0'
    };
    
    snapshot.forEach(doc => {
        const resource = doc.data();
        const resourceElement = document.createElement('div');
        resourceElement.className = 'resource-card';
        
        // Convert Google Drive link to embed/view link
        let driveLink = resource.link;
        if (driveLink.includes('/file/d/')) {
            const fileId = driveLink.split('/file/d/')[1].split('/')[0];
            driveLink = `https://drive.google.com/file/d/${fileId}/preview`;
        }
        
        const icon = typeIcons[resource.type] || typeIcons.other;
        const color = typeColors[resource.type] || typeColors.other;
        
        resourceElement.innerHTML = `
            <div class="card-header">
                <h3 class="card-title" style="color: ${color}">
                    <i class="${icon}"></i> ${resource.title}
                </h3>
                <span class="card-date">${resource.type.toUpperCase()}</span>
            </div>
            <div class="card-description">
                ${resource.description || 'No description provided.'}
            </div>
            <div class="drive-embed">
                <iframe 
                    src="${driveLink}" 
                    width="100%" 
                    height="400" 
                    frameborder="0"
                    allow="autoplay"
                    style="border-radius: 8px;">
                </iframe>
            </div>
            <a href="${resource.link}" target="_blank" class="drive-link">
                <i class="fab fa-google-drive"></i> Open in Google Drive
            </a>
        `;
        
        container.appendChild(resourceElement);
    });
}

// Doubts Management
async function askDoubt() {
    if (!currentUser) return;
    
    const question = document.getElementById('doubtQuestion').value.trim();
    
    if (!question) {
        showNotification('Please enter your doubt', 'error');
        return;
    }
    
    try {
        await db.collection('doubts').add({
            question: question,
            studentId: currentUser.uid,
            studentName: currentUser.displayName || currentUser.email.split('@')[0],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            answers: []
        });
        
        document.getElementById('doubtQuestion').value = '';
        showNotification('Doubt submitted successfully!', 'success');
    } catch (error) {
        showNotification('Failed to submit doubt', 'error');
    }
}

function updateDoubtsList(snapshot) {
    const container = document.getElementById('doubtsList');
    container.innerHTML = '';
    
    if (snapshot.empty) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-question-circle"></i>
                <p>No doubts yet. Be the first to ask!</p>
            </div>
        `;
        return;
    }
    
    let count = 0;
    snapshot.forEach(doc => {
        const doubt = doc.data();
        const doubtElement = document.createElement('div');
        doubtElement.className = 'doubt-item';
        
        const time = doubt.createdAt?.toDate() || new Date();
        const timeString = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let answersHTML = '';
        if (doubt.answers && doubt.answers.length > 0) {
            doubt.answers.forEach(answer => {
                answersHTML += `
                    <div class="doubt-answer">
                        <strong><i class="fas fa-chalkboard-teacher"></i> ${answer.teacherName || 'Teacher'}:</strong>
                        <p>${answer.answer}</p>
                        <small>Answered on ${answer.answeredAt?.toDate().toLocaleDateString()}</small>
                    </div>
                `;
            });
        } else {
            answersHTML = '<p class="no-answer"><i class="fas fa-clock"></i> Waiting for teacher response...</p>';
        }
        
        doubtElement.innerHTML = `
            <div class="doubt-header">
                <div class="doubt-student">
                    <i class="fas fa-user-graduate"></i>
                    <strong>${doubt.studentName}</strong>
                </div>
                <span class="doubt-time">${timeString}</span>
            </div>
            <div class="doubt-question">
                <p><strong>Q:</strong> ${doubt.question}</p>
            </div>
            ${answersHTML}
        `;
        
        container.appendChild(doubtElement);
        if (doubt.status === 'pending') count++;
    });
    
    document.getElementById('totalDoubts').textContent = count;
}

// Online Users List
function updateOnlineUsersList() {
    const container = document.getElementById('studentsList');
    container.innerHTML = '';
    
    if (Object.keys(onlineUsers).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>No students online</p>
            </div>
        `;
        return;
    }
    
    // Sort: teacher first, then students
    const sortedUsers = Object.values(onlineUsers).sort((a, b) => {
        if (a.email === TEACHER_EMAIL) return -1;
        if (b.email === TEACHER_EMAIL) return 1;
        return a.name.localeCompare(b.name);
    });
    
    sortedUsers.forEach(user => {
        const studentCard = document.createElement('div');
        studentCard.className = 'student-card';
        
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const isUserTeacher = user.email === TEACHER_EMAIL;
        
        studentCard.innerHTML = `
            <div class="student-avatar" style="background: ${isUserTeacher ? 'linear-gradient(135deg, #ffc107, #ff9800)' : 'linear-gradient(135deg, #56cfe1, #4a8fe7)'}">
                ${isUserTeacher ? '👨‍🏫' : initials}
            </div>
            <div class="student-info">
                <h4>${user.name} ${isUserTeacher ? ' (Teacher)' : ''}</h4>
                <p>${user.email}</p>
            </div>
            <div class="online-dot"></div>
        `;
        
        container.appendChild(studentCard);
    });
    
    document.getElementById('totalStudents').textContent = Object.keys(onlineUsers).length;
}

// Tab Navigation
function switchTab(tabName) {
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) btn.classList.add('active');
    });
    
    // Show selected tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === tabName + 'Tab') tab.classList.add('active');
    });
}

// Screen Management
function showDashboard() {
    loginScreen.classList.remove('active');
    dashboard.classList.add('active');
}

function showLoginScreen() {
    dashboard.classList.remove('active');
    loginScreen.classList.add('active');
    
    // Reset forms
    document.querySelector('.login-form').style.display = 'block';
    document.querySelector('.register-form').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    
    // Set color based on type
    if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #f44336, #c62828)';
    } else if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #4caf50, #2e7d32)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #2196f3, #1565c0)';
    }
    
    text.textContent = message;
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Handle window close/refresh
window.addEventListener('beforeunload', async () => {
    if (currentUser) {
        await updateOnlineStatus(false);
    }
});

// Initialize default tab
switchTab('community');
