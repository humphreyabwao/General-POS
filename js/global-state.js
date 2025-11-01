// ===========================
// Global State Management & Real-time Firebase Integration
// ===========================

// Global State Object
const AppState = {
    products: [],
    sales: [],
    customers: [],
    expenses: [],
    b2bOrders: [],
    stats: {
        todaySales: 0,
        todayRevenue: 0,
        todayExpenses: 0,
        todayTransactions: 0,
        totalCustomers: 0,
        stockValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        pendingB2BOrders: 0
    },
    listeners: {
        products: null,
        sales: null,
        customers: null,
        expenses: null,
        b2bOrders: null
    },
    isInitialized: false,
    currentBranch: 'all'
};

// Event system for state changes
const StateEvents = {
    listeners: {},
    
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },
    
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    },
    
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    }
};

// ===========================
// Initialize Real-time Firebase Listeners
// ===========================
async function initializeRealtimeSync() {
    if (AppState.isInitialized) {
        console.log('Real-time sync already initialized');
        return;
    }
    
    console.log('🔄 Initializing real-time Firebase sync...');
    
    try {
        // Initialize products listener
        AppState.listeners.products = Firebase.db.listenToPath('products', (products) => {
            console.log('📦 Products updated:', products.length);
            AppState.products = products;
            StateEvents.emit('products:updated', products);
            calculateStats();
        });
        
        // Initialize sales listener
        AppState.listeners.sales = Firebase.db.listenToPath('sales', (sales) => {
            console.log('💰 Sales updated:', sales.length);
            AppState.sales = sales;
            StateEvents.emit('sales:updated', sales);
            calculateStats();
        });
        
        // Initialize customers listener
        AppState.listeners.customers = Firebase.db.listenToPath('customers', (customers) => {
            console.log('👥 Customers updated:', customers.length);
            AppState.customers = customers;
            StateEvents.emit('customers:updated', customers);
            calculateStats();
        });
        
        // Initialize expenses listener
        AppState.listeners.expenses = Firebase.db.listenToPath('expenses', (expenses) => {
            console.log('💸 Expenses updated:', expenses.length);
            AppState.expenses = expenses;
            StateEvents.emit('expenses:updated', expenses);
            calculateStats();
        });
        
        // Initialize B2B orders listener
        AppState.listeners.b2bOrders = Firebase.db.listenToPath('b2bOrders', (b2bOrders) => {
            console.log('📦 B2B Orders updated:', b2bOrders.length);
            AppState.b2bOrders = b2bOrders;
            StateEvents.emit('b2bOrders:updated', b2bOrders);
            calculateStats();
        });
        
        AppState.isInitialized = true;
        console.log('✅ Real-time sync initialized successfully');
        
        // Emit ready event
        StateEvents.emit('sync:ready', AppState);
        
    } catch (error) {
        console.error('❌ Error initializing real-time sync:', error);
        
        // Fallback to localStorage if Firebase fails
        loadFromLocalStorage();
    }
}

// ===========================
// Calculate Statistics in Real-time
// ===========================
function calculateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    // Calculate today's sales
    const todaySales = AppState.sales.filter(sale => {
        const saleDate = new Date(sale.createdAt || sale.date);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === todayTimestamp;
    });
    
    AppState.stats.todayTransactions = todaySales.length;
    AppState.stats.todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    
    // Calculate total items sold today
    AppState.stats.todaySales = todaySales.reduce((sum, sale) => {
        return sum + (sale.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
    }, 0);
    
    // Calculate today's expenses
    const todayExpenses = AppState.expenses.filter(expense => {
        const expenseDate = new Date(expense.createdAt || expense.date);
        expenseDate.setHours(0, 0, 0, 0);
        return expenseDate.getTime() === todayTimestamp;
    });
    
    AppState.stats.todayExpenses = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    // Calculate profit/loss
    AppState.stats.profitLoss = AppState.stats.todayRevenue - AppState.stats.todayExpenses;
    
    // Calculate total customers
    AppState.stats.totalCustomers = AppState.customers.length;
    
    // Calculate stock value and low stock
    let stockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    AppState.products.forEach(product => {
        const qty = product.quantity || 0;
        const price = product.price || 0;
        const reorderLevel = product.reorderLevel || 10;
        
        stockValue += qty * price;
        
        if (qty === 0) {
            outOfStockCount++;
        } else if (qty <= reorderLevel) {
            lowStockCount++;
        }
    });
    
    AppState.stats.stockValue = stockValue;
    AppState.stats.lowStockCount = lowStockCount;
    AppState.stats.outOfStockCount = outOfStockCount;
    
    // Calculate pending B2B orders
    const pendingB2BOrders = AppState.b2bOrders.filter(order => 
        order.status && order.status.toLowerCase() === 'pending'
    ).length;
    AppState.stats.pendingB2BOrders = pendingB2BOrders;
    
    // Emit stats updated event
    StateEvents.emit('stats:updated', AppState.stats);
    
    // Auto-save to localStorage as backup
    saveToLocalStorage();
}

// ===========================
// Global Helper Functions
// ===========================

// Get all products
function getProducts(filters = {}) {
    let products = [...AppState.products];
    
    // Apply filters
    if (filters.search) {
        const search = filters.search.toLowerCase();
        products = products.filter(p => 
            (p.name && p.name.toLowerCase().includes(search)) ||
            (p.sku && p.sku.toLowerCase().includes(search)) ||
            (p.barcode && p.barcode.includes(search))
        );
    }
    
    if (filters.category) {
        products = products.filter(p => p.category === filters.category);
    }
    
    if (filters.stockStatus) {
        products = products.filter(p => {
            const qty = p.quantity || 0;
            const reorder = p.reorderLevel || 10;
            
            switch (filters.stockStatus) {
                case 'ok': return qty > reorder;
                case 'low': return qty > 0 && qty <= reorder;
                case 'out': return qty === 0;
                default: return true;
            }
        });
    }
    
    return products;
}

// Get product by ID
function getProductById(productId) {
    return AppState.products.find(p => p.id === productId);
}

// Get product by SKU
function getProductBySKU(sku) {
    return AppState.products.find(p => p.sku === sku);
}

// Get product by barcode
function getProductByBarcode(barcode) {
    return AppState.products.find(p => p.barcode === barcode);
}

// Search products
function searchProducts(searchTerm, limit = 10) {
    const search = searchTerm.toLowerCase();
    return AppState.products
        .filter(p => 
            (p.name && p.name.toLowerCase().includes(search)) ||
            (p.sku && p.sku.toLowerCase().includes(search)) ||
            (p.barcode && p.barcode.includes(search)) ||
            (p.category && p.category.toLowerCase().includes(search))
        )
        .slice(0, limit);
}

// Add product to Firebase
async function addProduct(productData) {
    try {
        console.log('📦 Adding product to Firebase...', productData);
        
        const result = await Firebase.db.addData('products', {
            ...productData,
            quantity: productData.quantity || 0,
            reorderLevel: productData.reorderLevel || 10,
            status: 'active',
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        if (result.success) {
            console.log('✅ Product added to Firebase! ID:', result.id);
            console.log('📊 Check Firebase Console: https://console.firebase.google.com/project/vendly-7e566/database/vendly-7e566-default-rtdb/data');
            
            // Log activity
            logActivity('product', `Added product: ${productData.name}`, productData.addedBy || 'Admin', 'Inventory', `SKU: ${productData.sku}, Qty: ${productData.quantity}`);
            
            // Show success message with product name
            showToast(`✅ "${productData.name}" added successfully! Qty: ${productData.quantity}`, 'success');
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error adding product:', error);
        showToast('Error adding product: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Update product in Firebase
async function updateProduct(productId, updates) {
    try {
        const product = getProductById(productId);
        const result = await Firebase.db.updateData(`products/${productId}`, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        
        if (result.success) {
            console.log('✅ Product updated:', productId);
            
            // Log activity if quantity changed
            if (updates.quantity !== undefined && product) {
                const change = updates.quantity - (product.quantity || 0);
                const action = change > 0 ? 'Restocked' : 'Stock reduced';
                logActivity('inventory', `${action}: ${product.name}`, 'Admin', 'Inventory', `${product.quantity || 0} → ${updates.quantity}`);
            }
            
            showToast('Product updated successfully!', 'success');
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error updating product:', error);
        showToast('Error updating product: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Delete product from Firebase
async function deleteProduct(productId) {
    try {
        const result = await Firebase.db.deleteData(`products/${productId}`);
        
        if (result.success) {
            console.log('✅ Product deleted:', productId);
            showToast('Product deleted successfully!', 'success');
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        showToast('Error deleting product: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Record sale to Firebase
async function recordSale(saleData) {
    try {
        // Add sale record
        const result = await Firebase.db.addData('sales', {
            ...saleData,
            date: new Date().toISOString(),
            status: 'completed'
        });
        
        if (result.success) {
            console.log('✅ Sale recorded:', result.id);
            
            // Update product quantities
            for (const item of saleData.items) {
                const product = getProductById(item.productId);
                if (product) {
                    const newQuantity = (product.quantity || 0) - item.quantity;
                    await updateProduct(item.productId, { quantity: newQuantity });
                }
            }
            
            // Log activity
            logActivity('sale', `Sale completed - ${saleData.saleNumber}`, saleData.cashier, 'POS', `Total: ${formatCurrency(saleData.total)}`);
            
            showToast('Sale completed successfully!', 'success');
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error recording sale:', error);
        showToast('Error recording sale: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Get today's sales
function getTodaySales() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    return AppState.sales.filter(sale => {
        const saleDate = new Date(sale.createdAt || sale.date);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === todayTimestamp;
    });
}

// Get statistics
function getStats() {
    return { ...AppState.stats };
}

// ===========================
// LocalStorage Backup
// ===========================
function saveToLocalStorage() {
    try {
        localStorage.setItem('pos_products', JSON.stringify(AppState.products));
        localStorage.setItem('pos_sales', JSON.stringify(AppState.sales));
        localStorage.setItem('pos_customers', JSON.stringify(AppState.customers));
        localStorage.setItem('pos_expenses', JSON.stringify(AppState.expenses));
        localStorage.setItem('pos_b2bOrders', JSON.stringify(AppState.b2bOrders));
        localStorage.setItem('pos_stats', JSON.stringify(AppState.stats));
        localStorage.setItem('pos_last_sync', new Date().toISOString());
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        AppState.products = JSON.parse(localStorage.getItem('pos_products') || '[]');
        AppState.sales = JSON.parse(localStorage.getItem('pos_sales') || '[]');
        AppState.customers = JSON.parse(localStorage.getItem('pos_customers') || '[]');
        AppState.expenses = JSON.parse(localStorage.getItem('pos_expenses') || '[]');
        AppState.b2bOrders = JSON.parse(localStorage.getItem('pos_b2bOrders') || '[]');
        AppState.stats = JSON.parse(localStorage.getItem('pos_stats') || JSON.stringify(AppState.stats));
        
        console.log('📂 Data loaded from localStorage');
        StateEvents.emit('sync:ready', AppState);
        calculateStats();
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// ===========================
// Toast Notifications
// ===========================
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    document.querySelectorAll('.toast-notification').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <svg class="toast-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                ${type === 'success' ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>' : 
                  type === 'error' ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>' :
                  '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>'}
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===========================
// Format Helpers
// ===========================
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount || 0).replace('KES', 'KSh');
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(date) {
    return new Date(date).toLocaleString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===========================
// Activity Logging
// ===========================
function logActivity(type, description, user, module, details = '') {
    try {
        const activity = {
            type: type,
            description: description,
            user: user || 'User',
            module: module,
            details: details,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        // Save to localStorage
        const activities = JSON.parse(localStorage.getItem('systemActivities') || '[]');
        activities.unshift(activity); // Add to beginning
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.length = 100;
        }
        
        localStorage.setItem('systemActivities', JSON.stringify(activities));
        
        // Emit event for real-time update
        StateEvents.emit('activity:added', activity);
        
        console.log('📝 Activity logged:', description);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// ===========================
// Customer Order Tracking Functions
// ===========================
function updateCustomerOrderCount(customerId, increment = 1) {
    const customer = AppState.customers.find(c => c.id === customerId);
    if (customer) {
        customer.totalOrders = (customer.totalOrders || 0) + increment;
        customer.lastOrderDate = new Date().toISOString();
        
        // Update in Firebase
        database.ref(`customers/${customerId}`).update({
            totalOrders: customer.totalOrders,
            lastOrderDate: customer.lastOrderDate
        }).catch(error => {
            console.error('Error updating customer order count in Firebase:', error);
        });
        
        // Dispatch event for real-time updates
        StateEvents.emit('customerOrderUpdated', {
            customerId,
            totalOrders: customer.totalOrders
        });
        
        console.log(`✅ Customer ${customerId} order count updated: ${customer.totalOrders}`);
        return customer.totalOrders;
    }
    return 0;
}

function updateCustomerTotalSpent(customerId, amount) {
    const customer = AppState.customers.find(c => c.id === customerId);
    if (customer) {
        customer.totalSpent = (customer.totalSpent || 0) + amount;
        
        // Update in Firebase
        database.ref(`customers/${customerId}`).update({
            totalSpent: customer.totalSpent
        }).catch(error => {
            console.error('Error updating customer total spent in Firebase:', error);
        });
        
        return customer.totalSpent;
    }
    return 0;
}

function findCustomerByPhone(phone) {
    if (!phone) return null;
    
    // Normalize phone number (remove spaces, dashes, parentheses, etc.)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    return AppState.customers.find(c => {
        if (!c.phone) return false;
        const customerPhone = c.phone.replace(/[\s\-\(\)]/g, '');
        
        // Exact match
        if (customerPhone === normalizedPhone) return true;
        
        // Match last 9 digits (for different country code formats)
        if (customerPhone.length >= 9 && normalizedPhone.length >= 9) {
            return customerPhone.slice(-9) === normalizedPhone.slice(-9);
        }
        
        return false;
    });
}

function findCustomerByName(name) {
    if (!name) return null;
    
    const lowerName = name.toLowerCase().trim();
    
    return AppState.customers.find(c => {
        const customerName = (c.name || '').toLowerCase();
        const companyName = (c.companyName || '').toLowerCase();
        
        return customerName.includes(lowerName) || 
               companyName.includes(lowerName) ||
               lowerName.includes(customerName) ||
               lowerName.includes(companyName);
    });
}

function findCustomerByPhoneOrName(phone, name) {
    // Try phone first (more reliable)
    if (phone) {
        const customerByPhone = findCustomerByPhone(phone);
        if (customerByPhone) {
            console.log('✅ Customer found by phone:', customerByPhone.name || customerByPhone.companyName);
            return customerByPhone;
        }
    }
    
    // Fallback to name
    if (name) {
        const customerByName = findCustomerByName(name);
        if (customerByName) {
            console.log('✅ Customer found by name:', customerByName.name || customerByName.companyName);
            return customerByName;
        }
    }
    
    console.log('⚠️ Customer not found');
    return null;
}

// ===========================
// Export Global Functions
// ===========================
window.AppState = AppState;
window.StateEvents = StateEvents;
window.initializeRealtimeSync = initializeRealtimeSync;
window.getProducts = getProducts;
window.getProductById = getProductById;
window.getProductBySKU = getProductBySKU;
window.getProductByBarcode = getProductByBarcode;
window.searchProducts = searchProducts;
window.addProduct = addProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.recordSale = recordSale;
window.getTodaySales = getTodaySales;
window.getStats = getStats;
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.logActivity = logActivity;
window.updateCustomerOrderCount = updateCustomerOrderCount;
window.updateCustomerTotalSpent = updateCustomerTotalSpent;
window.findCustomerByPhone = findCustomerByPhone;
window.findCustomerByName = findCustomerByName;
window.findCustomerByPhoneOrName = findCustomerByPhoneOrName;
