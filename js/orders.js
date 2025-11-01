// ===========================
// Orders Management Module
// ===========================

let orders = [];
let suppliers = [];
let filteredOrders = [];
let orderItems = [];

// Filter state
const OrderFilterState = {
    searchTerm: '',
    status: '',
    dateRange: 'all'
};

// ===========================
// Utility Functions
// ===========================
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// ===========================
// Initialize Orders Module
// ===========================
function initializeOrdersModule() {
    console.log('✅ Initializing Orders Module');
    
    setupOrdersRealtimeListener();
    setupSuppliersRealtimeListener();
    initializeOrdersSearch();
    initializeOrdersFilters();
    initializeOrdersButtons();
    
    StateEvents.on('orders:updated', () => {
        console.log('📦 Orders updated, refreshing view');
        applyOrdersFiltersAndDisplay();
    });
}

// ===========================
// Setup Real-time Listeners
// ===========================
function setupOrdersRealtimeListener() {
    const db = firebase.database();
    db.ref('orders').on('value', (snapshot) => {
        orders = [];
        snapshot.forEach((childSnapshot) => {
            const order = {
                id: childSnapshot.key,
                ...childSnapshot.val()
            };
            orders.push(order);
        });
        
        console.log(`✅ Loaded ${orders.length} orders`);
        updateOrderStats();
        applyOrdersFiltersAndDisplay();
    });
}

function setupSuppliersRealtimeListener() {
    const db = firebase.database();
    db.ref('suppliers').on('value', (snapshot) => {
        suppliers = [];
        snapshot.forEach((childSnapshot) => {
            const supplier = {
                id: childSnapshot.key,
                ...childSnapshot.val()
            };
            suppliers.push(supplier);
        });
        
        console.log(`✅ Loaded ${suppliers.length} suppliers`);
        updateOrderStats();
        populateSupplierDropdown();
    });
}

// ===========================
// Initialize Search
// ===========================
function initializeOrdersSearch() {
    const searchInput = document.getElementById('ordersSearchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            OrderFilterState.searchTerm = e.target.value.toLowerCase().trim();
            applyOrdersFiltersAndDisplay();
        }, 300);
    });
}

// ===========================
// Initialize Filters
// ===========================
function initializeOrdersFilters() {
    const statusFilter = document.getElementById('orderStatusFilter');
    const dateFilter = document.getElementById('orderDateFilter');
    const clearBtn = document.getElementById('clearOrderFiltersBtn');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            OrderFilterState.status = e.target.value;
            applyOrdersFiltersAndDisplay();
        });
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            OrderFilterState.dateRange = e.target.value;
            applyOrdersFiltersAndDisplay();
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearOrderFilters);
    }
}

// ===========================
// Initialize Buttons
// ===========================
function initializeOrdersButtons() {
    const createOrderBtn = document.getElementById('createOrderBtn');
    const addSupplierBtn = document.getElementById('addSupplierBtn');
    const exportBtn = document.getElementById('exportOrdersBtn');
    
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', () => {
            navigateToPage('orders-new');
        });
    }
    
    if (addSupplierBtn) {
        addSupplierBtn.addEventListener('click', () => {
            navigateToPage('orders-add-supplier');
        });
    }
    
    // Export dropdown functionality
    const exportDropdown = document.querySelector('#orders-module .export-dropdown-menu');
    
    if (exportBtn && exportDropdown) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.export-dropdown')) {
                exportDropdown.classList.remove('active');
            }
        });
        
        // Export options
        document.querySelectorAll('#orders-module .export-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                exportDropdown.classList.remove('active');
                exportOrders(format);
            });
        });
    }
}

// ===========================
// Update Stats
// ===========================
function updateOrderStats() {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    
    const totalValue = orders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    const pendingValue = orders.filter(o => o.status === 'pending' || o.status === 'confirmed')
        .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    const completedValue = orders.filter(o => o.status === 'completed' || o.status === 'delivered')
        .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    
    // Update filtered stats
    const displayOrders = filteredOrders.length > 0 ? filteredOrders : orders;
    const displayTotal = displayOrders.length;
    const displayValue = displayOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    
    safeUpdateElement('totalOrdersCount', displayTotal);
    safeUpdateElement('totalOrdersValue', formatCurrency(displayValue));
    safeUpdateElement('pendingOrdersCount', pendingOrders);
    safeUpdateElement('pendingOrdersValue', formatCurrency(pendingValue));
    safeUpdateElement('completedOrdersCount', completedOrders);
    safeUpdateElement('completedOrdersValue', formatCurrency(completedValue));
    safeUpdateElement('totalSuppliersCount', suppliers.length);
}

// ===========================
// Apply Filters and Display
// ===========================
function applyOrdersFiltersAndDisplay() {
    filteredOrders = orders.filter(order => {
        // Search filter
        if (OrderFilterState.searchTerm) {
            const searchLower = OrderFilterState.searchTerm;
            const matchesSearch = 
                (order.orderId && order.orderId.toLowerCase().includes(searchLower)) ||
                (order.supplier && order.supplier.toLowerCase().includes(searchLower)) ||
                (order.reference && order.reference.toLowerCase().includes(searchLower)) ||
                (order.items && order.items.some(item => item.name.toLowerCase().includes(searchLower)));
            
            if (!matchesSearch) return false;
        }
        
        // Status filter
        if (OrderFilterState.status && order.status !== OrderFilterState.status) {
            return false;
        }
        
        // Date filter
        if (OrderFilterState.dateRange !== 'all') {
            const orderDate = new Date(order.orderDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            switch (OrderFilterState.dateRange) {
                case 'today':
                    const todayEnd = new Date(today);
                    todayEnd.setHours(23, 59, 59, 999);
                    if (orderDate < today || orderDate > todayEnd) return false;
                    break;
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    if (orderDate < weekAgo) return false;
                    break;
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    if (orderDate < monthAgo) return false;
                    break;
            }
        }
        
        return true;
    });
    
    updateOrderStats();
    renderOrdersTable();
}

// ===========================
// Render Orders Table
// ===========================
function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    const displayOrders = filteredOrders.length > 0 ? filteredOrders : orders;
    
    if (displayOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin: 0 auto 16px; opacity: 0.3;">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                    </svg>
                    <p style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">No orders found</p>
                    <p style="font-size: 14px;">Try adjusting your filters or create a new order</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (newest first)
    displayOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    
    tbody.innerHTML = displayOrders.map(order => {
        const statusClass = getStatusClass(order.status);
        const statusText = getStatusText(order.status);
        const itemCount = order.items ? order.items.length : 0;
        const totalQty = order.items ? order.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0) : 0;
        
        return `
            <tr>
                <td><strong>${order.orderId || 'N/A'}</strong></td>
                <td>${formatDate(order.orderDate)}</td>
                <td>${order.supplier || 'Unknown'}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td>${totalQty}</td>
                <td><strong>${formatCurrency(order.totalAmount || 0)}</strong></td>
                <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="table-action-btn view" onclick="viewOrder('${order.id}')" title="View Details">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        ${order.status === 'pending' || order.status === 'confirmed' ? `
                        <button class="table-action-btn edit" onclick="updateOrderStatus('${order.id}', 'delivered')" title="Mark as Delivered">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </button>
                        ` : ''}
                        ${order.status !== 'completed' && order.status !== 'cancelled' ? `
                        <button class="table-action-btn delete" onclick="confirmCancelOrder('${order.id}')" title="Cancel Order">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ===========================
// Status Helpers
// ===========================
function getStatusClass(status) {
    const statusMap = {
        'pending': 'yellow',
        'confirmed': 'blue',
        'delivered': 'green',
        'completed': 'green',
        'cancelled': 'red'
    };
    return statusMap[status] || 'gray';
}

function getStatusText(status) {
    const textMap = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'delivered': 'Delivered',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    return textMap[status] || status;
}

// ===========================
// Clear Filters
// ===========================
function clearOrderFilters() {
    OrderFilterState.searchTerm = '';
    OrderFilterState.status = '';
    OrderFilterState.dateRange = 'all';
    
    const searchInput = document.getElementById('ordersSearchInput');
    const statusFilter = document.getElementById('orderStatusFilter');
    const dateFilter = document.getElementById('orderDateFilter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (dateFilter) dateFilter.value = 'all';
    
    applyOrdersFiltersAndDisplay();
    showToast('Filters cleared', 'info');
}

// ===========================
// View Order Details
// ===========================
function viewOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Order Details</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div style="display: grid; gap: 24px;">
                    <div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Order ID</p>
                        <p style="font-size: 16px; font-weight: 600;">${order.orderId}</p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                        <div>
                            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Supplier</p>
                            <p style="font-size: 14px; font-weight: 500;">${order.supplier}</p>
                        </div>
                        <div>
                            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Status</p>
                            <span class="badge badge-${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                        <div>
                            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Order Date</p>
                            <p style="font-size: 14px;">${formatDate(order.orderDate)}</p>
                        </div>
                        ${order.expectedDate ? `
                        <div>
                            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Expected Delivery</p>
                            <p style="font-size: 14px;">${formatDate(order.expectedDate)}</p>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${order.reference ? `
                    <div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Reference</p>
                        <p style="font-size: 14px;">${order.reference}</p>
                    </div>
                    ` : ''}
                    
                    <div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Order Items</p>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px; font-size: 12px; color: var(--text-secondary);">Product</th>
                                    <th style="text-align: center; padding: 8px; font-size: 12px; color: var(--text-secondary);">Qty</th>
                                    <th style="text-align: right; padding: 8px; font-size: 12px; color: var(--text-secondary);">Price</th>
                                    <th style="text-align: right; padding: 8px; font-size: 12px; color: var(--text-secondary);">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map(item => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 12px 8px; font-size: 14px;">${item.name}</td>
                                        <td style="padding: 12px 8px; text-align: center; font-size: 14px;">${item.quantity}</td>
                                        <td style="padding: 12px 8px; text-align: right; font-size: 14px;">${formatCurrency(item.price)}</td>
                                        <td style="padding: 12px 8px; text-align: right; font-size: 14px; font-weight: 600;">${formatCurrency(item.quantity * item.price)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: 600; font-size: 15px;">Total Amount:</td>
                                    <td style="padding: 12px 8px; text-align: right; font-weight: 700; font-size: 16px; color: var(--color-blue);">${formatCurrency(order.totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    ${order.notes ? `
                    <div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Notes</p>
                        <p style="font-size: 14px; background: var(--bg-tertiary); padding: 12px; border-radius: 6px;">${order.notes}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===========================
// Update Order Status
// ===========================
function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const db = firebase.database();
    db.ref(`orders/${orderId}`).update({
        status: newStatus,
        updatedAt: new Date().toISOString()
    }).then(() => {
        showToast(`Order marked as ${newStatus}`, 'success');
        logActivity('order', `Order ${order.orderId} status updated to ${newStatus}`);
    }).catch((error) => {
        console.error('Error updating order:', error);
        showToast('Failed to update order', 'error');
    });
}

// ===========================
// Cancel Order
// ===========================
function confirmCancelOrder(orderId) {
    if (confirm('Are you sure you want to cancel this order?')) {
        updateOrderStatus(orderId, 'cancelled');
    }
}

// ===========================
// Create Order Form
// ===========================
function initializeCreateOrderForm() {
    console.log('✅ Initializing Create Order Form');
    
    // Reset cart
    orderItems = [];
    
    // Set default date to today
    const orderDateInput = document.getElementById('orderDate');
    if (orderDateInput) {
        orderDateInput.valueAsDate = new Date();
    }
    
    // Populate supplier dropdown
    populateSupplierDropdown();
    
    // Initialize product search
    initializeProductSearch();
    
    // Initialize manual product entry
    const manualBtn = document.getElementById('addManualProductBtn');
    if (manualBtn) {
        manualBtn.addEventListener('click', showManualProductModal);
    }
    
    // Initialize submit button
    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleCreateOrder);
    }
    
    // Render empty cart
    renderOrderCart();
    updateOrderSummary();
}

function initializeProductSearch() {
    const searchInput = document.getElementById('orderProductSearch');
    const searchResults = document.getElementById('orderSearchResults');
    
    if (!searchInput || !searchResults) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim().toLowerCase();
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performProductSearch(query, searchResults);
        }, 300);
    });
    
    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

function performProductSearch(query, resultsContainer) {
    const products = window.AppState?.products || [];
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
    ).slice(0, 10);
    
    if (filteredProducts.length === 0) {
        resultsContainer.innerHTML = '<div class="search-no-results">No products found</div>';
        resultsContainer.classList.add('active');
        return;
    }
    
    resultsContainer.innerHTML = filteredProducts.map(product => `
        <div class="search-result-item" onclick="addProductToCart('${product.id}')">
            <div class="search-result-name">${product.name}</div>
            <div class="search-result-details">
                <span>SKU: ${product.sku || 'N/A'}</span>
                <span>Stock: ${product.currentStock || 0}</span>
                <span>${formatCurrency(product.buyPrice || 0)}</span>
            </div>
        </div>
    `).join('');
    
    resultsContainer.classList.add('active');
}

function addProductToCart(productId) {
    const products = window.AppState?.products || [];
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    // Check if product already in cart
    const existingItem = orderItems.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        orderItems.push({
            productId: product.id,
            name: product.name,
            quantity: 1,
            price: product.buyPrice || 0
        });
    }
    
    // Clear search
    const searchInput = document.getElementById('orderProductSearch');
    const searchResults = document.getElementById('orderSearchResults');
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.classList.remove('active');
    
    // Update UI
    renderOrderCart();
    updateOrderSummary();
    showToast(`${product.name} added to cart`, 'success');
}

function showManualProductModal() {
    const modalHtml = `
        <div class="modal active" id="manualProductModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Add Product Manually</h2>
                    <button class="modal-close" onclick="closeModal('manualProductModal')">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="manualProductForm">
                        <div class="form-group">
                            <label for="manualProductName">Product Name *</label>
                            <input type="text" id="manualProductName" class="form-control" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="manualProductQty">Quantity *</label>
                                <input type="number" id="manualProductQty" class="form-control" value="1" min="1" required>
                            </div>
                            <div class="form-group">
                                <label for="manualProductPrice">Unit Price *</label>
                                <input type="number" id="manualProductPrice" class="form-control" step="0.01" min="0" required>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('manualProductModal')">Cancel</button>
                            <button type="submit" class="btn btn-primary">Add to Cart</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Handle form submission
    const form = document.getElementById('manualProductForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('manualProductName').value.trim();
        const quantity = parseInt(document.getElementById('manualProductQty').value) || 1;
        const price = parseFloat(document.getElementById('manualProductPrice').value) || 0;
        
        if (!name) {
            showToast('Please enter product name', 'error');
            return;
        }
        
        orderItems.push({
            productId: `manual_${Date.now()}`,
            name,
            quantity,
            price,
            isManual: true
        });
        
        closeModal('manualProductModal');
        renderOrderCart();
        updateOrderSummary();
        showToast(`${name} added to cart`, 'success');
    });
}

function renderOrderCart() {
    const cartContainer = document.getElementById('orderCartItems');
    const cartCount = document.getElementById('cartItemCount');
    
    if (!cartContainer) return;
    
    // Update count
    if (cartCount) {
        cartCount.textContent = `${orderItems.length} ${orderItems.length === 1 ? 'item' : 'items'}`;
    }
    
    if (orderItems.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                </svg>
                <p>Your cart is empty</p>
                <span>Search and add products to your order</span>
            </div>
        `;
        return;
    }
    
    cartContainer.innerHTML = orderItems.map((item, index) => `
        <div class="cart-item-card" data-index="${index}">
            <div class="cart-item-header">
                <h4 class="cart-item-name">${item.name}</h4>
                <button class="cart-item-remove" onclick="removeCartItem(${index})" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="cart-item-controls">
                <div class="cart-control-group">
                    <span class="cart-control-label">Quantity</span>
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateCartQuantity(${index}, -1)" type="button">−</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartQuantity(${index}, 1)" type="button">+</button>
                    </div>
                </div>
                <div class="cart-control-group">
                    <span class="cart-control-label">Unit Price</span>
                    <input type="number" class="price-input" value="${item.price}" min="0" step="0.01" 
                           onchange="updateCartPrice(${index}, this.value)">
                </div>
            </div>
            <div class="cart-item-total">
                <span>Subtotal:</span>
                <strong>${formatCurrency(item.quantity * item.price)}</strong>
            </div>
        </div>
    `).join('');
}

function removeCartItem(index) {
    orderItems.splice(index, 1);
    renderOrderCart();
    updateOrderSummary();
    showToast('Item removed from cart', 'info');
}

function updateCartQuantity(index, change) {
    const item = orderItems[index];
    if (!item) return;
    
    item.quantity += change;
    if (item.quantity < 1) item.quantity = 1;
    
    renderOrderCart();
    updateOrderSummary();
}

function updateCartPrice(index, newPrice) {
    const item = orderItems[index];
    if (!item) return;
    
    item.price = parseFloat(newPrice) || 0;
    renderOrderCart();
    updateOrderSummary();
}

function populateSupplierDropdown() {
    const select = document.getElementById('orderSupplier');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Supplier</option>' +
        suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

// Old functions removed - now using cart-based system

function updateOrderSummary() {
    const totalItems = orderItems.length;
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    safeUpdateElement('orderTotalItems', totalItems);
    safeUpdateElement('orderTotalQuantity', totalQuantity);
    safeUpdateElement('orderTotalAmount', formatCurrency(totalAmount));
}

function handleCreateOrder(e) {
    if (e) e.preventDefault();
    
    const supplier = document.getElementById('orderSupplier')?.value;
    const orderDate = document.getElementById('orderDate')?.value;
    const expectedDate = document.getElementById('orderExpectedDate')?.value;
    const reference = document.getElementById('orderReference')?.value;
    const notes = document.getElementById('orderNotes')?.value;
    
    if (!supplier) {
        showToast('Please select a supplier', 'error');
        return;
    }
    
    if (!orderDate) {
        showToast('Please select order date', 'error');
        return;
    }
    
    if (orderItems.length === 0) {
        showToast('Please add at least one item to your cart', 'error');
        return;
    }
    
    // Prepare items (remove productId and isManual flags for storage)
    const items = orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
    }));
    
    const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const orderId = generateOrderId();
    
    const orderData = {
        orderId,
        supplier,
        orderDate,
        expectedDate: expectedDate || null,
        reference: reference || null,
        items,
        totalAmount,
        status: 'pending',
        notes: notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const db = firebase.database();
    db.ref('orders').push(orderData)
        .then(() => {
            showToast('Order created successfully', 'success');
            logActivity('order', `New order created: ${orderId}`);
            navigateToPage('orders');
        })
        .catch((error) => {
            console.error('Error creating order:', error);
            showToast('Failed to create order', 'error');
        });
}

function generateOrderId() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${year}${month}${day}-${random}`;
}

// ===========================
// Add Supplier Form
// ===========================
function initializeAddSupplierForm() {
    console.log('✅ Initializing Add Supplier Form');
    
    const form = document.getElementById('addSupplierForm');
    if (form) {
        form.addEventListener('submit', handleAddSupplier);
    }
    
    // Clear form button
    const clearBtn = document.getElementById('clearSupplierFormBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSupplierForm);
    }
    
    // Search functionality
    const searchInput = document.getElementById('supplierSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSuppliersTable(e.target.value.toLowerCase().trim());
        });
    }
    
    // Load suppliers table
    renderSuppliersTable();
}

function clearSupplierForm() {
    document.getElementById('addSupplierForm').reset();
    showToast('Form cleared', 'info');
}

function filterSuppliersTable(searchTerm) {
    const filtered = searchTerm ? 
        suppliers.filter(s => 
            (s.name && s.name.toLowerCase().includes(searchTerm)) ||
            (s.phone && s.phone.includes(searchTerm)) ||
            (s.email && s.email.toLowerCase().includes(searchTerm)) ||
            (s.category && s.category.toLowerCase().includes(searchTerm))
        ) : suppliers;
    
    renderSuppliersTable(filtered);
}

function renderSuppliersTable(suppliersToShow = null) {
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;
    
    const displaySuppliers = suppliersToShow || suppliers;
    
    if (displaySuppliers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin: 0 auto 16px; opacity: 0.3;">
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <line x1="20" y1="8" x2="20" y2="14"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                    <p style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">No suppliers found</p>
                    <p style="font-size: 14px;">Add your first supplier using the form above</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = displaySuppliers.map(supplier => `
        <tr>
            <td><strong>${supplier.name || 'N/A'}</strong></td>
            <td>${supplier.phone || 'N/A'}</td>
            <td>${supplier.email || '-'}</td>
            <td>
                ${supplier.category ? `<span class="badge badge-blue">${capitalizeFirst(supplier.category)}</span>` : '-'}
            </td>
            <td>${formatPaymentTerms(supplier.paymentTerms)}</td>
            <td>${supplier.address || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="table-action-btn view" onclick="viewSupplier('${supplier.id}')" title="View Details">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="table-action-btn edit" onclick="editSupplier('${supplier.id}')" title="Edit Supplier">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="table-action-btn delete" onclick="confirmDeleteSupplier('${supplier.id}')" title="Delete Supplier">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function formatPaymentTerms(terms) {
    const termsMap = {
        'cash': 'Cash on Delivery',
        '7days': 'Net 7 Days',
        '14days': 'Net 14 Days',
        '30days': 'Net 30 Days',
        '60days': 'Net 60 Days'
    };
    return termsMap[terms] || terms || '-';
}

function handleAddSupplier(e) {
    e.preventDefault();
    
    const name = document.getElementById('supplierName').value.trim();
    const email = document.getElementById('supplierEmail').value.trim();
    const phone = document.getElementById('supplierPhone').value.trim();
    const address = document.getElementById('supplierAddress').value.trim();
    const category = document.getElementById('supplierCategory').value;
    const paymentTerms = document.getElementById('supplierPaymentTerms').value;
    
    if (!name || !phone) {
        showToast('Please fill in required fields', 'error');
        return;
    }
    
    const supplierData = {
        name,
        email: email || null,
        phone,
        address: address || null,
        category: category || null,
        paymentTerms: paymentTerms || 'cash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const db = firebase.database();
    db.ref('suppliers').push(supplierData)
        .then(() => {
            showToast('Supplier added successfully', 'success');
            logActivity('supplier', `New supplier added: ${name}`);
            document.getElementById('addSupplierForm').reset();
        })
        .catch((error) => {
            console.error('Error adding supplier:', error);
            showToast('Failed to add supplier', 'error');
        });
}

function viewSupplier(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Supplier Details</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div style="display: grid; gap: 20px;">
                    <div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Supplier Name</p>
                        <p style="font-size: 16px; font-weight: 600;">${supplier.name}</p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                        <div>
                            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Phone</p>
                            <p style="font-size: 14px;">${supplier.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Email</p>
                            <p style="font-size: 14px;">${supplier.email || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                        <div>
                            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Category</p>
                            <p style="font-size: 14px;">${supplier.category ? capitalizeFirst(supplier.category) : 'N/A'}</p>
                        </div>
                        <div>
                            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Payment Terms</p>
                            <p style="font-size: 14px;">${formatPaymentTerms(supplier.paymentTerms)}</p>
                        </div>
                    </div>
                    
                    ${supplier.address ? `
                    <div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Address</p>
                        <p style="font-size: 14px;">${supplier.address}</p>
                    </div>
                    ` : ''}
                    
                    <div>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Added On</p>
                        <p style="font-size: 14px;">${formatDateTime(supplier.createdAt)}</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function editSupplier(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    // Populate form
    document.getElementById('supplierName').value = supplier.name || '';
    document.getElementById('supplierPhone').value = supplier.phone || '';
    document.getElementById('supplierEmail').value = supplier.email || '';
    document.getElementById('supplierCategory').value = supplier.category || '';
    document.getElementById('supplierPaymentTerms').value = supplier.paymentTerms || 'cash';
    document.getElementById('supplierAddress').value = supplier.address || '';
    
    // Change form to edit mode
    const form = document.getElementById('addSupplierForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    submitBtn.textContent = 'Update Supplier';
    submitBtn.onclick = (e) => {
        e.preventDefault();
        updateSupplier(supplierId);
    };
    
    // Scroll to form
    document.querySelector('.supplier-form-card').scrollIntoView({ behavior: 'smooth' });
    showToast('Edit supplier details and click Update', 'info');
}

function updateSupplier(supplierId) {
    const name = document.getElementById('supplierName').value.trim();
    const email = document.getElementById('supplierEmail').value.trim();
    const phone = document.getElementById('supplierPhone').value.trim();
    const address = document.getElementById('supplierAddress').value.trim();
    const category = document.getElementById('supplierCategory').value;
    const paymentTerms = document.getElementById('supplierPaymentTerms').value;
    
    if (!name || !phone) {
        showToast('Please fill in required fields', 'error');
        return;
    }
    
    const supplierData = {
        name,
        email: email || null,
        phone,
        address: address || null,
        category: category || null,
        paymentTerms: paymentTerms || 'cash',
        updatedAt: new Date().toISOString()
    };
    
    const db = firebase.database();
    db.ref(`suppliers/${supplierId}`).update(supplierData)
        .then(() => {
            showToast('Supplier updated successfully', 'success');
            logActivity('supplier', `Supplier updated: ${name}`);
            resetSupplierForm();
        })
        .catch((error) => {
            console.error('Error updating supplier:', error);
            showToast('Failed to update supplier', 'error');
        });
}

function resetSupplierForm() {
    const form = document.getElementById('addSupplierForm');
    form.reset();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Supplier';
    submitBtn.onclick = null;
}

function confirmDeleteSupplier(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    
    if (confirm(`Are you sure you want to delete supplier "${supplier.name}"? This action cannot be undone.`)) {
        deleteSupplier(supplierId);
    }
}

function deleteSupplier(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    
    const db = firebase.database();
    db.ref(`suppliers/${supplierId}`).remove()
        .then(() => {
            showToast('Supplier deleted successfully', 'success');
            logActivity('supplier', `Supplier deleted: ${supplier.name}`);
        })
        .catch((error) => {
            console.error('Error deleting supplier:', error);
            showToast('Failed to delete supplier', 'error');
        });
}

// ===========================
// Export Functions
// ===========================
function exportOrders(format) {
    const displayOrders = filteredOrders.length > 0 ? filteredOrders : orders;
    
    if (displayOrders.length === 0) {
        showToast('No orders to export', 'error');
        return;
    }
    
    switch(format) {
        case 'csv':
            exportOrdersToCSV(displayOrders);
            break;
        case 'excel':
            exportOrdersToExcel(displayOrders);
            break;
        case 'pdf':
            exportOrdersToPDF(displayOrders);
            break;
    }
}

function exportOrdersToCSV(ordersData) {
    const headers = ['Order ID', 'Date', 'Supplier', 'Products', 'Quantity', 'Amount', 'Status', 'Reference', 'Notes'];
    
    const rows = ordersData.map(order => {
        const itemCount = order.items ? order.items.length : 0;
        const totalQty = order.items ? order.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0) : 0;
        const products = order.items ? order.items.map(item => item.name).join('; ') : '';
        
        return [
            order.orderId || 'N/A',
            formatDate(order.orderDate),
            order.supplier || 'Unknown',
            products,
            totalQty,
            order.totalAmount || 0,
            getStatusText(order.status),
            order.reference || '',
            order.notes || ''
        ];
    });
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Orders exported as CSV', 'success');
}

function exportOrdersToExcel(ordersData) {
    let tableHTML = `
        <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th { background-color: #2563eb; color: white; padding: 10px; border: 1px solid #ddd; font-weight: bold; }
                td { padding: 8px; border: 1px solid #ddd; }
                tr:nth-child(even) { background-color: #f9fafb; }
            </style>
        </head>
        <body>
            <h2>Orders Report - ${new Date().toLocaleDateString()}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Products</th>
                        <th>Quantity</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Reference</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    ordersData.forEach(order => {
        const itemCount = order.items ? order.items.length : 0;
        const totalQty = order.items ? order.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0) : 0;
        const products = order.items ? order.items.map(item => item.name).join(', ') : '';
        
        tableHTML += `
            <tr>
                <td>${order.orderId || 'N/A'}</td>
                <td>${formatDate(order.orderDate)}</td>
                <td>${order.supplier || 'Unknown'}</td>
                <td>${products}</td>
                <td>${totalQty}</td>
                <td>${formatCurrency(order.totalAmount || 0)}</td>
                <td>${getStatusText(order.status)}</td>
                <td>${order.reference || ''}</td>
                <td>${order.notes || ''}</td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Orders exported as Excel', 'success');
}

function exportOrdersToPDF(ordersData) {
    const printWindow = window.open('', '', 'height=600,width=800');
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Orders Report</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #2563eb;
                }
                .header h1 {
                    color: #2563eb;
                    margin: 0 0 10px 0;
                }
                .header p {
                    color: #666;
                    margin: 5px 0;
                }
                .summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin-bottom: 30px;
                }
                .summary-card {
                    background: #f8fafc;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #2563eb;
                }
                .summary-card h3 {
                    margin: 0 0 5px 0;
                    font-size: 24px;
                    color: #2563eb;
                }
                .summary-card p {
                    margin: 0;
                    font-size: 12px;
                    color: #666;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th {
                    background-color: #2563eb;
                    color: white;
                    padding: 12px 8px;
                    text-align: left;
                    font-size: 12px;
                    border: 1px solid #1e40af;
                }
                td {
                    padding: 10px 8px;
                    border: 1px solid #e2e8f0;
                    font-size: 11px;
                }
                tr:nth-child(even) {
                    background-color: #f8fafc;
                }
                .status {
                    padding: 3px 8px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: bold;
                }
                .status-pending { background: #fef3c7; color: #92400e; }
                .status-confirmed { background: #dbeafe; color: #1e40af; }
                .status-delivered { background: #d1fae5; color: #065f46; }
                .status-completed { background: #d1fae5; color: #065f46; }
                .status-cancelled { background: #fee2e2; color: #991b1b; }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #e2e8f0;
                    text-align: center;
                    color: #666;
                    font-size: 11px;
                }
                @media print {
                    body { padding: 10px; }
                    .summary { page-break-after: avoid; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Orders Report</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
                <p>Total Orders: ${ordersData.length}</p>
            </div>
            
            <div class="summary">
                <div class="summary-card">
                    <h3>${ordersData.length}</h3>
                    <p>Total Orders</p>
                </div>
                <div class="summary-card">
                    <h3>${ordersData.filter(o => o.status === 'pending' || o.status === 'confirmed').length}</h3>
                    <p>Pending</p>
                </div>
                <div class="summary-card">
                    <h3>${ordersData.filter(o => o.status === 'completed' || o.status === 'delivered').length}</h3>
                    <p>Completed</p>
                </div>
                <div class="summary-card">
                    <h3>${formatCurrency(ordersData.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0))}</h3>
                    <p>Total Value</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Products</th>
                        <th>Qty</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    ordersData.forEach(order => {
        const totalQty = order.items ? order.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0) : 0;
        const products = order.items ? order.items.map(item => item.name).join(', ') : '';
        const statusClass = `status-${order.status}`;
        
        html += `
            <tr>
                <td><strong>${order.orderId || 'N/A'}</strong></td>
                <td>${formatDate(order.orderDate)}</td>
                <td>${order.supplier || 'Unknown'}</td>
                <td>${products}</td>
                <td>${totalQty}</td>
                <td><strong>${formatCurrency(order.totalAmount || 0)}</strong></td>
                <td><span class="status ${statusClass}">${getStatusText(order.status)}</span></td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <div class="footer">
                <p>This is a computer-generated document. No signature required.</p>
                <p>&copy; ${new Date().getFullYear()} POS System. All rights reserved.</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.print();
        showToast('Orders exported as PDF', 'success');
    };
}

// ===========================
// Helper Functions
// ===========================
function safeUpdateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Export functions
window.initializeOrdersModule = initializeOrdersModule;
window.initializeCreateOrderForm = initializeCreateOrderForm;
window.initializeAddSupplierForm = initializeAddSupplierForm;
window.viewOrder = viewOrder;
window.updateOrderStatus = updateOrderStatus;
window.confirmCancelOrder = confirmCancelOrder;
window.exportOrders = exportOrders;
window.viewSupplier = viewSupplier;
window.editSupplier = editSupplier;
window.confirmDeleteSupplier = confirmDeleteSupplier;
// Cart functions
window.addProductToCart = addProductToCart;
window.removeCartItem = removeCartItem;
window.updateCartQuantity = updateCartQuantity;
window.updateCartPrice = updateCartPrice;
window.closeModal = closeModal;

console.log('✅ Orders Module Loaded');
