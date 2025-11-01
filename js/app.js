// ===========================
// App Initialization
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
    initializeTheme();
    initializeProfileDropdown();
    initializeNavigation();
    initializeNotifications();
    
    // Initialize real-time Firebase sync
    initializeRealtimeSync();
    
    // Show loading message
    showToast('Connecting to database...', 'info', 2000);
});

// ===========================
// Sidebar Functionality
// ===========================
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    // Load saved sidebar state
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    }
    
    // Toggle sidebar
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    });
    
    // Mobile sidebar toggle
    if (window.innerWidth <= 768) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-open');
        });
        
        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
}

// ===========================
// Theme Switching
// ===========================
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    // Toggle theme
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
    
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }
}

// ===========================
// Profile Dropdown
// ===========================
function initializeProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('active');
        }
    });
    
    // Handle logout
    const logoutBtn = document.querySelector('.logout-btn');
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
}

// ===========================
// Navigation
// ===========================
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a:not(.submenu-toggle)');
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    const modules = document.querySelectorAll('.module');
    
    // Handle submenu toggles
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const parentLi = toggle.parentElement;
            const page = toggle.getAttribute('data-page');
            
            // Check if submenu is currently closed (about to open)
            const isCurrentlyClosed = !parentLi.classList.contains('open');
            
            // Toggle submenu
            parentLi.classList.toggle('open');
            
            // If opening the submenu OR clicking when already open, navigate to the main module
            // Special handling for POS - always navigate to pos-new-sale
            if (isCurrentlyClosed) {
                // Update active nav item
                document.querySelector('.sidebar-nav li.active')?.classList.remove('active');
                parentLi.classList.add('active');
                
                // For POS, navigate directly to pos-new-sale
                const targetPage = page === 'pos' ? 'pos-new-sale' : page;
                
                // Show corresponding module
                modules.forEach(module => module.classList.remove('active'));
                const targetModule = document.getElementById(`${targetPage}-module`);
                if (targetModule) {
                    targetModule.classList.add('active');
                    
                    // Initialize module-specific functionality
                    initializeModulePage(targetPage);
                    
                    // Save current page
                    localStorage.setItem('currentPage', targetPage);
                }
            }
        });
    });
    
    // Handle regular navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const page = link.getAttribute('data-page');
            
            // Update active nav item
            document.querySelector('.sidebar-nav li.active')?.classList.remove('active');
            
            // Check if it's a submenu item
            const isSubmenuItem = link.closest('.submenu');
            if (isSubmenuItem) {
                link.parentElement.classList.add('active');
            } else {
                link.parentElement.classList.add('active');
            }
            
            // Show corresponding module
            modules.forEach(module => module.classList.remove('active'));
            document.getElementById(`${page}-module`)?.classList.add('active');
            
            // Initialize module-specific functionality
            initializeModulePage(page);
            
            // Save current page
            localStorage.setItem('currentPage', page);
            
            // Close mobile sidebar
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('mobile-open');
            }
        });
    });
    
    // Load saved page
    const savedPage = localStorage.getItem('currentPage');
    if (savedPage) {
        const link = document.querySelector(`[data-page="${savedPage}"]`);
        if (link) {
            // If it's a submenu item, open the parent submenu
            const submenuParent = link.closest('.has-submenu');
            if (submenuParent) {
                submenuParent.classList.add('open');
            }
            link.click();
        }
    }
}

// ===========================
// Notifications
// ===========================
function initializeNotifications() {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationBadge = document.querySelector('.notification-badge');
    
    notificationBtn.addEventListener('click', () => {
        // Handle notification click
        showNotifications();
    });
    
    // Load notification count
    loadNotificationCount();
}

function loadNotificationCount() {
    const activities = JSON.parse(localStorage.getItem('systemActivities') || '[]');
    const unreadCount = activities.filter(a => !a.read).length;
    updateNotificationBadge(unreadCount);
}

function updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-badge');
    badge.textContent = count;
    
    if (count > 0) {
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function showNotifications() {
    // Navigate to dashboard to see activity log
    const dashboardLink = document.querySelector('[data-page="dashboard"]');
    if (dashboardLink) {
        dashboardLink.click();
        
        // Scroll to activity section
        setTimeout(() => {
            const activitySection = document.querySelector('.activity-log-section');
            if (activitySection) {
                activitySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }
    
    // Mark all as read
    if (window.Dashboard && window.Dashboard.markAllRead) {
        window.Dashboard.markAllRead();
    }
}

// ===========================
// Authentication
// ===========================
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Firebase logout will be implemented here
        if (typeof firebase !== 'undefined' && firebase.auth()) {
            firebase.auth().signOut().then(() => {
                localStorage.clear();
                window.location.reload();
            }).catch((error) => {
                console.error('Logout error:', error);
            });
        } else {
            localStorage.clear();
            window.location.reload();
        }
    }
}

// ===========================
// Module Initialization
// ===========================
function initializeModulePage(page) {
    // Initialize specific module functionality based on page
    switch(page) {
        case 'dashboard':
            if (typeof initializeDashboard === 'function') {
                initializeDashboard();
            }
            break;
        case 'inventory':
            if (typeof initializeInventory === 'function') {
                initializeInventory();
            }
            break;
        case 'inventory-add-item':
            if (typeof initializeAddItemForm === 'function') {
                initializeAddItemForm();
            }
            break;
        case 'pos-new-sale':
        case 'pos':
            if (typeof initializePOS === 'function') {
                initializePOS();
                // Update cashier and branch info
                const cashierName = document.getElementById('posCashierName');
                const branchName = document.getElementById('posBranchName');
                
                if (cashierName) {
                    cashierName.textContent = localStorage.getItem('userName') || 'User';
                }
                if (branchName) {
                    branchName.textContent = localStorage.getItem('selectedBranch') || 'Main Branch';
                }
            }
            break;
        case 'all-sales-view':
            if (typeof initializeSalesModule === 'function') {
                initializeSalesModule();
            }
            if (typeof initializeSalesExport === 'function') {
                initializeSalesExport();
            }
            break;
        case 'customers':
        case 'customers-add':
            if (typeof initializeCustomersModule === 'function') {
                initializeCustomersModule();
            }
            break;
        case 'b2b-sales':
            if (typeof initializeB2BModule === 'function') {
                initializeB2BModule();
            }
            break;
        case 'b2b-new-sale':
            if (typeof initializeB2BOrderForm === 'function') {
                initializeB2BOrderForm();
                // Try to load draft
                if (typeof loadB2BDraft === 'function') {
                    loadB2BDraft();
                }
            }
            break;
        case 'expenses':
            if (typeof initializeExpensesModule === 'function') {
                initializeExpensesModule();
            }
            break;
        case 'expenses-add':
            // Set default date to today
            const expenseDateInput = document.getElementById('expenseDate');
            if (expenseDateInput && !expenseDateInput.value) {
                expenseDateInput.value = new Date().toISOString().split('T')[0];
            }
            // Reset form title if it was in edit mode
            const formTitle = document.querySelector('#expenses-add-module .module-header h1');
            const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
            if (formTitle) formTitle.textContent = 'Add Expense';
            if (submitBtn) submitBtn.textContent = 'Add Expense';
            // Clear editing flag
            window.currentEditingExpenseId = null;
            break;
        default:
            // Other modules can be initialized here
            break;
    }
}

// ===========================
// Navigation Helper
// ===========================
function navigateToPage(pageName) {
    const link = document.querySelector(`[data-page="${pageName}"]`);
    if (link) {
        link.click();
    } else {
        console.error(`Navigation link not found for page: ${pageName}`);
    }
}

// Make navigateToPage available globally
window.navigateToPage = navigateToPage;

// Alias for navigateToPage to match button onclick usage
function showModule(pageName) {
    navigateToPage(pageName);
}
window.showModule = showModule;

// ===========================
// Utility Functions
// ===========================
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        min-width: 300px;
        padding: 16px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    // Set color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#2563eb'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    // Add icon
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    const icon = document.createElement('span');
    icon.textContent = icons[type] || icons.info;
    icon.style.cssText = 'font-size: 18px; font-weight: bold;';
    
    const text = document.createElement('span');
    text.textContent = message;
    text.style.flex = '1';
    
    toast.appendChild(icon);
    toast.appendChild(text);
    toastContainer.appendChild(toast);
    
    // Add animation style if not exists
    if (!document.getElementById('toastAnimations')) {
        const style = document.createElement('style');
        style.id = 'toastAnimations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            toast.remove();
            if (toastContainer.children.length === 0) {
                toastContainer.remove();
            }
        }, 300);
    }, duration);
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount || 0).replace('KES', 'KSh');
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(new Date(date));
}

function formatDateTime(date) {
    return new Intl.DateTimeFormat('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

// ===========================
// Export for other modules
// ===========================
window.POS = {
    showToast,
    formatCurrency,
    formatDate,
    formatDateTime,
    updateNotificationBadge
};
