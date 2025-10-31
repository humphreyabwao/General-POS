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
    
    // Add Product button
    const addProductBtn = document.getElementById('addB2BProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            // TODO: Implement add product modal
            showToast('Add product feature coming soon', 'info', 2000);
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
                    <div style="line-height: 1.4;">
                        <strong>${order.customerName || 'N/A'}</strong>
                        ${order.customerCompany ? `<br><small style="color: var(--text-secondary);">${order.customerCompany}</small>` : ''}
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
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            View
                        </button>
                        ${order.status !== 'completed' ? `
                            <button class="action-btn btn-complete" onclick="completeB2BOrder('${order.id}')" title="Mark as Completed">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Complete
                            </button>
                        ` : ''}
                        <button class="action-btn btn-print" onclick="printB2BInvoice('${order.id}')" title="Print Invoice">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                            Print
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteB2BOrder('${order.id}')" title="Delete Order">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
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
