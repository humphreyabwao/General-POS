// ===========================
// Sales Module - All Sales Management
// ===========================

let filteredSales = [];
let allSalesCache = [];
let salesListener = null;

// Filter state
const SalesFilterState = {
    dateRange: 'all', // all, today, yesterday, thisWeek, thisMonth, custom
    customStartDate: null,
    customEndDate: null,
    searchTerm: '',
    paymentMethod: '', // all, cash, card, check, etc.
    sortBy: 'date', // date, amount, customer, status
    sortOrder: 'desc' // asc, desc
};

// ===========================
// Initialize Sales Module
// ===========================
function initializeSalesModule() {
    console.log('✅ Initializing Sales Module');
    
    // Set up real-time listener
    setupSalesRealtimeListener();
    
    // Initialize UI elements
    initializeSalesSearchbar();
    initializeSalesFilters();
    initializeSalesTable();
    initializeQuickAccessButton();
    
    // Listen to state events
    StateEvents.on('sales:updated', () => {
        console.log('📊 Sales data updated, refreshing view');
        applyFiltersAndDisplay();
    });
    
    // Load initial data if available
    if (AppState.isInitialized && AppState.sales.length > 0) {
        allSalesCache = [...AppState.sales];
        applyFiltersAndDisplay();
    }
}

// ===========================
// Quick Access Button
// ===========================
function initializeQuickAccessButton() {
    const quickNewSaleBtn = document.getElementById('quickNewSaleBtn');
    
    if (quickNewSaleBtn) {
        quickNewSaleBtn.addEventListener('click', () => {
            // Navigate to POS New Sale module
            const posLink = document.querySelector('[data-page="pos-new-sale"]');
            if (posLink) {
                posLink.click();
                showToast('Opening New Sale...', 'info', 2000);
            }
        });
    }
}

// ===========================
// Real-time Sales Listener
// ===========================
function setupSalesRealtimeListener() {
    console.log('🔄 Setting up real-time sales listener');
    
    try {
        if (salesListener) {
            // Remove old listener if it exists
            AppState.listeners.sales = null;
        }
        
        // Listen to sales updates
        salesListener = database.ref('sales').on('value', (snapshot) => {
            const data = snapshot.val();
            let sales = [];
            
            if (data) {
                sales = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
            }
            
            console.log('💰 Real-time sales update received:', sales.length, 'sales');
            allSalesCache = sales;
            AppState.sales = sales;
            
            // Update stats
            calculateStats();
            
            // Emit event for other modules
            StateEvents.emit('sales:updated', sales);
            
            // Refresh the display
            applyFiltersAndDisplay();
            
        }, (error) => {
            console.error('❌ Error listening to sales:', error);
            showToast('Error loading sales data', 'error', 3000);
        });
        
    } catch (error) {
        console.error('❌ Error setting up sales listener:', error);
    }
}

// ===========================
// Search Bar Initialization
// ===========================
function initializeSalesSearchbar() {
    const searchInput = document.getElementById('salesSearchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            SalesFilterState.searchTerm = e.target.value.trim().toLowerCase();
            applyFiltersAndDisplay();
        }, 300));
    }
}

// ===========================
// Filters Initialization
// ===========================
function initializeSalesFilters() {
    // Date range filters
    const dateFilterBtns = document.querySelectorAll('[data-date-filter]');
    dateFilterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            dateFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Apply filter
            const filterType = btn.getAttribute('data-date-filter');
            SalesFilterState.dateRange = filterType;
            
            // Show custom date inputs if custom is selected
            const customDateInputs = document.getElementById('customDateInputs');
            if (filterType === 'custom' && customDateInputs) {
                customDateInputs.style.display = 'flex';
            } else if (customDateInputs) {
                customDateInputs.style.display = 'none';
            }
            
            applyFiltersAndDisplay();
        });
    });
    
    // Custom date inputs
    const customStartDate = document.getElementById('customStartDate');
    const customEndDate = document.getElementById('customEndDate');
    
    if (customStartDate) {
        customStartDate.addEventListener('change', (e) => {
            SalesFilterState.customStartDate = e.target.value;
            applyFiltersAndDisplay();
        });
    }
    
    if (customEndDate) {
        customEndDate.addEventListener('change', (e) => {
            SalesFilterState.customEndDate = e.target.value;
            applyFiltersAndDisplay();
        });
    }
    
    // Payment method filter
    const paymentMethodFilter = document.getElementById('paymentMethodFilter');
    if (paymentMethodFilter) {
        paymentMethodFilter.addEventListener('change', (e) => {
            SalesFilterState.paymentMethod = e.target.value;
            applyFiltersAndDisplay();
        });
    }
    
    // Sort options
    const sortBySelect = document.getElementById('sortBySelect');
    if (sortBySelect) {
        sortBySelect.addEventListener('change', (e) => {
            SalesFilterState.sortBy = e.target.value;
            applyFiltersAndDisplay();
        });
    }
    
    // Sort order
    const sortOrderBtns = document.querySelectorAll('[data-sort-order]');
    sortOrderBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            sortOrderBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SalesFilterState.sortOrder = btn.getAttribute('data-sort-order');
            applyFiltersAndDisplay();
        });
    });
}

// ===========================
// Filter and Display Sales
// ===========================
function applyFiltersAndDisplay() {
    console.log('🔍 Applying filters to sales');
    
    // Start with all sales
    let filtered = [...allSalesCache];
    
    // Apply date range filter
    const dateRange = getDateRange(SalesFilterState.dateRange);
    if (dateRange) {
        filtered = filtered.filter(sale => {
            const saleDate = new Date(sale.createdAt || sale.date);
            return saleDate >= dateRange.start && saleDate <= dateRange.end;
        });
    }
    
    // Apply search filter
    if (SalesFilterState.searchTerm) {
        const search = SalesFilterState.searchTerm;
        filtered = filtered.filter(sale => {
            return (
                (sale.id && sale.id.toLowerCase().includes(search)) ||
                (sale.customerName && sale.customerName.toLowerCase().includes(search)) ||
                (sale.customerPhone && sale.customerPhone.includes(search)) ||
                (sale.items && sale.items.some(item => 
                    item.name && item.name.toLowerCase().includes(search)
                ))
            );
        });
    }
    
    // Apply payment method filter
    if (SalesFilterState.paymentMethod && SalesFilterState.paymentMethod !== 'all') {
        filtered = filtered.filter(sale => 
            sale.paymentMethod === SalesFilterState.paymentMethod
        );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        let compareVal = 0;
        
        switch (SalesFilterState.sortBy) {
            case 'date':
                compareVal = new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date);
                break;
            case 'amount':
                compareVal = (a.total || 0) - (b.total || 0);
                break;
            case 'customer':
                compareVal = (a.customerName || '').localeCompare(b.customerName || '');
                break;
            case 'items':
                compareVal = (a.items?.length || 0) - (b.items?.length || 0);
                break;
            default:
                compareVal = 0;
        }
        
        return SalesFilterState.sortOrder === 'desc' ? -compareVal : compareVal;
    });
    
    filteredSales = filtered;
    console.log(`✅ Filtered results: ${filtered.length} sales out of ${allSalesCache.length}`);
    
    // Display the filtered sales
    displaySalesTable();
}

// ===========================
// Get Date Range
// ===========================
function getDateRange(rangeType) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(today);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    
    switch (rangeType) {
        case 'all':
            // Return null to indicate no date filtering
            return null;
            
        case 'today':
            return { start, end };
            
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
            return { start, end };
            
        case 'thisWeek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return {
                start: weekStart,
                end: end
            };
            
        case 'thisMonth':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return {
                start: monthStart,
                end: end
            };
            
        case 'custom':
            if (SalesFilterState.customStartDate && SalesFilterState.customEndDate) {
                const customStart = new Date(SalesFilterState.customStartDate);
                customStart.setHours(0, 0, 0, 0);
                
                const customEnd = new Date(SalesFilterState.customEndDate);
                customEnd.setHours(23, 59, 59, 999);
                
                return {
                    start: customStart,
                    end: customEnd
                };
            }
            return null;
            
        default:
            return null;
    }
}

// ===========================
// Display Sales Table
// ===========================
function displaySalesTable() {
    const tbody = document.getElementById('salesTableBody');
    
    if (!tbody) {
        console.error('❌ Sales table body not found');
        return;
    }
    
    if (filteredSales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="opacity: 0.5; margin-bottom: 12px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                    </svg>
                    <p>No sales found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredSales.map(sale => {
        const saleDate = new Date(sale.createdAt || sale.date);
        const formattedDate = saleDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const itemCount = (sale.items || []).length;
        const itemQuantity = (sale.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        const formattedSaleId = formatSaleId(sale.id);
        
        return `
            <tr class="sales-row" data-sale-id="${sale.id}">
                <td><strong>${formattedSaleId}</strong></td>
                <td>${sale.customerName || 'Walk-in'}</td>
                <td>${formattedDate}</td>
                <td>${itemQuantity} items</td>
                <td><strong>${formatCurrencyKSh(sale.total || 0)}</strong></td>
                <td>
                    <span class="payment-badge payment-${(sale.paymentMethod || 'cash').toLowerCase()}">
                        ${formatPaymentMethod(sale.paymentMethod || 'Cash')}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${(sale.status || 'completed').toLowerCase()}">
                        ${formatStatus(sale.status || 'Completed')}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon view-sale-btn" data-sale-id="${sale.id}" title="View">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="btn-icon print-sale-btn" data-sale-id="${sale.id}" title="Print">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Attach event listeners
    document.querySelectorAll('.view-sale-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const saleId = e.currentTarget.getAttribute('data-sale-id');
            openSaleDetailModal(saleId);
        });
    });
    
    document.querySelectorAll('.print-sale-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const saleId = e.currentTarget.getAttribute('data-sale-id');
            printSaleReceipt(saleId);
        });
    });
}

// ===========================
// Initialize Sales Table
// ===========================
function initializeSalesTable() {
    // This is just a placeholder for additional table initialization
    console.log('✅ Sales table initialized');
}

// ===========================
// View Sale Details
// ===========================
function openSaleDetailModal(saleId) {
    const sale = allSalesCache.find(s => s.id === saleId);
    
    if (!sale) {
        showToast('Sale not found', 'error', 2000);
        return;
    }
    
    const modal = document.getElementById('saleDetailModal');
    if (!modal) {
        console.error('❌ Sale detail modal not found');
        return;
    }
    
    const saleDate = new Date(sale.createdAt || sale.date);
    const formattedDate = saleDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const itemsHTML = (sale.items || []).map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrencyKSh(item.price || 0)}</td>
            <td>${formatCurrencyKSh((item.quantity * item.price) || 0)}</td>
        </tr>
    `).join('');
    
    const formattedSaleId = formatSaleId(sale.id);
    
    const modalContent = `
        <div class="modal-content-wrapper">
            <div class="modal-header">
                <h2>Sale Details</h2>
                <button class="close-modal" type="button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        <div class="modal-body">
            <div class="sale-details-grid">
                <div class="detail-item">
                    <label>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        Sale ID
                    </label>
                    <p><strong>${formattedSaleId}</strong></p>
                </div>
                <div class="detail-item">
                    <label>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Date
                    </label>
                    <p>${formattedDate}</p>
                </div>
                <div class="detail-item">
                    <label>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Customer
                    </label>
                    <p>${sale.customerName || 'Walk-in Customer'}</p>
                </div>
                <div class="detail-item">
                    <label>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        Payment Method
                    </label>
                    <p>${formatPaymentMethod(sale.paymentMethod || 'Cash')}</p>
                </div>
                <div class="detail-item">
                    <label>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Status
                    </label>
                    <p><span class="status-badge status-${(sale.status || 'completed').toLowerCase()}">${formatStatus(sale.status || 'Completed')}</span></p>
                </div>
            </div>
            
            <div class="sale-items-section">
                <h3>Items</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>
            
            <div class="sale-summary">
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <strong>${formatCurrencyKSh((sale.subtotal || sale.total) - (sale.tax || 0))}</strong>
                </div>
                ${sale.discount ? `
                    <div class="summary-row">
                        <span>Discount:</span>
                        <strong>-${formatCurrencyKSh(sale.discount || 0)}</strong>
                    </div>
                ` : ''}
                ${sale.tax ? `
                    <div class="summary-row">
                        <span>Tax:</span>
                        <strong>${formatCurrencyKSh(sale.tax || 0)}</strong>
                    </div>
                ` : ''}
                <div class="summary-row total">
                    <span>Total:</span>
                    <strong>${formatCurrencyKSh(sale.total || 0)}</strong>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary close-modal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Close
            </button>
            <button class="btn btn-primary print-modal-btn" data-sale-id="${sale.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print Receipt
            </button>
        </div>
        </div>
    `;
    
    modal.innerHTML = modalContent;
    
    // Show modal with smooth transition
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
    
    // Setup event listeners
    setupSaleModalListeners(modal, sale.id);
}

// ===========================
// Setup Sale Modal Listeners
// ===========================
function setupSaleModalListeners(modal, saleId) {
    // Close button handlers - clone to remove old listeners
    modal.querySelectorAll('.close-modal').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => closeSaleModal(modal));
    });
    
    // Backdrop click
    const backdropHandler = (e) => {
        if (e.target === modal) {
            closeSaleModal(modal);
        }
    };
    modal.removeEventListener('click', backdropHandler);
    modal.addEventListener('click', backdropHandler);
    
    // ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeSaleModal(modal);
        }
    };
    document.removeEventListener('keydown', escHandler);
    document.addEventListener('keydown', escHandler);
    
    // Store handler for cleanup
    modal._escHandler = escHandler;
    
    // Print button
    const printBtn = modal.querySelector('.print-modal-btn');
    if (printBtn) {
        const newPrintBtn = printBtn.cloneNode(true);
        printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
        newPrintBtn.addEventListener('click', () => {
            printSaleReceipt(saleId);
        });
    }
}

// ===========================
// Close Sale Modal
// ===========================
function closeSaleModal(modal) {
    modal.classList.remove('show');
    
    // Cleanup ESC handler
    if (modal._escHandler) {
        document.removeEventListener('keydown', modal._escHandler);
        modal._escHandler = null;
    }
    
    // Wait for transition before clearing content
    setTimeout(() => {
        if (!modal.classList.contains('show')) {
            modal.innerHTML = '';
        }
    }, 300)
}

// ===========================
// Print Sale Receipt
// ===========================
function printSaleReceipt(saleId) {
    const sale = allSalesCache.find(s => s.id === saleId);
    
    if (!sale) {
        showToast('Sale not found', 'error', 2000);
        return;
    }
    
    const saleDate = new Date(sale.createdAt || sale.date);
    const formattedDate = saleDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const itemsHTML = (sale.items || []).map(item => `
        <tr>
            <td>${item.name}</td>
            <td style="text-align: right;">${item.quantity}</td>
            <td style="text-align: right;">${formatCurrencyKSh(item.price || 0)}</td>
            <td style="text-align: right;">${formatCurrencyKSh((item.quantity * item.price) || 0)}</td>
        </tr>
    `).join('');
    
    const formattedSaleId = formatSaleId(sale.id);
    
    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sale Receipt - ${formattedSaleId}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    max-width: 400px;
                    margin: 0;
                    padding: 20px;
                    background-color: white;
                }
                .receipt-header {
                    text-align: center;
                    border-bottom: 1px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .receipt-header h2 {
                    margin: 0;
                    font-size: 18px;
                }
                .receipt-header p {
                    margin: 3px 0;
                    font-size: 12px;
                }
                .receipt-details {
                    font-size: 12px;
                    margin-bottom: 10px;
                }
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                }
                table {
                    width: 100%;
                    font-size: 12px;
                    border-collapse: collapse;
                    margin: 10px 0;
                }
                th {
                    text-align: left;
                    border-bottom: 1px solid #000;
                    padding: 3px 0;
                    font-weight: bold;
                }
                td {
                    padding: 3px 0;
                }
                .total-section {
                    border-top: 1px dashed #000;
                    border-bottom: 1px dashed #000;
                    padding: 10px 0;
                    margin: 10px 0;
                    font-size: 12px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                }
                .total-amount {
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    font-size: 14px;
                }
                .footer {
                    text-align: center;
                    font-size: 11px;
                    margin-top: 20px;
                    border-top: 1px dashed #000;
                    padding-top: 10px;
                }
                @media print {
                    body { margin: 0; padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h2>POS System</h2>
                <p>Sales Receipt</p>
                <p>${formattedDate}</p>
            </div>
            
            <div class="receipt-details">
                <div class="detail-row">
                    <span>Sale ID:</span>
                    <span>${formattedSaleId}</span>
                </div>
                <div class="detail-row">
                    <span>Customer:</span>
                    <span>${sale.customerName || 'Walk-in'}</span>
                </div>
                <div class="detail-row">
                    <span>Payment:</span>
                    <span>${formatPaymentMethod(sale.paymentMethod || 'Cash')}</span>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
            
            <div class="total-section">
                ${sale.discount ? `<div class="total-row"><span>Discount:</span><span>-${formatCurrencyKSh(sale.discount || 0)}</span></div>` : ''}
                ${sale.tax ? `<div class="total-row"><span>Tax:</span><span>${formatCurrencyKSh(sale.tax || 0)}</span></div>` : ''}
                <div class="total-amount">
                    <span>TOTAL:</span>
                    <span>${formatCurrencyKSh(sale.total || 0)}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>Thank you for your purchase!</p>
                <p>Please visit us again</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ===========================
// Format Helper Functions
// ===========================
function formatPaymentMethod(method) {
    const methods = {
        'cash': '💵 Cash',
        'card': '💳 Card',
        'check': '📋 Check',
        'crypto': '₿ Crypto',
        'mobilemoney': '📱 Mobile Money'
    };
    return methods[method.toLowerCase()] || method;
}

function formatStatus(status) {
    const statuses = {
        'completed': 'Completed',
        'pending': 'Pending',
        'cancelled': 'Cancelled',
        'returned': 'Returned'
    };
    return statuses[status.toLowerCase()] || status;
}

// ===========================
// Currency Formatting
// ===========================
function formatCurrencyKSh(amount) {
    const formatted = new Intl.NumberFormat('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
    return `KSh ${formatted}`;
}

// ===========================
// Sale ID Formatting
// ===========================
function formatSaleId(saleId) {
    if (!saleId) return 'N/A';
    
    // If it's already formatted, return as is
    if (saleId.toString().startsWith('SALE-')) {
        return saleId;
    }
    
    // Try to extract number from the ID
    const numMatch = saleId.toString().match(/\d+/);
    if (numMatch) {
        const num = parseInt(numMatch[0]);
        return `SALE-${num.toString().padStart(3, '0')}`;
    }
    
    // If it's a Firebase push ID, use a hash-based approach
    // Take last 6 characters and convert to a number
    const hashCode = saleId.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
    }, 0);
    
    return `SALE-${(hashCode % 10000).toString().padStart(3, '0')}`;
}

// ===========================
// Export Functions (to be called from sales-export.js)
// ===========================
function getSalesDataForExport() {
    return filteredSales.map(sale => ({
        'Sale ID': formatSaleId(sale.id),
        'Customer': sale.customerName || 'Walk-in',
        'Date': new Date(sale.createdAt || sale.date).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        'Items': (sale.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
        'Amount': formatCurrencyKSh(sale.total || 0),
        'Payment Method': formatPaymentMethod(sale.paymentMethod || 'Cash'),
        'Status': formatStatus(sale.status || 'Completed')
    }));
}
