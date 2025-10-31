// ===========================
// Dashboard Module
// ===========================

// Initialize Dashboard
function initializeDashboard() {
    updateGreeting();
    updateDate();
    loadBranches();
    
    // Update date every minute
    setInterval(updateDate, 60000);
    
    // Listen to real-time state changes
    StateEvents.on('stats:updated', updateDashboardStats);
    StateEvents.on('sales:updated', loadRecentActivity);
    StateEvents.on('activity:added', loadRecentActivity);
    StateEvents.on('sync:ready', () => {
        loadDashboardStats();
        loadRecentActivity();
        initializeDashboardSearch();
    });
    
    // Initial load if data is already available
    if (AppState.isInitialized) {
        loadDashboardStats();
        loadRecentActivity();
        initializeDashboardSearch();
    }
    
    // Force initial stats update
    setTimeout(() => {
        if (AppState.stats) {
            updateDashboardStats(AppState.stats);
        }
    }, 1000);
}

// Update Greeting
function updateGreeting() {
    const greetingElement = document.getElementById('dashboardGreeting');
    const hour = new Date().getHours();
    let greeting = 'Welcome';
    
    if (hour < 12) {
        greeting = 'Good Morning';
    } else if (hour < 18) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }
    
    // Get user name from localStorage or Firebase
    const userName = localStorage.getItem('userName') || 'User';
    greetingElement.textContent = `${greeting}, ${userName}`;
}

// Update Date
function updateDate() {
    const dateElement = document.getElementById('dashboardDate');
    const now = new Date();
    
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    const dateString = now.toLocaleDateString('en-KE', options);
    dateElement.textContent = dateString;
}

// Load Branches
async function loadBranches() {
    const branchSelect = document.getElementById('branchSelect');
    
    // Load from Firebase or localStorage
    // For now, we'll add a default option
    const branches = JSON.parse(localStorage.getItem('branches') || '[]');
    
    if (branches.length === 0) {
        branchSelect.innerHTML = '<option value="">All Branches</option>';
    } else {
        branchSelect.innerHTML = '<option value="">All Branches</option>';
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = branch.name;
            branchSelect.appendChild(option);
        });
    }
    
    // Load saved branch selection
    const savedBranch = localStorage.getItem('selectedBranch');
    if (savedBranch) {
        branchSelect.value = savedBranch;
    }
    
    // Handle branch change
    branchSelect.addEventListener('change', (e) => {
        localStorage.setItem('selectedBranch', e.target.value);
        loadDashboardStats();
    });
}

// Load Dashboard Stats
async function loadDashboardStats() {
    updateDashboardStats(AppState.stats);
}

// Update Dashboard Stats (Real-time)
function updateDashboardStats(stats) {
    // Update stat cards
    updateStatCard('todaysSales', formatCurrency(stats.todayRevenue), false);
    updateStatCard('todaysExpenses', formatCurrency(stats.todayExpenses), false);
    updateStatCard('profitLoss', formatCurrency(stats.profitLoss), false, true);
    updateStatCard('totalCustomers', stats.totalCustomers, false);
    updateStatCard('stockValue', formatCurrency(stats.stockValue), false);
    updateStatCard('pendingB2B', 0, false); // TODO: Implement B2B orders
    
    console.log('📊 Dashboard stats updated:', stats);
}

// Update Stat Card
function updateStatCard(elementId, value, isCurrency = false, isProfitLoss = false) {
    const element = document.getElementById(elementId);
    
    if (!element) return;
    
    element.textContent = value;
    
    // Handle profit/loss color
    if (isProfitLoss) {
        element.classList.remove('positive', 'negative');
        // Extract numeric value from formatted string
        const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
        if (numericValue > 0) {
            element.classList.add('positive');
        } else if (numericValue < 0) {
            element.classList.add('negative');
        }
    }
}

// Format Kenya Shillings
function formatKenyaShillings(amount) {
    const formatted = new Intl.NumberFormat('en-KE', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    
    return `KSh ${formatted}`;
}

// Format Number
function formatNumber(number) {
    return new Intl.NumberFormat('en-KE').format(number);
}

// Initialize Dashboard Search
function initializeDashboardSearch() {
    const searchInput = document.getElementById('dashboardSearch');
    
    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        
        if (query.length > 2) {
            performDashboardSearch(query);
        }
    }, 300));
}

// Load Recent Activity
async function loadRecentActivity() {
    const activityTableBody = document.getElementById('activityTableBody');
    const emptyState = document.getElementById('activityEmptyState');
    
    try {
        // Load activities from Firebase or localStorage
        const activities = JSON.parse(localStorage.getItem('systemActivities') || '[]');
        
        if (activities.length === 0) {
            activityTableBody.innerHTML = '';
            emptyState.classList.remove('hidden');
            updateNotificationCount(0);
            return;
        }
        
        // Sort by timestamp (newest first) and take last 10
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const recentActivities = activities.slice(0, 10);
        
        // Render activities
        activityTableBody.innerHTML = recentActivities.map(activity => {
            const timeString = formatActivityTime(activity.timestamp);
            const icon = getActivityIcon(activity.type);
            const iconColor = getActivityColor(activity.type);
            
            return `
                <tr>
                    <td data-label="Time" class="activity-time">${timeString}</td>
                    <td data-label="Activity">
                        <div class="activity-description">
                            <div class="activity-icon ${iconColor}">
                                ${icon}
                            </div>
                            ${activity.description}
                        </div>
                    </td>
                    <td data-label="User" class="activity-user">${activity.user}</td>
                    <td data-label="Module">
                        <span class="activity-module">${activity.module}</span>
                    </td>
                    <td data-label="Details" class="activity-details">${activity.details || '-'}</td>
                </tr>
            `;
        }).join('');
        
        emptyState.classList.add('hidden');
        
        // Update notification count
        const unreadCount = activities.filter(a => !a.read).length;
        updateNotificationCount(unreadCount);
        
    } catch (error) {
        console.error('Error loading activity log:', error);
    }
}

// Format Activity Time
function formatActivityTime(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return activityTime.toLocaleDateString('en-KE', { 
        month: 'short', 
        day: 'numeric' 
    });
}

// Get Activity Icon
function getActivityIcon(type) {
    const icons = {
        'sale': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1a1 1 0 000 2h.5l1.5 6h7l1.5-6H14a1 1 0 100-2H3zm2 10a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z"/></svg>',
        'product': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v10H2V3zm2 2v6h8V5H4z"/></svg>',
        'expense': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 10H7V9h2v2zm0-3H7V4h2v4z"/></svg>',
        'customer': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z"/></svg>',
        'login': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 100 6 3 3 0 000-6zM2 13c0-2 4-3 6-3s6 1 6 3v1H2v-1z"/></svg>',
        'order': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v12H2V2zm2 2v8h8V4H4z"/></svg>',
        'inventory': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/></svg>',
        'default': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6"/></svg>'
    };
    
    return icons[type] || icons['default'];
}

// Get Activity Color
function getActivityColor(type) {
    const colors = {
        'sale': 'blue',
        'product': 'green',
        'expense': 'red',
        'customer': 'blue',
        'login': 'green',
        'order': 'blue',
        'inventory': 'green'
    };
    
    return colors[type] || 'blue';
}

// Update Notification Count
function updateNotificationCount(count) {
    if (window.POS && window.POS.updateNotificationBadge) {
        window.POS.updateNotificationBadge(count);
    }
}

// Add Activity (Helper function to be called from other modules)
function addActivity(type, description, user, module, details = '') {
    const activities = JSON.parse(localStorage.getItem('systemActivities') || '[]');
    
    const newActivity = {
        id: Date.now(),
        type,
        description,
        user,
        module,
        details,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    activities.unshift(newActivity);
    
    // Keep only last 100 activities
    if (activities.length > 100) {
        activities.splice(100);
    }
    
    localStorage.setItem('systemActivities', JSON.stringify(activities));
    
    // Reload activity log if on dashboard
    if (document.getElementById('activityTableBody')) {
        loadRecentActivity();
    }
}

// Mark All as Read
function markAllActivitiesAsRead() {
    const activities = JSON.parse(localStorage.getItem('systemActivities') || '[]');
    activities.forEach(activity => activity.read = true);
    localStorage.setItem('systemActivities', JSON.stringify(activities));
    updateNotificationCount(0);
}

// View All Activities Handler
function initializeViewAllButton() {
    const viewAllBtn = document.getElementById('viewAllActivities');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            // Navigate to all activities module
            showAllActivitiesModule();
        });
    }
}

// Show All Activities Module
function showAllActivitiesModule() {
    // Hide all modules
    document.querySelectorAll('.module').forEach(module => {
        module.classList.remove('active');
    });
    
    // Show all activities module
    const allActivitiesModule = document.getElementById('all-activities-module');
    if (allActivitiesModule) {
        allActivitiesModule.classList.add('active');
        loadAllActivities();
        initializeAllActivitiesModule();
    }
}

// Load All Activities
let currentPage = 1;
let activitiesPerPage = 20;
let filteredActivities = [];

function loadAllActivities(filters = {}) {
    const allActivitiesTableBody = document.getElementById('allActivitiesTableBody');
    const emptyState = document.getElementById('allActivitiesEmptyState');
    
    if (!allActivitiesTableBody) return;
    
    try {
        // Load all activities from localStorage
        let activities = JSON.parse(localStorage.getItem('systemActivities') || '[]');
        
        // Apply filters
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            activities = activities.filter(a => 
                a.description.toLowerCase().includes(searchLower) ||
                a.user.toLowerCase().includes(searchLower) ||
                a.details.toLowerCase().includes(searchLower)
            );
        }
        
        if (filters.type) {
            activities = activities.filter(a => a.type === filters.type);
        }
        
        if (filters.module) {
            activities = activities.filter(a => a.module === filters.module);
        }
        
        // Sort by timestamp (newest first)
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        filteredActivities = activities;
        
        if (activities.length === 0) {
            allActivitiesTableBody.innerHTML = '';
            emptyState.classList.remove('hidden');
            updatePagination(0);
            return;
        }
        
        // Pagination
        const totalPages = Math.ceil(activities.length / activitiesPerPage);
        const startIndex = (currentPage - 1) * activitiesPerPage;
        const endIndex = startIndex + activitiesPerPage;
        const paginatedActivities = activities.slice(startIndex, endIndex);
        
        // Render activities
        allActivitiesTableBody.innerHTML = paginatedActivities.map(activity => {
            const timeString = formatActivityTime(activity.timestamp);
            const fullTime = new Date(activity.timestamp).toLocaleString('en-KE');
            const icon = getActivityIcon(activity.type);
            const iconColor = getActivityColor(activity.type);
            const statusBadge = activity.read 
                ? '<span class="activity-status-badge read">Read</span>'
                : '<span class="activity-status-badge unread">New</span>';
            
            return `
                <tr>
                    <td data-label="Time" class="activity-time" title="${fullTime}">${timeString}</td>
                    <td data-label="Activity">
                        <div class="activity-description">
                            <div class="activity-icon ${iconColor}">
                                ${icon}
                            </div>
                            ${activity.description}
                        </div>
                    </td>
                    <td data-label="User" class="activity-user">${activity.user}</td>
                    <td data-label="Module">
                        <span class="activity-module">${activity.module}</span>
                    </td>
                    <td data-label="Details" class="activity-details">${activity.details || '-'}</td>
                    <td data-label="Status">${statusBadge}</td>
                </tr>
            `;
        }).join('');
        
        emptyState.classList.add('hidden');
        updatePagination(totalPages);
        
    } catch (error) {
        console.error('Error loading all activities:', error);
    }
}

// Update Pagination
function updatePagination(totalPages) {
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (!paginationInfo) return;
    
    if (totalPages === 0) {
        paginationInfo.textContent = 'No results';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }
    
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
}

// Initialize All Activities Module
function initializeAllActivitiesModule() {
    // Mark all as read button
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn && !markAllReadBtn.dataset.initialized) {
        markAllReadBtn.dataset.initialized = 'true';
        markAllReadBtn.addEventListener('click', () => {
            markAllActivitiesAsRead();
            loadAllActivities(getActiveFilters());
            loadRecentActivity();
        });
    }
    
    // Search filter
    const searchInput = document.getElementById('activitySearchInput');
    if (searchInput && !searchInput.dataset.initialized) {
        searchInput.dataset.initialized = 'true';
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1;
            loadAllActivities(getActiveFilters());
        }, 300));
    }
    
    // Type filter
    const typeFilter = document.getElementById('activityTypeFilter');
    if (typeFilter && !typeFilter.dataset.initialized) {
        typeFilter.dataset.initialized = 'true';
        typeFilter.addEventListener('change', () => {
            currentPage = 1;
            loadAllActivities(getActiveFilters());
        });
    }
    
    // Module filter
    const moduleFilter = document.getElementById('activityModuleFilter');
    if (moduleFilter && !moduleFilter.dataset.initialized) {
        moduleFilter.dataset.initialized = 'true';
        moduleFilter.addEventListener('change', () => {
            currentPage = 1;
            loadAllActivities(getActiveFilters());
        });
    }
    
    // Pagination buttons
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn && !prevBtn.dataset.initialized) {
        prevBtn.dataset.initialized = 'true';
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadAllActivities(getActiveFilters());
            }
        });
    }
    
    if (nextBtn && !nextBtn.dataset.initialized) {
        nextBtn.dataset.initialized = 'true';
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredActivities.length / activitiesPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                loadAllActivities(getActiveFilters());
            }
        });
    }
}

// Get Active Filters
function getActiveFilters() {
    const searchInput = document.getElementById('activitySearchInput');
    const typeFilter = document.getElementById('activityTypeFilter');
    const moduleFilter = document.getElementById('activityModuleFilter');
    
    return {
        search: searchInput ? searchInput.value.trim() : '',
        type: typeFilter ? typeFilter.value : '',
        module: moduleFilter ? moduleFilter.value : ''
    };
}

// Perform Dashboard Search
async function performDashboardSearch(query) {
    console.log('Searching for:', query);
    // Implement search functionality with Firebase
    // Search across products, customers, and transactions
}

// Debounce Utility
function debounce(func, wait) {
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

// Stat Card Click Handlers
function initializeStatCardClicks() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const stat = card.getAttribute('data-stat');
            handleStatCardClick(stat);
        });
    });
}

// Handle Stat Card Click
function handleStatCardClick(stat) {
    const pageMap = {
        'sales': 'all-sales',
        'expenses': 'expenses',
        'profit': 'reports',
        'customers': 'customers',
        'stock': 'inventory',
        'b2b': 'b2b-sales'
    };
    
    const page = pageMap[stat];
    if (page) {
        const link = document.querySelector(`[data-page="${page}"]`);
        if (link) {
            link.click();
        }
    }
}

// Initialize Action Buttons
function initializeActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            handleActionButtonClick(action);
        });
    });
}

// Handle Action Button Click
function handleActionButtonClick(action) {
    if (action === 'print-report') {
        printDailyReport();
    } else {
        // Navigate to the corresponding page
        const link = document.querySelector(`[data-page="${action}"]`);
        if (link) {
            link.click();
        }
    }
}

// Print Daily Report
function printDailyReport() {
    // Generate and print daily report
    const printWindow = window.open('', '_blank');
    const today = new Date().toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Daily Report - ${today}</title>
            <style>
                body {
                    font-family: 'Montserrat', Arial, sans-serif;
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 10px;
                }
                .date {
                    text-align: center;
                    color: #666;
                    margin-bottom: 30px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                th {
                    background-color: #f5f5f5;
                    font-weight: 600;
                }
                .total {
                    font-weight: bold;
                    font-size: 1.2em;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <h1>Daily Report</h1>
            <p class="date">${today}</p>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Today's Sales</td>
                    <td>${document.getElementById('todaysSales').textContent}</td>
                </tr>
                <tr>
                    <td>Today's Expenses</td>
                    <td>${document.getElementById('todaysExpenses').textContent}</td>
                </tr>
                <tr class="total">
                    <td>Profit/Loss</td>
                    <td>${document.getElementById('profitLoss').textContent}</td>
                </tr>
                <tr>
                    <td>Total Customers</td>
                    <td>${document.getElementById('totalCustomers').textContent}</td>
                </tr>
                <tr>
                    <td>Stock Value</td>
                    <td>${document.getElementById('stockValue').textContent}</td>
                </tr>
                <tr>
                    <td>Pending B2B Orders</td>
                    <td>${document.getElementById('pendingB2B').textContent}</td>
                </tr>
            </table>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// Export functions
window.Dashboard = {
    initialize: initializeDashboard,
    loadStats: loadDashboardStats,
    formatKenyaShillings,
    formatNumber,
    printReport: printDailyReport,
    addActivity: addActivity,
    loadActivity: loadRecentActivity,
    markAllRead: markAllActivitiesAsRead
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeDashboard();
        initializeStatCardClicks();
        initializeActionButtons();
        initializeViewAllButton();
    });
} else {
    initializeDashboard();
    initializeStatCardClicks();
    initializeActionButtons();
    initializeViewAllButton();
}
