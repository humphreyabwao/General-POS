// ===========================
// Expenses Module - Real-time Firebase Integration
// ===========================
// 
// This module handles all expense operations with real-time Firebase sync:
// - Add, Update, Delete expenses → Firebase Realtime Database
// - Real-time listener in global-state.js updates AppState.expenses
// - expenses:updated event triggers table refresh & stats update
// - Dashboard automatically updates via stats:updated event
// - All changes sync instantly across all users
//
// Key Functions:
// - addExpense() → Firebase.db.addData('expenses', data)
// - updateExpense() → Firebase.db.updateData('expenses/{id}', data)
// - deleteExpense() → Firebase.db.deleteData('expenses/{id}')
// - Real-time updates via StateEvents.on('expenses:updated')
// ===========================

let currentExpenseFilters = {
    search: '',
    category: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    paymentMethod: 'all'
};

// Expense categories
const EXPENSE_CATEGORIES = [
    'Rent & Utilities',
    'Salaries & Wages',
    'Inventory Purchase',
    'Transportation',
    'Marketing & Advertising',
    'Office Supplies',
    'Repairs & Maintenance',
    'Insurance',
    'Taxes & Licenses',
    'Other'
];

// ===========================
// Initialize Expenses Module
// ===========================
function initializeExpensesModule() {
    console.log('📊 Initializing Expenses Module...');
    
    // Check if AppState is available
    if (!window.AppState) {
        console.warn('⚠️ AppState not available yet');
        return;
    }
    
    console.log('📊 AppState available. Initialized:', window.AppState.isInitialized);
    console.log('📊 Current expenses count:', window.AppState.expenses?.length || 0);
    
    // Load expenses when module is shown
    if (window.AppState.isInitialized) {
        renderExpensesTable();
        updateExpenseStats();
    } else {
        console.log('⏳ Waiting for AppState to initialize...');
        // Wait for initialization
        StateEvents.once('sync:ready', () => {
            console.log('✅ Sync ready, loading expenses...');
            renderExpensesTable();
            updateExpenseStats();
        });
    }
    
    // Listen for real-time updates (only register once)
    if (window.StateEvents && !window._expensesListenerRegistered) {
        StateEvents.on('expenses:updated', () => {
            console.log('💸 Expenses updated event received! Count:', window.AppState.expenses?.length || 0);
            renderExpensesTable();
            updateExpenseStats();
        });
        window._expensesListenerRegistered = true;
        console.log('✅ Real-time expense listener registered');
    }
    
    setupExpenseEventListeners();
}

// ===========================
// Setup Event Listeners
// ===========================
function setupExpenseEventListeners() {
    // Search input
    const searchInput = document.getElementById('expenseSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentExpenseFilters.search = e.target.value.toLowerCase();
            renderExpensesTable();
        });
    }
    
    // Category filter
    const categoryFilter = document.getElementById('expenseCategoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentExpenseFilters.category = e.target.value;
            renderExpensesTable();
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('expenseStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentExpenseFilters.status = e.target.value;
            renderExpensesTable();
        });
    }
    
    // Payment method filter
    const paymentFilter = document.getElementById('expensePaymentFilter');
    if (paymentFilter) {
        paymentFilter.addEventListener('change', (e) => {
            currentExpenseFilters.paymentMethod = e.target.value;
            renderExpensesTable();
        });
    }
    
    // Date filters
    const dateFromInput = document.getElementById('expenseDateFrom');
    const dateToInput = document.getElementById('expenseDateTo');
    
    if (dateFromInput) {
        dateFromInput.addEventListener('change', (e) => {
            currentExpenseFilters.dateFrom = e.target.value;
            renderExpensesTable();
        });
    }
    
    if (dateToInput) {
        dateToInput.addEventListener('change', (e) => {
            currentExpenseFilters.dateTo = e.target.value;
            renderExpensesTable();
        });
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearExpenseFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearExpenseFilters);
    }
    
    // Export buttons
    const exportCsvBtn = document.getElementById('exportExpensesCsv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportExpensesToCSV);
    }
    
    const exportExcelBtn = document.getElementById('exportExpensesExcel');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportExpensesToExcel);
    }
    
    const exportPdfBtn = document.getElementById('exportExpensesPdf');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportExpensesToPDF);
    }
}

// ===========================
// Update Expense Statistics
// ===========================
function updateExpenseStats() {
    console.log('📊 Updating expense statistics...');
    
    const stats = window.AppState?.stats || {};
    const expenses = window.AppState?.expenses || [];
    
    console.log('📊 Stats:', { todayExpenses: stats.todayExpenses, expenseCount: expenses.length });
    
    // Today's total
    const todayTotal = stats.todayExpenses || 0;
    const todayElement = document.getElementById('expenseTodayTotal');
    if (todayElement) {
        todayElement.textContent = formatCurrency(todayTotal);
    }
    
    // Month's total
    const monthTotal = calculateMonthExpenses(expenses);
    const monthElement = document.getElementById('expenseMonthTotal');
    if (monthElement) {
        monthElement.textContent = formatCurrency(monthTotal);
    }
    
    // Pending approval count
    const pendingCount = expenses.filter(exp => exp.status === 'pending').length;
    const pendingElement = document.getElementById('expensePendingCount');
    if (pendingElement) {
        pendingElement.textContent = pendingCount;
    }
    
    // Approved this month
    const approvedMonth = expenses.filter(exp => {
        const expDate = new Date(exp.createdAt || exp.date);
        const now = new Date();
        return exp.status === 'approved' && 
               expDate.getMonth() === now.getMonth() && 
               expDate.getFullYear() === now.getFullYear();
    }).length;
    const approvedElement = document.getElementById('expenseApprovedCount');
    if (approvedElement) {
        approvedElement.textContent = approvedMonth;
    }
    
    console.log('✅ Stats updated:', { todayTotal, monthTotal, pendingCount, approvedMonth });
}

function calculateMonthExpenses(expenses) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return expenses
        .filter(exp => {
            const expDate = new Date(exp.createdAt || exp.date);
            return expDate >= monthStart && expDate <= monthEnd;
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
}

// ===========================
// Render Expenses Table
// ===========================
function renderExpensesTable() {
    console.log('📋 Rendering expenses table...');
    
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) {
        console.warn('⚠️ Table body not found');
        return;
    }
    
    let expenses = window.AppState?.expenses || [];
    console.log('📋 Total expenses before filter:', expenses.length);
    
    // Apply filters
    expenses = filterExpenses(expenses);
    console.log('📋 Expenses after filter:', expenses.length);
    
    // Sort by date (newest first)
    expenses.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return dateB - dateA;
    });
    
    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">No expenses found</div>
                    <div style="font-size: 14px;">Try adjusting your filters or add a new expense</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = expenses.map(expense => {
        const date = new Date(expense.createdAt || expense.date);
        const formattedDate = date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
        
        const statusBadge = getStatusBadge(expense.status);
        const categoryColor = getCategoryColor(expense.category);
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${categoryColor};"></span>
                        <span>${expense.category || 'Uncategorized'}</span>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 500; margin-bottom: 4px;">${expense.description || 'No description'}</div>
                    ${expense.vendor ? `<div style="font-size: 12px; color: #64748b;">Vendor: ${expense.vendor}</div>` : ''}
                </td>
                <td style="font-weight: 600; color: #dc2626;">${formatCurrency(expense.amount || 0)}</td>
                <td>
                    <span class="badge badge-${expense.paymentMethod || 'cash'}">${formatPaymentMethod(expense.paymentMethod)}</span>
                </td>
                <td>${statusBadge}</td>
                <td style="font-size: 12px; color: #64748b;">${expense.reference || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="viewExpense('${expense.id}')" title="View Details">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="editExpense('${expense.id}')" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        ${expense.status === 'pending' ? `
                        <button class="btn-icon btn-approve" onclick="approveExpense('${expense.id}')" title="Approve">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        ` : ''}
                        <button class="btn-icon btn-delete" onclick="deleteExpense('${expense.id}')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ===========================
// Filter Expenses
// ===========================
function filterExpenses(expenses) {
    return expenses.filter(expense => {
        // Search filter
        if (currentExpenseFilters.search) {
            const searchLower = currentExpenseFilters.search.toLowerCase();
            const matchesSearch = 
                (expense.description || '').toLowerCase().includes(searchLower) ||
                (expense.category || '').toLowerCase().includes(searchLower) ||
                (expense.vendor || '').toLowerCase().includes(searchLower) ||
                (expense.reference || '').toLowerCase().includes(searchLower);
            
            if (!matchesSearch) return false;
        }
        
        // Category filter
        if (currentExpenseFilters.category !== 'all' && expense.category !== currentExpenseFilters.category) {
            return false;
        }
        
        // Status filter
        if (currentExpenseFilters.status !== 'all' && expense.status !== currentExpenseFilters.status) {
            return false;
        }
        
        // Payment method filter
        if (currentExpenseFilters.paymentMethod !== 'all' && expense.paymentMethod !== currentExpenseFilters.paymentMethod) {
            return false;
        }
        
        // Date range filter
        if (currentExpenseFilters.dateFrom || currentExpenseFilters.dateTo) {
            const expenseDate = new Date(expense.createdAt || expense.date);
            expenseDate.setHours(0, 0, 0, 0);
            
            if (currentExpenseFilters.dateFrom) {
                const fromDate = new Date(currentExpenseFilters.dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                if (expenseDate < fromDate) return false;
            }
            
            if (currentExpenseFilters.dateTo) {
                const toDate = new Date(currentExpenseFilters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (expenseDate > toDate) return false;
            }
        }
        
        return true;
    });
}

// ===========================
// Helper Functions
// ===========================
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge status-pending">Pending</span>',
        'approved': '<span class="status-badge status-approved">Approved</span>',
        'rejected': '<span class="status-badge status-rejected">Rejected</span>'
    };
    return badges[status] || badges['pending'];
}

function getCategoryColor(category) {
    const colors = {
        'Rent & Utilities': '#3b82f6',
        'Salaries & Wages': '#8b5cf6',
        'Inventory Purchase': '#10b981',
        'Transportation': '#f59e0b',
        'Marketing & Advertising': '#ec4899',
        'Office Supplies': '#06b6d4',
        'Repairs & Maintenance': '#ef4444',
        'Insurance': '#6366f1',
        'Taxes & Licenses': '#14b8a6',
        'Other': '#64748b'
    };
    return colors[category] || '#64748b';
}

function formatPaymentMethod(method) {
    const methods = {
        'cash': 'Cash',
        'mpesa': 'M-Pesa',
        'bank': 'Bank Transfer',
        'card': 'Card'
    };
    return methods[method] || 'Cash';
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function clearExpenseFilters() {
    currentExpenseFilters = {
        search: '',
        category: 'all',
        status: 'all',
        dateFrom: '',
        dateTo: '',
        paymentMethod: 'all'
    };
    
    // Reset form inputs
    document.getElementById('expenseSearch').value = '';
    document.getElementById('expenseCategoryFilter').value = 'all';
    document.getElementById('expenseStatusFilter').value = 'all';
    document.getElementById('expensePaymentFilter').value = 'all';
    document.getElementById('expenseDateFrom').value = '';
    document.getElementById('expenseDateTo').value = '';
    
    renderExpensesTable();
}

// ===========================
// CRUD Operations
// ===========================

// Add new expense
async function addExpense(expenseData) {
    try {
        console.log('💸 Adding expense to Firebase...', expenseData);
        
        const result = await Firebase.db.addData('expenses', {
            ...expenseData,
            status: 'pending'
        });
        
        if (result.success) {
            console.log('✅ Expense added to Firebase! ID:', result.id);
            showToast('Expense added successfully!', 'success');
            return { success: true, id: result.id };
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error adding expense:', error);
        showToast('Failed to add expense: ' + error.message, 'error');
        throw error;
    }
}

// Update expense
async function updateExpense(expenseId, updates) {
    try {
        console.log('💸 Updating expense in Firebase...', expenseId, updates);
        
        const result = await Firebase.db.updateData(`expenses/${expenseId}`, updates);
        
        if (result.success) {
            console.log('✅ Expense updated successfully:', expenseId);
            showToast('Expense updated successfully!', 'success');
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error updating expense:', error);
        showToast('Failed to update expense: ' + error.message, 'error');
        throw error;
    }
}

// Delete expense
async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('💸 Deleting expense from Firebase...', expenseId);
        
        const result = await Firebase.db.deleteData(`expenses/${expenseId}`);
        
        if (result.success) {
            console.log('✅ Expense deleted successfully:', expenseId);
            showToast('Expense deleted successfully!', 'success');
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error deleting expense:', error);
        showToast('Failed to delete expense: ' + error.message, 'error');
    }
}

// Approve expense
async function approveExpense(expenseId) {
    try {
        await updateExpense(expenseId, { status: 'approved' });
        showToast('Expense approved!', 'success');
    } catch (error) {
        console.error('Error approving expense:', error);
    }
}

// View expense details
function viewExpense(expenseId) {
    const expense = AppState.expenses.find(exp => exp.id === expenseId);
    if (!expense) return;
    
    const date = new Date(expense.createdAt || expense.date);
    const formattedDate = date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const categoryColor = getCategoryColor(expense.category);
    
    const modalHTML = `
        <div class="expense-modal-overlay" onclick="closeModal(event)">
            <div class="expense-modal-content" onclick="event.stopPropagation()">
                <div class="expense-modal-header">
                    <div>
                        <h2>Expense Details</h2>
                        <p class="expense-modal-id">#${expense.id?.substring(0, 12) || 'N/A'}</p>
                    </div>
                    <button class="expense-modal-close" onclick="closeModal()" aria-label="Close modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="expense-modal-body">
                    <div class="expense-detail-grid">
                        <div class="expense-detail-item">
                            <div class="expense-detail-label">Date & Time</div>
                            <div class="expense-detail-value">${escapeHtml(formattedDate)}</div>
                        </div>
                        
                        <div class="expense-detail-item">
                            <div class="expense-detail-label">Category</div>
                            <div class="expense-detail-value">
                                <span class="expense-category-badge" style="background-color: ${categoryColor}15; color: ${categoryColor}; border: 1px solid ${categoryColor}40;">
                                    <span class="expense-category-dot" style="background-color: ${categoryColor};"></span>
                                    ${escapeHtml(expense.category || 'Uncategorized')}
                                </span>
                            </div>
                        </div>
                        
                        <div class="expense-detail-item expense-detail-amount">
                            <div class="expense-detail-label">Amount</div>
                            <div class="expense-detail-value expense-amount-large">${formatCurrency(expense.amount || 0)}</div>
                        </div>
                        
                        <div class="expense-detail-item expense-detail-full">
                            <div class="expense-detail-label">Description</div>
                            <div class="expense-detail-value">${escapeHtml(expense.description || 'No description')}</div>
                        </div>
                        
                        ${expense.vendor ? `
                        <div class="expense-detail-item">
                            <div class="expense-detail-label">Vendor/Payee</div>
                            <div class="expense-detail-value">${escapeHtml(expense.vendor)}</div>
                        </div>
                        ` : ''}
                        
                        <div class="expense-detail-item">
                            <div class="expense-detail-label">Payment Method</div>
                            <div class="expense-detail-value">
                                <span class="badge badge-${expense.paymentMethod || 'cash'}">${formatPaymentMethod(expense.paymentMethod)}</span>
                            </div>
                        </div>
                        
                        ${expense.reference ? `
                        <div class="expense-detail-item">
                            <div class="expense-detail-label">Reference/Receipt</div>
                            <div class="expense-detail-value">${escapeHtml(expense.reference)}</div>
                        </div>
                        ` : ''}
                        
                        <div class="expense-detail-item">
                            <div class="expense-detail-label">Status</div>
                            <div class="expense-detail-value">${getStatusBadge(expense.status)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="expense-modal-footer">
                    ${expense.status === 'pending' ? `
                    <button class="btn btn-success" onclick="approveExpense('${expense.id}'); closeModal();">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Approve Expense
                    </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="editExpense('${expense.id}'); closeModal();">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Add keyboard listener for ESC key
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    document.addEventListener('keydown', handleEscKey);
    
    // Store the listener so we can remove it later
    window._expenseModalEscListener = handleEscKey;
}

// Edit expense
function editExpense(expenseId) {
    const expense = AppState.expenses.find(exp => exp.id === expenseId);
    if (!expense) return;
    
    // Store expense ID for update
    window.currentEditingExpenseId = expenseId;
    
    // Navigate to add expense module
    showModule('expenses-add');
    
    // Populate form
    setTimeout(() => {
        document.getElementById('expenseDate').value = new Date(expense.createdAt || expense.date).toISOString().split('T')[0];
        document.getElementById('expenseCategory').value = expense.category || '';
        document.getElementById('expenseDescription').value = expense.description || '';
        document.getElementById('expenseAmount').value = expense.amount || '';
        document.getElementById('expensePaymentMethod').value = expense.paymentMethod || 'cash';
        document.getElementById('expenseVendor').value = expense.vendor || '';
        document.getElementById('expenseReference').value = expense.reference || '';
        
        // Update form title and button
        document.querySelector('#expenses-add-module .module-header h1').textContent = 'Edit Expense';
        document.querySelector('#expenseForm button[type="submit"]').textContent = 'Update Expense';
    }, 100);
}

// Close modal
function closeModal(event) {
    // Prevent closing if clicking inside modal content
    if (event && event.target.classList.contains('expense-modal-content')) {
        return;
    }
    
    const modal = document.querySelector('.expense-modal-overlay');
    if (modal) {
        // Add fade out animation
        modal.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => {
            modal.remove();
            // Restore body scroll
            document.body.style.overflow = '';
            
            // Remove ESC key listener
            if (window._expenseModalEscListener) {
                document.removeEventListener('keydown', window._expenseModalEscListener);
                window._expenseModalEscListener = null;
            }
        }, 200);
    }
}

// ===========================
// Export to CSV
// ===========================
function exportExpensesToCSV() {
    const expenses = filterExpenses(window.AppState?.expenses || []);
    
    if (expenses.length === 0) {
        showToast('No expenses to export', 'error');
        return;
    }
    
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Status', 'Vendor', 'Reference'];
    const rows = expenses.map(exp => [
        new Date(exp.createdAt || exp.date).toLocaleDateString('en-GB'),
        exp.category || '',
        exp.description || '',
        exp.amount || 0,
        formatPaymentMethod(exp.paymentMethod),
        exp.status || 'pending',
        exp.vendor || '',
        exp.reference || ''
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Expenses exported successfully!', 'success');
}

function exportExpensesToExcel() {
    const expenses = filterExpenses(window.AppState?.expenses || []);
    
    if (expenses.length === 0) {
        showToast('No expenses to export', 'error');
        return;
    }
    
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Status', 'Vendor', 'Reference'];
    const rowsHtml = expenses.map(exp => {
        const date = new Date(exp.createdAt || exp.date).toLocaleDateString('en-GB');
        return `
            <tr>
                <td>${escapeHtml(date)}</td>
                <td>${escapeHtml(exp.category || '')}</td>
                <td>${escapeHtml(exp.description || '')}</td>
                <td>${escapeHtml(formatCurrency(exp.amount || 0))}</td>
                <td>${escapeHtml(formatPaymentMethod(exp.paymentMethod))}</td>
                <td>${escapeHtml(exp.status || 'pending')}</td>
                <td>${escapeHtml(exp.vendor || '')}</td>
                <td>${escapeHtml(exp.reference || '')}</td>
            </tr>
        `;
    }).join('');
    
    const tableHtml = `
        <table>
            <thead>
                <tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
    
    const htmlDocument = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body>${tableHtml}</body></html>`;
    const blob = new Blob([htmlDocument], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Expenses exported as Excel!', 'success');
}

function exportExpensesToPDF() {
    const expenses = filterExpenses(window.AppState?.expenses || []);
    
    if (expenses.length === 0) {
        showToast('No expenses to export', 'error');
        return;
    }
    
    const pdfWindow = window.open('', 'ExpensesPDF', 'width=900,height=700');
    if (!pdfWindow) {
        showToast('Popup blocked. Allow popups to export PDF.', 'error');
        return;
    }
    
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Status', 'Vendor', 'Reference'];
    const rowsHtml = expenses.map(exp => {
        const date = new Date(exp.createdAt || exp.date).toLocaleDateString('en-GB');
        return `
            <tr>
                <td>${escapeHtml(date)}</td>
                <td>${escapeHtml(exp.category || '')}</td>
                <td>${escapeHtml(exp.description || '')}</td>
                <td>${escapeHtml(formatCurrency(exp.amount || 0))}</td>
                <td>${escapeHtml(formatPaymentMethod(exp.paymentMethod))}</td>
                <td>${escapeHtml(exp.status || 'pending')}</td>
                <td>${escapeHtml(exp.vendor || '')}</td>
                <td>${escapeHtml(exp.reference || '')}</td>
            </tr>
        `;
    }).join('');
    
    const styles = `
        <style>
            body { font-family: 'Montserrat', Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; text-align: left; }
            th { background: #0f172a; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; }
            tr:nth-child(even) { background: #f8fafc; }
        </style>
    `;
    
    pdfWindow.document.write(`<!DOCTYPE html><html><head><title>Expenses Report</title>${styles}</head><body>`);
    pdfWindow.document.write(`<h1>Expenses Report</h1>`);
    pdfWindow.document.write(`<p style="font-size:12px; color:#64748b; margin-bottom:16px;">Generated on ${escapeHtml(new Date().toLocaleString())}</p>`);
    pdfWindow.document.write('<table><thead><tr>' + headers.map(header => `<th>${escapeHtml(header)}</th>`).join('') + '</tr></thead>');
    pdfWindow.document.write(`<tbody>${rowsHtml}</tbody></table>`);
    pdfWindow.document.write('</body></html>');
    pdfWindow.document.close();
    pdfWindow.focus();
    
    setTimeout(() => {
        pdfWindow.print();
    }, 300);
    
    showToast('Preparing PDF... choose "Save as PDF" in the print dialog.', 'info', 4000);
}

// ===========================
// Add Expense Form Handler
// ===========================
function setupExpenseForm() {
    const form = document.getElementById('expenseForm');
    if (!form) {
        console.log('⚠️ Expense form not found, will retry...');
        return;
    }
    
    console.log('📝 Expense form handler initialized');
    
    // Set default date if empty
    const dateInput = document.getElementById('expenseDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            date: document.getElementById('expenseDate').value,
            category: document.getElementById('expenseCategory').value,
            description: document.getElementById('expenseDescription').value,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            paymentMethod: document.getElementById('expensePaymentMethod').value,
            vendor: document.getElementById('expenseVendor').value,
            reference: document.getElementById('expenseReference').value
        };
        
        console.log('📝 Form submitted with data:', formData);
        
        // Validation
        if (!formData.category || !formData.description || !formData.amount || formData.amount <= 0) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            // Check if editing or adding
            if (window.currentEditingExpenseId) {
                console.log('✏️ Editing expense:', window.currentEditingExpenseId);
                await updateExpense(window.currentEditingExpenseId, formData);
                window.currentEditingExpenseId = null;
            } else {
                console.log('➕ Adding new expense');
                await addExpense(formData);
            }
            
            // Reset form
            form.reset();
            document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
            
            // Navigate back to expenses list
            showModule('expenses');
            
            // Reset form title
            document.querySelector('#expenses-add-module .module-header h1').textContent = 'Add Expense';
            document.querySelector('#expenseForm button[type="submit"]').textContent = 'Add Expense';
            
        } catch (error) {
            console.error('❌ Error saving expense:', error);
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔄 DOM loaded, initializing expense form...');
        setTimeout(setupExpenseForm, 500);
    });
} else {
    console.log('🔄 DOM ready, initializing expense form...');
    setTimeout(setupExpenseForm, 500);
}

console.log('✅ Expenses module loaded');
