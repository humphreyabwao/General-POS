// ===========================
// B2B / Wholesale Sales Module
// ===========================

let b2bOrders = [];
let filteredB2BOrders = [];
let b2bListener = null;

// Filter state
const B2BFilterState = {
    searchTerm: '',
    status: '',
    dateRange: 'all'
};

// Debounce utility function
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

// ===========================
// Initialize B2B Module
// ===========================
function initializeB2BModule() {
    console.log('✅ Initializing B2B Sales Module');
    
    // Set up real-time listener
    setupB2BRealtimeListener();
    
    // Initialize UI
    initializeB2BSearch();
    initializeB2BFilters();
    initializeB2BButtons();
    
    // Listen to state events
    StateEvents.on('b2bOrders:updated', () => {
        console.log('📦 B2B orders updated, refreshing view');
        applyB2BFiltersAndDisplay();
    });
}

// ===========================
// Setup Real-time Listener
// ===========================
function setupB2BRealtimeListener() {
    try {
        const db = firebase.database();
        
        // Remove old listener if exists
        if (b2bListener) {
            db.ref('b2bOrders').off('value', b2bListener);
        }
        
        // Set up new listener
        b2bListener = db.ref('b2bOrders').on('value', (snapshot) => {
            const data = snapshot.val();
            
            if (data) {
                b2bOrders = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
            } else {
                b2bOrders = [];
            }
            
            console.log(`📦 Loaded ${b2bOrders.length} B2B orders`);
            
            // Update stats and display
            applyB2BFiltersAndDisplay();
            updateB2BStats();
            
        }, (error) => {
            console.error('❌ Error listening to B2B orders:', error);
            showToast('Error loading B2B orders', 'error', 3000);
        });
        
    } catch (error) {
        console.error('❌ Error setting up B2B listener:', error);
    }
}

// ===========================
// Initialize Search
// ===========================
function initializeB2BSearch() {
    const searchInput = document.getElementById('b2bSearchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            B2BFilterState.searchTerm = e.target.value.trim().toLowerCase();
            applyB2BFiltersAndDisplay();
        }, 300));
    }
}

// ===========================
// Initialize Filters
// ===========================
function initializeB2BFilters() {
    // Status filter
    const statusFilter = document.getElementById('b2bStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            B2BFilterState.status = e.target.value;
            applyB2BFiltersAndDisplay();
        });
    }
    
    // Date filter
    const dateFilter = document.getElementById('b2bDateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            B2BFilterState.dateRange = e.target.value;
            applyB2BFiltersAndDisplay();
        });
    }
}

// ===========================
// Initialize Buttons
// ===========================
function initializeB2BButtons() {
    // Retail Sale button - Navigate to POS
    const retailBtn = document.getElementById('retailSaleBtn');
    if (retailBtn) {
        retailBtn.addEventListener('click', () => {
            const posLink = document.querySelector('[data-page="pos-new-sale"]');
            if (posLink) {
                posLink.click();
                showToast('Opening POS...', 'info', 1500);
            }
        });
    }
    
    // New B2B Sale button
    const newB2BBtn = document.getElementById('newB2BSaleBtn');
    if (newB2BBtn) {
        newB2BBtn.addEventListener('click', () => {
            const b2bLink = document.querySelector('[data-page="b2b-new-sale"]');
            if (b2bLink) {
                b2bLink.click();
                showToast('Creating new wholesale order...', 'info', 1500);
            }
        });
    }
    
    // Add Product button - Navigate to B2B New Sale
    const addProductBtn = document.getElementById('addB2BProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            const b2bLink = document.querySelector('[data-page="b2b-new-sale"]');
            if (b2bLink) {
                b2bLink.click();
                showToast('Opening wholesale order form...', 'info', 1500);
            }
        });
    }
}

// ===========================
// Apply Filters and Display
// ===========================
function applyB2BFiltersAndDisplay() {
    console.log('🔍 Applying B2B filters');
    
    let filtered = [...b2bOrders];
    
    // Apply date filter
    const dateRange = getB2BDateRange(B2BFilterState.dateRange);
    if (dateRange) {
        filtered = filtered.filter(order => {
            const orderDate = new Date(order.createdAt || order.date);
            return orderDate >= dateRange.start && orderDate <= dateRange.end;
        });
    }
    
    // Apply status filter
    if (B2BFilterState.status) {
        filtered = filtered.filter(order => 
            order.status === B2BFilterState.status
        );
    }
    
    // Apply search filter
    if (B2BFilterState.searchTerm) {
        const search = B2BFilterState.searchTerm;
        filtered = filtered.filter(order => {
            return (
                (order.id && order.id.toLowerCase().includes(search)) ||
                (order.customerName && order.customerName.toLowerCase().includes(search)) ||
                (order.customerCompany && order.customerCompany.toLowerCase().includes(search)) ||
                (order.items && order.items.some(item => 
                    item.name && item.name.toLowerCase().includes(search)
                ))
            );
        });
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => {
        return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
    });
    
    filteredB2BOrders = filtered;
    console.log(`✅ Filtered B2B results: ${filtered.length} orders`);
    
    displayB2BOrdersTable();
}

// ===========================
// Get Date Range
// ===========================
function getB2BDateRange(rangeType) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(today);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    
    switch (rangeType) {
        case 'all':
            return null;
            
        case 'today':
            return { start, end };
            
        case 'thisWeek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return { start: weekStart, end: end };
            
        case 'thisMonth':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);
            return { start: monthStart, end: monthEnd };
            
        default:
            return null;
    }
}

// ===========================
// Display B2B Orders Table
// ===========================
function displayB2BOrdersTable() {
    const tbody = document.getElementById('b2bOrdersTableBody');
    
    if (!tbody) {
        console.error('❌ B2B orders table body not found');
        return;
    }
    
    if (filteredB2BOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="opacity: 0.5; margin-bottom: 12px;">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <p>No wholesale orders found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const rows = filteredB2BOrders.map(order => {
        const orderDate = new Date(order.createdAt || order.date);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        const totalQty = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        const productCount = (order.items || []).length;
        
        return `
            <tr>
                <td><strong>${formatB2BOrderId(order.id)}</strong></td>
                <td>
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                        <strong>${order.customerName || 'N/A'}</strong>
                        ${order.customerCompany ? ` - <small style="color: var(--text-secondary);">${order.customerCompany}</small>` : ''}
                    </div>
                </td>
                <td>${productCount} product${productCount !== 1 ? 's' : ''}</td>
                <td>${totalQty} units</td>
                <td><strong>${formatCurrencyKSh(order.total || 0)}</strong></td>
                <td>
                    <span class="status-badge status-${(order.status || 'pending').toLowerCase()}">
                        ${order.status || 'Pending'}
                    </span>
                </td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-view" onclick="viewB2BOrder('${order.id}')" title="View Details">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${order.status !== 'completed' ? `
                            <button class="action-btn btn-complete" onclick="completeB2BOrder('${order.id}')" title="Mark as Completed">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </button>
                        ` : ''}
                        <button class="action-btn btn-print" onclick="printB2BInvoice('${order.id}')" title="Print Invoice">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteB2BOrder('${order.id}')" title="Delete Order">
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
    
    tbody.innerHTML = rows;
}

// ===========================
// Update B2B Stats
// ===========================
function updateB2BStats() {
    const totalSales = b2bOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const uniqueCustomers = new Set(b2bOrders.map(o => o.customerId || o.customerName)).size;
    const totalOrders = b2bOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // Update DOM
    const totalSalesEl = document.getElementById('b2bTotalSales');
    const activeCustomersEl = document.getElementById('b2bActiveCustomers');
    const totalOrdersEl = document.getElementById('b2bTotalOrders');
    const avgOrderValueEl = document.getElementById('b2bAvgOrderValue');
    
    if (totalSalesEl) totalSalesEl.textContent = formatCurrencyKSh(totalSales);
    if (activeCustomersEl) activeCustomersEl.textContent = uniqueCustomers;
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (avgOrderValueEl) avgOrderValueEl.textContent = formatCurrencyKSh(avgOrderValue);
}

// ===========================
// Format B2B Order ID
// ===========================
function formatB2BOrderId(id) {
    if (!id) return 'N/A';
    
    // Extract numeric part if it exists
    const numMatch = id.match(/\d+/);
    if (numMatch) {
        const num = parseInt(numMatch[0]);
        return `B2B-${String(num).padStart(3, '0')}`;
    }
    
    return `B2B-${id.slice(0, 8)}`;
}

// ===========================
// View B2B Order Details
// ===========================
function viewB2BOrder(orderId) {
    const order = b2bOrders.find(o => o.id === orderId);
    
    if (!order) {
        showToast('Order not found', 'error', 2000);
        return;
    }
    
    const modal = document.getElementById('b2bOrderModal');
    if (!modal) {
        console.error('❌ B2B order modal not found');
        return;
    }
    
    const orderDate = new Date(order.createdAt || order.date);
    const formattedDate = orderDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const itemsHTML = (order.items || []).map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrencyKSh(item.price || 0)}</td>
            <td>${formatCurrencyKSh((item.quantity * item.price) || 0)}</td>
        </tr>
    `).join('');
    
    const modalContent = `
        <div class="modal-content-wrapper">
            <div class="modal-header">
                <h2>Order Details</h2>
                <button class="close-modal" type="button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="order-detail-grid">
                    <div class="detail-item">
                        <label>Order ID</label>
                        <p><strong>${formatB2BOrderId(order.id)}</strong></p>
                    </div>
                    <div class="detail-item">
                        <label>Date</label>
                        <p>${formattedDate}</p>
                    </div>
                    <div class="detail-item">
                        <label>Customer</label>
                        <p>${order.customerName || 'N/A'}</p>
                    </div>
                    <div class="detail-item">
                        <label>Company</label>
                        <p>${order.customerCompany || 'N/A'}</p>
                    </div>
                    <div class="detail-item">
                        <label>Phone</label>
                        <p>${order.customerPhone || 'N/A'}</p>
                    </div>
                    <div class="detail-item">
                        <label>Status</label>
                        <p><span class="status-badge status-${(order.status || 'pending').toLowerCase()}">${order.status || 'Pending'}</span></p>
                    </div>
                </div>
                
                <div class="order-items-section">
                    <h3>Order Items</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHTML}
                        </tbody>
                    </table>
                </div>
                
                <div class="order-summary">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <strong>${formatCurrencyKSh((order.subtotal || order.total))}</strong>
                    </div>
                    ${order.discount ? `
                        <div class="summary-row">
                            <span>Discount:</span>
                            <strong>-${formatCurrencyKSh(order.discount)}</strong>
                        </div>
                    ` : ''}
                    ${order.tax ? `
                        <div class="summary-row">
                            <span>Tax:</span>
                            <strong>${formatCurrencyKSh(order.tax)}</strong>
                        </div>
                    ` : ''}
                    <div class="summary-row total">
                        <span>Total:</span>
                        <strong>${formatCurrencyKSh(order.total || 0)}</strong>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary close-modal">Close</button>
                <button class="btn btn-primary" onclick="printB2BInvoice('${order.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print Invoice
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = modalContent;
    
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
    
    setupB2BModalListeners(modal);
}

// ===========================
// Setup Modal Listeners
// ===========================
function setupB2BModalListeners(modal) {
    // Close buttons
    modal.querySelectorAll('.close-modal').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => closeB2BModal(modal));
    });
    
    // Backdrop click
    const backdropHandler = (e) => {
        if (e.target === modal) {
            closeB2BModal(modal);
        }
    };
    modal.removeEventListener('click', backdropHandler);
    modal.addEventListener('click', backdropHandler);
    
    // ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeB2BModal(modal);
        }
    };
    document.removeEventListener('keydown', escHandler);
    document.addEventListener('keydown', escHandler);
    
    modal._escHandler = escHandler;
}

// ===========================
// Close Modal
// ===========================
function closeB2BModal(modal) {
    modal.classList.remove('show');
    
    if (modal._escHandler) {
        document.removeEventListener('keydown', modal._escHandler);
        modal._escHandler = null;
    }
    
    setTimeout(() => {
        if (!modal.classList.contains('show')) {
            modal.innerHTML = '';
        }
    }, 300);
}

// ===========================
// Complete B2B Order
// ===========================
function completeB2BOrder(orderId) {
    if (!confirm('Mark this order as completed?')) {
        return;
    }
    
    const db = firebase.database();
    db.ref(`b2bOrders/${orderId}`).update({
        status: 'completed',
        completedAt: new Date().toISOString()
    })
    .then(() => {
        showToast('Order marked as completed', 'success', 2000);
    })
    .catch(error => {
        console.error('❌ Error completing order:', error);
        showToast('Error completing order', 'error', 2000);
    });
}

// ===========================
// Delete B2B Order
// ===========================
function deleteB2BOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        return;
    }
    
    const db = firebase.database();
    db.ref(`b2bOrders/${orderId}`).remove()
        .then(() => {
            showToast('Order deleted successfully', 'success', 2000);
        })
        .catch(error => {
            console.error('❌ Error deleting order:', error);
            showToast('Error deleting order', 'error', 2000);
        });
}

// ===========================
// Print B2B Invoice
// ===========================
function printB2BInvoice(orderId) {
    const order = b2bOrders.find(o => o.id === orderId);
    
    if (!order) {
        showToast('Order not found', 'error', 2000);
        return;
    }
    
    const orderDate = new Date(order.createdAt || order.date);
    const formattedDate = orderDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
    
    const itemsHTML = (order.items || []).map(item => `
        <tr>
            <td>${item.name}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${formatCurrencyKSh(item.price || 0)}</td>
            <td style="text-align: right;">${formatCurrencyKSh((item.quantity * item.price) || 0)}</td>
        </tr>
    `).join('');
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${formatB2BOrderId(order.id)}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .invoice-details { margin-bottom: 30px; }
                .invoice-details table { width: 100%; }
                .invoice-details td { padding: 5px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; }
                .items-table th { background-color: #f5f5f5; text-align: left; }
                .total-section { text-align: right; }
                .total-section table { margin-left: auto; width: 300px; }
                .total-section td { padding: 8px; }
                .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>WHOLESALE INVOICE</h1>
                <p><strong>Invoice #:</strong> ${formatB2BOrderId(order.id)}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
            </div>
            
            <div class="invoice-details">
                <table>
                    <tr>
                        <td><strong>Customer:</strong> ${order.customerName || 'N/A'}</td>
                        <td><strong>Company:</strong> ${order.customerCompany || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</td>
                        <td><strong>Status:</strong> ${order.status || 'Pending'}</td>
                    </tr>
                </table>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th style="text-align: center;">Quantity</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
            
            <div class="total-section">
                <table>
                    <tr>
                        <td>Subtotal:</td>
                        <td style="text-align: right;">${formatCurrencyKSh(order.subtotal || order.total)}</td>
                    </tr>
                    ${order.discount ? `
                        <tr>
                            <td>Discount:</td>
                            <td style="text-align: right;">-${formatCurrencyKSh(order.discount)}</td>
                        </tr>
                    ` : ''}
                    ${order.tax ? `
                        <tr>
                            <td>Tax:</td>
                            <td style="text-align: right;">${formatCurrencyKSh(order.tax)}</td>
                        </tr>
                    ` : ''}
                    <tr class="total-row">
                        <td>TOTAL:</td>
                        <td style="text-align: right;">${formatCurrencyKSh(order.total || 0)}</td>
                    </tr>
                </table>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    }
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ===========================
// B2B Order Form Functionality
// ===========================

let b2bCart = [];
let b2bProducts = [];
let searchTimeout = null;

// Initialize B2B Order Form
function initializeB2BOrderForm() {
    console.log('✅ Initializing B2B Order Form');
    
    // Load products from inventory
    loadB2BProducts();
    
    // Initialize search
    initializeB2BProductSearch();
    
    // Initialize manual entry
    initializeB2BManualEntry();
    
    // Initialize calculations
    initializeB2BCalculations();
    
    // Initialize submit button
    initializeB2BSubmit();
    
    // Initialize save draft
    initializeB2BSaveDraft();
}

// Load products from inventory
function loadB2BProducts() {
    const db = firebase.database();
    db.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            b2bProducts = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            console.log(`📦 Loaded ${b2bProducts.length} products for B2B`);
        }
    });
}

// Initialize Product Search
function initializeB2BProductSearch() {
    const searchInput = document.getElementById('b2bProductSearch');
    const searchResults = document.getElementById('b2bSearchResults');
    
    if (!searchInput || !searchResults) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }
        
        searchTimeout = setTimeout(() => {
            const results = b2bProducts.filter(product => 
                product.name?.toLowerCase().includes(query) ||
                product.sku?.toLowerCase().includes(query) ||
                product.barcode?.toLowerCase().includes(query) ||
                product.category?.toLowerCase().includes(query)
            );
            
            displayB2BSearchResults(results);
        }, 300);
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

// Display Search Results
function displayB2BSearchResults(results) {
    const searchResults = document.getElementById('b2bSearchResults');
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary);">No products found</div>';
        searchResults.classList.add('active');
        return;
    }
    
    const html = results.map(product => {
        const stock = product.quantity || 0;
        const stockClass = stock === 0 ? 'out-of-stock' : stock < (product.reorderLevel || 10) ? 'low-stock' : '';
        const stockText = stock === 0 ? 'Out of Stock' : `${stock} in stock`;
        
        return `
            <div class="search-result-item" onclick="addB2BProductToCart('${product.id}')">
                <div class="search-result-info">
                    <h4>${product.name}</h4>
                    <p>${product.sku ? `SKU: ${product.sku}` : ''} ${product.category ? `• ${product.category}` : ''}</p>
                    <p class="search-result-stock ${stockClass}">${stockText}</p>
                </div>
                <div style="text-align: right;">
                    <div class="search-result-price">${formatCurrencyKSh(product.price || 0)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    searchResults.innerHTML = html;
    searchResults.classList.add('active');
}

// Add Product to Cart
function addB2BProductToCart(productId) {
    const product = b2bProducts.find(p => p.id === productId);
    
    if (!product) {
        showToast('Product not found', 'error', 2000);
        return;
    }
    
    // Check if product already in cart
    const existingItem = b2bCart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        b2bCart.push({
            id: product.id,
            name: product.name,
            sku: product.sku || '',
            price: product.price || 0,
            quantity: 1,
            description: product.description || ''
        });
    }
    
    // Clear search
    document.getElementById('b2bProductSearch').value = '';
    document.getElementById('b2bSearchResults').classList.remove('active');
    
    // Update display
    updateB2BCart();
    showToast('Product added to cart', 'success', 1500);
}

// Initialize Manual Entry
function initializeB2BManualEntry() {
    const manualBtn = document.getElementById('b2bManualAddBtn');
    const modal = document.getElementById('b2bManualProductModal');
    const addBtn = document.getElementById('addManualB2BProductBtn');
    
    if (manualBtn) {
        manualBtn.addEventListener('click', () => {
            modal.classList.add('show');
        });
    }
    
    if (addBtn) {
        addBtn.addEventListener('click', addManualB2BProduct);
    }
}

// Add Manual Product
function addManualB2BProduct() {
    const name = document.getElementById('manualB2BProductName').value.trim();
    const price = parseFloat(document.getElementById('manualB2BProductPrice').value) || 0;
    const qty = parseInt(document.getElementById('manualB2BProductQty').value) || 1;
    const desc = document.getElementById('manualB2BProductDesc').value.trim();
    
    if (!name) {
        showToast('Please enter product name', 'error', 2000);
        return;
    }
    
    if (price <= 0) {
        showToast('Please enter valid price', 'error', 2000);
        return;
    }
    
    b2bCart.push({
        id: 'manual_' + Date.now(),
        name: name,
        sku: 'MANUAL',
        price: price,
        quantity: qty,
        description: desc,
        isManual: true
    });
    
    updateB2BCart();
    closeB2BManualModal();
    showToast('Manual product added to cart', 'success', 1500);
}

// Close Manual Modal
function closeB2BManualModal() {
    const modal = document.getElementById('b2bManualProductModal');
    modal.classList.remove('show');
    
    // Reset form
    document.getElementById('manualB2BProductName').value = '';
    document.getElementById('manualB2BProductPrice').value = '';
    document.getElementById('manualB2BProductQty').value = '1';
    document.getElementById('manualB2BProductDesc').value = '';
}

// Update Cart Display
function updateB2BCart() {
    const cartBody = document.getElementById('b2bCartItems');
    const cartCount = document.getElementById('b2bCartCount');
    
    if (b2bCart.length === 0) {
        cartBody.innerHTML = `
            <tr class="empty-cart-row">
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="opacity: 0.5; margin-bottom: 12px;">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <p>No items in cart</p>
                    <span style="font-size: 12px;">Search and add products to create an order</span>
                </td>
            </tr>
        `;
        cartCount.textContent = '0 items';
    } else {
        const html = b2bCart.map((item, index) => `
            <tr>
                <td>
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-sku">${item.sku}</div>
                </td>
                <td>${formatCurrencyKSh(item.price)}</td>
                <td>
                    <div class="quantity-controls">
                        <button class="qty-btn" onclick="updateB2BQuantity(${index}, -1)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <input type="number" class="qty-input" value="${item.quantity}" min="1" 
                            onchange="setB2BQuantity(${index}, this.value)">
                        <button class="qty-btn" onclick="updateB2BQuantity(${index}, 1)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </td>
                <td><strong>${formatCurrencyKSh(item.price * item.quantity)}</strong></td>
                <td>
                    <button class="remove-item-btn" onclick="removeB2BItem(${index})" title="Remove">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m3 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6h14z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
        
        cartBody.innerHTML = html;
        
        const totalItems = b2bCart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    }
    
    updateB2BCalculations();
}

// Update Quantity
function updateB2BQuantity(index, change) {
    if (b2bCart[index]) {
        b2bCart[index].quantity = Math.max(1, b2bCart[index].quantity + change);
        updateB2BCart();
    }
}

// Set Quantity
function setB2BQuantity(index, value) {
    const qty = parseInt(value) || 1;
    if (b2bCart[index]) {
        b2bCart[index].quantity = Math.max(1, qty);
        updateB2BCart();
    }
}

// Remove Item
function removeB2BItem(index) {
    if (confirm('Remove this item from cart?')) {
        b2bCart.splice(index, 1);
        updateB2BCart();
        showToast('Item removed from cart', 'info', 1500);
    }
}

// Initialize Calculations
function initializeB2BCalculations() {
    const discountInput = document.getElementById('b2bDiscountPercent');
    const taxInput = document.getElementById('b2bTaxPercent');
    
    if (discountInput) {
        discountInput.addEventListener('input', debounce(() => {
            updateB2BCalculations();
        }, 300));
    }
    
    if (taxInput) {
        taxInput.addEventListener('input', debounce(() => {
            updateB2BCalculations();
        }, 300));
    }
}

// Update Calculations
function updateB2BCalculations() {
    const subtotal = b2bCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('b2bDiscountPercent')?.value || 0);
    const taxPercent = parseFloat(document.getElementById('b2bTaxPercent')?.value || 0);
    
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    const grandTotal = afterDiscount + taxAmount;
    
    // Update display
    document.getElementById('b2bSubtotal').textContent = formatCurrencyKSh(subtotal);
    document.getElementById('b2bDiscountAmount').textContent = '- ' + formatCurrencyKSh(discountAmount);
    document.getElementById('b2bTaxAmount').textContent = '+ ' + formatCurrencyKSh(taxAmount);
    document.getElementById('b2bGrandTotal').textContent = formatCurrencyKSh(grandTotal);
    
    // Enable/disable submit button
    const submitBtn = document.getElementById('b2bSubmitOrderBtn');
    const customerName = document.getElementById('b2bCustomerName')?.value.trim();
    const customerPhone = document.getElementById('b2bCustomerPhone')?.value.trim();
    
    if (submitBtn) {
        submitBtn.disabled = b2bCart.length === 0 || !customerName || !customerPhone;
    }
}

// Initialize Submit
function initializeB2BSubmit() {
    const submitBtn = document.getElementById('b2bSubmitOrderBtn');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', submitB2BOrder);
    }
    
    // Monitor customer fields
    const customerName = document.getElementById('b2bCustomerName');
    const customerPhone = document.getElementById('b2bCustomerPhone');
    
    if (customerName) {
        customerName.addEventListener('input', updateB2BCalculations);
    }
    
    if (customerPhone) {
        customerPhone.addEventListener('input', updateB2BCalculations);
    }
}

// Submit Order
async function submitB2BOrder() {
    // Validate
    const customerName = document.getElementById('b2bCustomerName').value.trim();
    const customerCompany = document.getElementById('b2bCustomerCompany').value.trim();
    const customerPhone = document.getElementById('b2bCustomerPhone').value.trim();
    const customerEmail = document.getElementById('b2bCustomerEmail').value.trim();
    const customerAddress = document.getElementById('b2bCustomerAddress').value.trim();
    const promoMessage = document.getElementById('b2bPromoMessage').value.trim();
    
    if (!customerName) {
        showToast('Please enter customer name', 'error', 2000);
        return;
    }
    
    if (!customerPhone) {
        showToast('Please enter customer phone', 'error', 2000);
        return;
    }
    
    if (b2bCart.length === 0) {
        showToast('Please add items to cart', 'error', 2000);
        return;
    }
    
    // Calculate totals
    const subtotal = b2bCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('b2bDiscountPercent').value || 0);
    const taxPercent = parseFloat(document.getElementById('b2bTaxPercent').value || 0);
    
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    const grandTotal = afterDiscount + taxAmount;
    
    // Create order object
    const order = {
        customerName,
        customerCompany,
        customerPhone,
        customerEmail,
        customerAddress,
        items: b2bCart,
        subtotal,
        discount: discountAmount,
        discountPercent,
        tax: taxAmount,
        taxPercent,
        total: grandTotal,
        promoMessage,
        status: 'pending',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toISOString()
    };
    
    // Save to Firebase
    try {
        const db = firebase.database();
        await db.ref('b2bOrders').push(order);
        
        showToast('Order created successfully!', 'success', 2000);
        
        // Reset form
        resetB2BForm();
        
        // Navigate back to B2B orders
        setTimeout(() => {
            navigateToPage('b2b-sales');
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error creating order:', error);
        showToast('Error creating order', 'error', 2000);
    }
}

// Initialize Save Draft
function initializeB2BSaveDraft() {
    const saveDraftBtn = document.getElementById('b2bSaveDraftBtn');
    
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveB2BDraft);
    }
}

// Save Draft
function saveB2BDraft() {
    const draft = {
        customerName: document.getElementById('b2bCustomerName').value.trim(),
        customerCompany: document.getElementById('b2bCustomerCompany').value.trim(),
        customerPhone: document.getElementById('b2bCustomerPhone').value.trim(),
        customerEmail: document.getElementById('b2bCustomerEmail').value.trim(),
        customerAddress: document.getElementById('b2bCustomerAddress').value.trim(),
        cart: b2bCart,
        discountPercent: document.getElementById('b2bDiscountPercent').value,
        taxPercent: document.getElementById('b2bTaxPercent').value,
        promoMessage: document.getElementById('b2bPromoMessage').value,
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('b2bOrderDraft', JSON.stringify(draft));
    showToast('Draft saved successfully', 'success', 2000);
}

// Load Draft (call this when form initializes)
function loadB2BDraft() {
    const draftJson = localStorage.getItem('b2bOrderDraft');
    
    if (!draftJson) return;
    
    try {
        const draft = JSON.parse(draftJson);
        
        // Restore form fields
        document.getElementById('b2bCustomerName').value = draft.customerName || '';
        document.getElementById('b2bCustomerCompany').value = draft.customerCompany || '';
        document.getElementById('b2bCustomerPhone').value = draft.customerPhone || '';
        document.getElementById('b2bCustomerEmail').value = draft.customerEmail || '';
        document.getElementById('b2bCustomerAddress').value = draft.customerAddress || '';
        document.getElementById('b2bDiscountPercent').value = draft.discountPercent || 0;
        document.getElementById('b2bTaxPercent').value = draft.taxPercent || 0;
        document.getElementById('b2bPromoMessage').value = draft.promoMessage || 'Thank you for your business!';
        
        // Restore cart
        b2bCart = draft.cart || [];
        updateB2BCart();
        
        showToast('Draft loaded', 'info', 2000);
        
    } catch (error) {
        console.error('Error loading draft:', error);
    }
}

// Reset Form
function resetB2BForm() {
    b2bCart = [];
    document.getElementById('b2bCustomerName').value = '';
    document.getElementById('b2bCustomerCompany').value = '';
    document.getElementById('b2bCustomerPhone').value = '';
    document.getElementById('b2bCustomerEmail').value = '';
    document.getElementById('b2bCustomerAddress').value = '';
    document.getElementById('b2bDiscountPercent').value = '0';
    document.getElementById('b2bTaxPercent').value = '0';
    document.getElementById('b2bPromoMessage').value = 'Thank you for your business!';
    
    updateB2BCart();
    
    // Clear draft
    localStorage.removeItem('b2bOrderDraft');
}

// Make functions globally accessible
window.closeB2BManualModal = closeB2BManualModal;
window.addB2BProductToCart = addB2BProductToCart;
window.updateB2BQuantity = updateB2BQuantity;
window.setB2BQuantity = setB2BQuantity;
window.removeB2BItem = removeB2BItem;
