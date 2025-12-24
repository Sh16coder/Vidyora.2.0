// UI Utility Functions
class UI {
    constructor() {
        this.particleCount = 40;
    }

    // Create floating particles
    createParticles(count) {
        const container = document.querySelector('.particles-container');
        if (!container) return;

        // Clear existing particles
        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random size between 10px and 100px
            const size = Math.random() * 90 + 10;
            
            // Random position
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            
            // Random animation delay and duration
            const delay = Math.random() * 15;
            const duration = Math.random() * 10 + 20;
            
            // Apply styles
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.top = `${top}%`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;
            
            // Random opacity
            particle.style.opacity = Math.random() * 0.3 + 0.1;
            
            container.appendChild(particle);
        }
    }

    // Show loading spinner
    showLoading(container) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner"></div>
            <p>Loading...</p>
        `;
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(spinner);
        }
        return spinner;
    }

    // Show success message
    showSuccess(message, container) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message animate-bounce-in';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        if (container) {
            container.appendChild(successDiv);
            setTimeout(() => successDiv.remove(), 3000);
        }
        return successDiv;
    }

    // Show error message
    showError(message, container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message animate-slide-up';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        
        if (container) {
            container.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
        return errorDiv;
    }

    // Form validation
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        return password.length >= 6;
    }

    // Add shake animation to element
    shake(element) {
        element.classList.add('shake-animation');
        setTimeout(() => {
            element.classList.remove('shake-animation');
        }, 500);
    }

    // Toggle dark mode
    toggleDarkMode() {
        document.body.classList.toggle('dark');
        localStorage.setItem('darkMode', document.body.classList.contains('dark'));
    }

    // Check system preference for dark mode
    checkDarkModePreference() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedPreference = localStorage.getItem('darkMode');
        
        if (savedPreference !== null) {
            document.body.classList.toggle('dark', savedPreference === 'true');
        } else if (prefersDark) {
            document.body.classList.add('dark');
        }
    }

    // Create toast notification
    toast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} animate-slide-up`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 5000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 500);
        });
        
        return toast;
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for performance
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize UI
const ui = new UI();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ui;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    ui.checkDarkModePreference();
    
    // Add shake animation CSS
    const style = document.createElement('style');
    style.textContent = `
        .shake-animation {
            animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--gray-900);
            color: white;
            padding: var(--space-3) var(--space-4);
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            gap: var(--space-3);
            z-index: var(--z-tooltip);
            box-shadow: var(--shadow-2xl);
            min-width: 300px;
            max-width: 400px;
        }
        
        .toast-success {
            border-left: 4px solid var(--accent);
        }
        
        .toast-error {
            border-left: 4px solid var(--danger);
        }
        
        .toast-warning {
            border-left: 4px solid var(--warning);
        }
        
        .toast-info {
            border-left: 4px solid var(--primary);
        }
        
        .toast-close {
            background: none;
            border: none;
            color: var(--gray-400);
            cursor: pointer;
            margin-left: auto;
            padding: var(--space-1);
        }
        
        .toast-close:hover {
            color: var(--gray-300);
        }
        
        .loading-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-4);
            padding: var(--space-8);
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--gray-300);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        .success-message {
            background: var(--accent);
            color: white;
            padding: var(--space-3) var(--space-4);
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            gap: var(--space-2);
            margin: var(--space-2) 0;
        }
        
        .error-message {
            background: var(--danger);
            color: white;
            padding: var(--space-3) var(--space-4);
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            gap: var(--space-2);
            margin: var(--space-2) 0;
        }
    `;
    document.head.appendChild(style);
});
