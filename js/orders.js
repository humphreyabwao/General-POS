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
    
    // Set default date to today
    const orderDateInput = document.getElementById('orderDate');
    if (orderDateInput) {
        orderDateInput.valueAsDate = new Date();
    }
    
    // Initialize form submission
    const form = document.getElementById('createOrderForm');
    if (form) {
        form.addEventListener('submit', handleCreateOrder);
    }
    
    // Initialize add item button
    const addItemBtn = document.getElementById('addOrderItemBtn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addOrderItem);
    }
    
    // Populate supplier dropdown
    populateSupplierDropdown();
}

function populateSupplierDropdown() {
    const select = document.getElementById('orderSupplier');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Supplier</option>' +
        suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

function addOrderItem() {
    const itemsList = document.getElementById('orderItemsList');
    if (!itemsList) return;
    
    const itemIndex = orderItems.length;
    const itemHtml = `
        <div class="order-item" data-index="${itemIndex}">
            <div class="order-item-row">
                <input type="text" placeholder="Product name" class="form-control" style="flex: 2;" data-field="name">
                <input type="number" placeholder="Qty" class="form-control" style="flex: 0.5;" min="1" value="1" data-field="quantity">
                <input type="number" placeholder="Price" class="form-control" style="flex: 1;" min="0" step="0.01" data-field="price">
                <button type="button" class="btn-icon-danger" onclick="removeOrderItem(${itemIndex})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    itemsList.insertAdjacentHTML('beforeend', itemHtml);
    orderItems.push({ name: '', quantity: 1, price: 0 });
    
    // Add event listeners to update calculations
    const item = itemsList.lastElementChild;
    item.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateOrderSummary);
    });
}

function removeOrderItem(index) {
    const item = document.querySelector(`.order-item[data-index="${index}"]`);
    if (item) {
        item.remove();
        orderItems.splice(index, 1);
        updateOrderSummary();
    }
}

function updateOrderSummary() {
    const items = document.querySelectorAll('.order-item');
    let totalItems = 0;
    let totalQuantity = 0;
    let totalAmount = 0;
    
    items.forEach(item => {
        const qty = parseInt(item.querySelector('[data-field="quantity"]').value) || 0;
        const price = parseFloat(item.querySelector('[data-field="price"]').value) || 0;
        
        if (qty > 0 && price > 0) {
            totalItems++;
            totalQuantity += qty;
            totalAmount += qty * price;
        }
    });
    
    safeUpdateElement('orderTotalItems', totalItems);
    safeUpdateElement('orderTotalQuantity', totalQuantity);
    safeUpdateElement('orderTotalAmount', formatCurrency(totalAmount));
}

function handleCreateOrder(e) {
    e.preventDefault();
    
    const supplier = document.getElementById('orderSupplier').value;
    const orderDate = document.getElementById('orderDate').value;
    const expectedDate = document.getElementById('orderExpectedDate').value;
    const reference = document.getElementById('orderReference').value;
    const notes = document.getElementById('orderNotes').value;
    
    if (!supplier) {
        showToast('Please select a supplier', 'error');
        return;
    }
    
    // Collect items
    const items = [];
    document.querySelectorAll('.order-item').forEach(item => {
        const name = item.querySelector('[data-field="name"]').value.trim();
        const quantity = parseInt(item.querySelector('[data-field="quantity"]').value) || 0;
        const price = parseFloat(item.querySelector('[data-field="price"]').value) || 0;
        
        if (name && quantity > 0 && price > 0) {
            items.push({ name, quantity, price });
        }
    });
    
    if (items.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }
    
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
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
}

function handleAddSupplier(e) {
    e.preventDefault();
    
    const name = document.getElementById('supplierName').value.trim();
    const email = document.getElementById('supplierEmail').value.trim();
    const phone = document.getElementById('supplierPhone').value.trim();
    const address = document.getElementById('supplierAddress').value.trim();
    const category = document.getElementById('supplierCategory').value;
    const paymentTerms = document.getElementById('supplierPaymentTerms').value;
    const notes = document.getElementById('supplierNotes').value.trim();
    
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
        notes: notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const db = firebase.database();
    db.ref('suppliers').push(supplierData)
        .then(() => {
            showToast('Supplier added successfully', 'success');
            logActivity('supplier', `New supplier added: ${name}`);
            navigateToPage('orders');
        })
        .catch((error) => {
            console.error('Error adding supplier:', error);
            showToast('Failed to add supplier', 'error');
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
window.removeOrderItem = removeOrderItem;
window.exportOrders = exportOrders;

console.log('✅ Orders Module Loaded');
