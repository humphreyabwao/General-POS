// ===========================
// POS Module - Point of Sale System
// ===========================

let cart = [];
let cartTotal = 0;
let cartSubtotal = 0;
let cartDiscount = 0;
let cartTax = 0;
let selectedPaymentMethod = 'cash';

// Debounce function for search
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

// Initialize POS Module
function initializePOS() {
    initializeProductSearch();
    initializeCartFunctions();
    initializePaymentMethods();
    initializeDiscountTax();
    initializeCheckoutProcess();
    
    // Clear cart on initialization
    cart = [];
    updateCartDisplay();
    
    // Set default values for discount and tax to 0
    const discountInput = document.getElementById('posDiscountPercent');
    const taxInput = document.getElementById('posTaxPercent');
    
    if (discountInput) {
        discountInput.value = '0';
    }
    
    if (taxInput) {
        taxInput.value = '0';
    }
    
    // Initial calculation
    calculateTotals();
    
    // Listen to real-time state changes
    StateEvents.on('sales:updated', () => {
        updatePOSStats();
        loadTodaySales();
    });
    StateEvents.on('stats:updated', updatePOSStats);
    StateEvents.on('sync:ready', () => {
        loadPOSStats();
        loadTodaySales();
    });
    
    // Listen for product updates to refresh search results if active
    StateEvents.on('products:updated', () => {
        const searchInput = document.getElementById('posProductSearch');
        if (searchInput && searchInput.value.trim().length > 0) {
            performProductSearch(searchInput.value.trim());
        }
    });
    
    // Initial load if data is already available
    if (AppState.isInitialized) {
        loadPOSStats();
        loadTodaySales();
    }
}

// ===========================
// Product Search - Real-time
// ===========================
function initializeProductSearch() {
    const searchInput = document.getElementById('posProductSearch');
    const searchResults = document.getElementById('posSearchResults');
    
    if (searchInput) {
        console.log('✅ POS Search initialized');
        
        searchInput.addEventListener('input', debounce(async (e) => {
            const searchTerm = e.target.value.trim();
            
            console.log('🔍 Search input:', searchTerm);
            
            if (searchTerm.length === 0) {
                searchResults.innerHTML = '';
                searchResults.style.display = 'none';
                return;
            }
            
            // Search products from inventory (minimum 1 character)
            performProductSearch(searchTerm.toLowerCase());
        }, 300));
        
        // Clear search on click outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
        
        // Show results on focus if there's a search term
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length > 0) {
                searchResults.style.display = 'block';
            }
        });
    }
    
    // Barcode scanner support
    const barcodeInput = document.getElementById('posBarcodeInput');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchByBarcode(barcodeInput.value);
                barcodeInput.value = '';
            }
        });
    }
    
    // Manual add product button
    const manualAddBtn = document.getElementById('posManualAdd');
    if (manualAddBtn) {
        manualAddBtn.addEventListener('click', showManualAddModal);
    }
}

// Search products from inventory in real-time
function performProductSearch(searchTerm) {
    const searchResults = document.getElementById('posSearchResults');
    
    if (!searchResults) {
        console.error('❌ Search results element not found');
        return;
    }
    
    try {
        console.log('🔍 Searching for:', searchTerm);
        
        // Show loading
        searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
        searchResults.style.display = 'block';
        
        // Check if AppState exists
        if (typeof AppState === 'undefined') {
            console.error('❌ AppState is not defined');
            searchResults.innerHTML = '<div class="search-error">System not ready. Please wait...</div>';
            return;
        }
        
        console.log('📦 Total products in AppState:', AppState.products ? AppState.products.length : 0);
        
        // Check if we have products
        if (!AppState.products || AppState.products.length === 0) {
            searchResults.innerHTML = '<div class="search-empty">No products in inventory yet. Add products first!</div>';
            return;
        }
        
        // Search directly in AppState.products
        const search = searchTerm.toLowerCase();
        const results = AppState.products.filter(p => 
            (p.name && p.name.toLowerCase().includes(search)) ||
            (p.sku && p.sku.toLowerCase().includes(search)) ||
            (p.barcode && p.barcode.toLowerCase().includes(search)) ||
            (p.category && p.category.toLowerCase().includes(search))
        ).slice(0, 10);
        
        console.log('✅ Found results:', results.length);
        
        displaySearchResults(results);
        
    } catch (error) {
        console.error('❌ Error searching products:', error);
        searchResults.innerHTML = `<div class="search-error">Error: ${error.message}</div>`;
    }
}

// Display search results
function displaySearchResults(products) {
    const searchResults = document.getElementById('posSearchResults');
    
    if (products.length === 0) {
        searchResults.innerHTML = '<div class="search-empty">No products found. Try adding items to inventory first.</div>';
        return;
    }
    
    let html = '<div class="search-results-list">';
    
    products.slice(0, 10).forEach(product => {
        // Use 'quantity' property (from inventory) or 'stock' property (from Firebase)
        const stock = product.quantity !== undefined ? product.quantity : (product.stock || 0);
        const reorderLevel = product.reorderLevel || 10;
        const stockStatus = getStockStatus(stock, reorderLevel);
        const isOutOfStock = stock <= 0;
        const productId = product.id || product.sku;
        
        html += `
            <div class="search-result-item ${isOutOfStock ? 'out-of-stock' : ''}" data-product-id="${productId}">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-meta">
                        <span class="product-sku">SKU: ${product.sku}</span>
                        <span class="product-category">${product.category || 'Uncategorized'}</span>
                        <span class="product-stock ${stockStatus.class}">${stock} in stock</span>
                    </div>
                </div>
                <div class="product-actions">
                    <span class="product-price">KSh ${parseFloat(product.price || 0).toFixed(2)}</span>
                    ${!isOutOfStock ? 
                        `<button class="btn-add-to-cart" onclick="window.addToCartFromSearch('${productId}')">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 3a1 1 0 011 1v3h3a1 1 0 110 2H9v3a1 1 0 11-2 0V9H4a1 1 0 110-2h3V4a1 1 0 011-1z"/>
                            </svg>
                            Add
                        </button>` : 
                        '<span class="out-of-stock-label">Out of Stock</span>'
                    }
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    searchResults.innerHTML = html;
}

// Search by barcode - Real-time from AppState
function searchByBarcode(barcode) {
    if (!barcode) return;
    
    try {
        // Search in real-time from AppState.products
        const product = AppState.products.find(p => 
            p.barcode === barcode || 
            p.sku === barcode
        );
        
        if (product) {
            // Check if product is in stock
            if ((product.quantity || 0) > 0) {
                addToCart(product);
                showToast(`${product.name} added to cart`, 'success');
            } else {
                showToast(`${product.name} is out of stock`, 'error');
            }
        } else {
            showToast('Product not found with barcode: ' + barcode, 'error');
        }
        
    } catch (error) {
        console.error('Error searching by barcode:', error);
        showToast('Error searching product', 'error');
    }
}

// Add to cart from search
function addToCartFromSearch(productId) {
    // Find product in real-time from AppState
    const product = AppState.products.find(p => p.id === productId || p.sku === productId);
    
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    addToCart(product);
    
    // Close search results
    document.getElementById('posSearchResults').style.display = 'none';
    document.getElementById('posProductSearch').value = '';
    
    showToast(`${product.name} added to cart`, 'success');
}

// Make function available globally
window.addToCartFromSearch = addToCartFromSearch;

// ===========================
// Cart Management
// ===========================
function initializeCartFunctions() {
    // Cart will be updated dynamically
}

// Add product to cart
function addToCart(product) {
    // Use product ID or SKU as unique identifier
    const productId = product.id || product.sku;
    
    // Get real-time stock from AppState (most current data)
    const currentProduct = AppState.products.find(p => p.id === productId || p.sku === productId);
    const availableStock = currentProduct ? (currentProduct.quantity || 0) : (product.quantity || 0);
    
    // Check if product is in stock
    if (availableStock <= 0) {
        showToast(`${product.name} is out of stock`, 'error');
        return;
    }
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        // Increase quantity if in stock
        if (existingItem.quantity < availableStock) {
            existingItem.quantity++;
            existingItem.subtotal = existingItem.price * existingItem.quantity * (1 - existingItem.discount / 100);
        } else {
            showToast(`Maximum stock reached (${availableStock} available)`, 'warning');
            return;
        }
    } else {
        // Add new item to cart
        cart.push({
            id: productId,
            name: product.name,
            sku: product.sku,
            price: parseFloat(product.price || 0),
            quantity: 1,
            maxStock: availableStock,
            discount: 0,
            subtotal: parseFloat(product.price || 0)
        });
    }
    
    updateCartDisplay();
    calculateTotals();
}

// Update cart display
function updateCartDisplay() {
    const cartItems = document.getElementById('posCartItems');
    const emptyCart = document.getElementById('posEmptyCart');
    const cartCount = document.getElementById('posCartCount');
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    }
    
    if (cart.length === 0) {
        cartItems.style.display = 'none';
        emptyCart.style.display = 'flex';
        return;
    }
    
    cartItems.style.display = 'block';
    emptyCart.style.display = 'none';
    
    let html = '';
    cart.forEach((item, index) => {
        html += `
            <div class="cart-item" data-cart-index="${index}">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-sku">SKU: ${item.sku}</div>
                    <div class="cart-item-price">Unit Price: KSh ${item.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-control-group">
                        <label class="control-label">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                                <path d="M2 4h12M2 8h12M2 12h12"/>
                            </svg>
                            Quantity
                        </label>
                        <div class="quantity-control">
                            <button class="qty-btn" onclick="decreaseQuantity(${index})" title="Decrease">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                    <path d="M2 7h10"/>
                                </svg>
                            </button>
                            <input type="number" class="qty-input" value="${item.quantity}" 
                                   min="1" max="${item.maxStock}" 
                                   onchange="updateQuantity(${index}, this.value)"
                                   title="Quantity">
                            <button class="qty-btn" onclick="increaseQuantity(${index})" title="Increase">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                    <path d="M7 2v10M2 7h10"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="cart-control-group">
                        <label class="control-label">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                                <path d="M3 2l10 12M13 2L3 14"/>
                            </svg>
                            Discount %
                        </label>
                        <div class="item-discount">
                            <input type="number" class="discount-input" 
                                   placeholder="0" 
                                   value="${item.discount}" 
                                   min="0" max="100" step="0.01"
                                   onchange="updateItemDiscount(${index}, this.value)"
                                   title="Item discount percentage">
                        </div>
                    </div>
                    <div class="cart-control-group">
                        <label class="control-label">Subtotal</label>
                        <div class="cart-item-subtotal">
                            KSh ${item.subtotal.toFixed(2)}
                        </div>
                    </div>
                    <div class="cart-control-group cart-remove-group">
                        <label class="control-label" style="visibility: hidden;">Remove</label>
                        <button class="btn-remove-item" onclick="removeFromCart(${index})" title="Remove item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
}

// Increase quantity
function increaseQuantity(index) {
    if (cart[index].quantity < cart[index].maxStock) {
        cart[index].quantity++;
        calculateItemSubtotal(index);
        updateCartDisplay();
        calculateTotals();
    } else {
        showNotification('Maximum stock reached', 'warning');
    }
}

// Decrease quantity
function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
        calculateItemSubtotal(index);
        updateCartDisplay();
        calculateTotals();
    }
}

// Update quantity
function updateQuantity(index, value) {
    const qty = parseInt(value);
    if (qty > 0 && qty <= cart[index].maxStock) {
        cart[index].quantity = qty;
        calculateItemSubtotal(index);
        updateCartDisplay();
        calculateTotals();
    } else {
        showNotification('Invalid quantity', 'error');
        updateCartDisplay();
    }
}

// Update item discount
function updateItemDiscount(index, value) {
    const discount = parseFloat(value) || 0;
    if (discount >= 0 && discount <= 100) {
        cart[index].discount = discount;
        calculateItemSubtotal(index);
        updateCartDisplay();
        calculateTotals();
    }
}

// Calculate item subtotal
function calculateItemSubtotal(index) {
    const item = cart[index];
    const basePrice = item.price * item.quantity;
    const discountAmount = basePrice * (item.discount / 100);
    item.subtotal = basePrice - discountAmount;
}

// Remove from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
    calculateTotals();
    showNotification('Item removed from cart', 'info');
}

// Clear cart
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        
        // Reset discount and tax to 0
        const discountInput = document.getElementById('posDiscountPercent');
        const taxInput = document.getElementById('posTaxPercent');
        
        if (discountInput) {
            discountInput.value = '0';
        }
        
        if (taxInput) {
            taxInput.value = '0';
        }
        
        updateCartDisplay();
        calculateTotals();
        showNotification('Cart cleared', 'info');
    }
}

// ===========================
// Discount and Tax
// ===========================
function initializeDiscountTax() {
    const discountInput = document.getElementById('posDiscountPercent');
    const taxInput = document.getElementById('posTaxPercent');
    
    if (discountInput) {
        discountInput.addEventListener('input', calculateTotals);
        
        // Validate on blur
        discountInput.addEventListener('blur', function() {
            let value = parseFloat(this.value) || 0;
            value = Math.max(0, Math.min(100, value));
            this.value = value;
            calculateTotals();
        });
    }
    
    if (taxInput) {
        taxInput.addEventListener('input', calculateTotals);
        
        // Validate on blur
        taxInput.addEventListener('blur', function() {
            let value = parseFloat(this.value) || 0;
            value = Math.max(0, Math.min(100, value));
            this.value = value;
            calculateTotals();
        });
    }
}

// Calculate totals
function calculateTotals() {
    // Calculate subtotal
    cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Get discount and tax percentages (default to 0)
    const discountInput = document.getElementById('posDiscountPercent');
    const taxInput = document.getElementById('posTaxPercent');
    
    let discountPercent = 0;
    let taxPercent = 0;
    
    if (discountInput && discountInput.value !== '') {
        discountPercent = parseFloat(discountInput.value) || 0;
        // Ensure it's within valid range
        discountPercent = Math.max(0, Math.min(100, discountPercent));
    }
    
    if (taxInput && taxInput.value !== '') {
        taxPercent = parseFloat(taxInput.value) || 0;
        // Ensure it's within valid range
        taxPercent = Math.max(0, Math.min(100, taxPercent));
    }
    
    // Calculate discount amount
    cartDiscount = cartSubtotal * (discountPercent / 100);
    
    // Calculate subtotal after discount
    const subtotalAfterDiscount = cartSubtotal - cartDiscount;
    
    // Calculate tax amount
    cartTax = subtotalAfterDiscount * (taxPercent / 100);
    
    // Calculate total
    cartTotal = subtotalAfterDiscount + cartTax;
    
    // Update display
    updateTotalsDisplay();
}

// Update totals display
function updateTotalsDisplay() {
    document.getElementById('posSubtotal').textContent = `KSh ${cartSubtotal.toFixed(2)}`;
    document.getElementById('posDiscount').textContent = `- KSh ${cartDiscount.toFixed(2)}`;
    document.getElementById('posTax').textContent = `+ KSh ${cartTax.toFixed(2)}`;
    document.getElementById('posTotal').textContent = `KSh ${cartTotal.toFixed(2)}`;
    
    // Update checkout button
    const checkoutBtn = document.getElementById('posCheckoutBtn');
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
    }
}

// ===========================
// Payment Methods
// ===========================
function initializePaymentMethods() {
    const paymentButtons = document.querySelectorAll('.payment-method-btn');
    
    paymentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            paymentButtons.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Set selected payment method
            selectedPaymentMethod = btn.dataset.method;
            
            // Show/hide payment details based on method
            showPaymentDetails(selectedPaymentMethod);
        });
    });
}

// Show payment details
function showPaymentDetails(method) {
    const cashDetails = document.getElementById('posCashDetails');
    const mpesaDetails = document.getElementById('posMpesaDetails');
    const cardDetails = document.getElementById('posCardDetails');
    
    // Hide all
    cashDetails.style.display = 'none';
    mpesaDetails.style.display = 'none';
    cardDetails.style.display = 'none';
    
    // Show selected
    if (method === 'cash') {
        cashDetails.style.display = 'block';
        calculateChange();
    } else if (method === 'mpesa') {
        mpesaDetails.style.display = 'block';
    } else if (method === 'card') {
        cardDetails.style.display = 'block';
    }
}

// Calculate change for cash payment
function calculateChange() {
    const amountReceivedInput = document.getElementById('posAmountReceived');
    const changeDisplay = document.getElementById('posChange');
    
    if (amountReceivedInput) {
        amountReceivedInput.addEventListener('input', () => {
            const amountReceived = parseFloat(amountReceivedInput.value) || 0;
            const change = amountReceived - cartTotal;
            
            if (changeDisplay) {
                if (change >= 0) {
                    changeDisplay.textContent = `KSh ${change.toFixed(2)}`;
                    changeDisplay.style.color = 'var(--success)';
                } else {
                    changeDisplay.textContent = `KSh ${Math.abs(change).toFixed(2)} short`;
                    changeDisplay.style.color = 'var(--danger)';
                }
            }
        });
    }
}

// ===========================
// Checkout Process
// ===========================
function initializeCheckoutProcess() {
    const checkoutBtn = document.getElementById('posCheckoutBtn');
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', showCheckoutModal);
    }
}

// Show checkout modal
function showCheckoutModal() {
    if (cart.length === 0) {
        showNotification('Cart is empty', 'warning');
        return;
    }
    
    const modal = document.getElementById('posCheckoutModal');
    if (modal) {
        // Update modal totals
        document.getElementById('modalSubtotal').textContent = `KSh ${cartSubtotal.toFixed(2)}`;
        document.getElementById('modalDiscount').textContent = `KSh ${cartDiscount.toFixed(2)}`;
        document.getElementById('modalTax').textContent = `KSh ${cartTax.toFixed(2)}`;
        document.getElementById('modalTotal').textContent = `KSh ${cartTotal.toFixed(2)}`;
        
        // Reset payment details
        document.getElementById('posAmountReceived').value = '';
        document.getElementById('posChange').textContent = 'KSh 0.00';
        document.getElementById('posMpesaCode').value = '';
        document.getElementById('posCardNumber').value = '';
        
        // Set default payment method
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-method="cash"]').classList.add('active');
        selectedPaymentMethod = 'cash';
        showPaymentDetails('cash');
        
        // Show modal with smooth animation
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Focus on amount received input for cash
        requestAnimationFrame(() => {
            const amountInput = document.getElementById('posAmountReceived');
            if (amountInput) amountInput.focus();
        });
    }
}

// Close checkout modal
function closeCheckoutModal() {
    const modal = document.getElementById('posCheckoutModal');
    if (modal) {
        modal.classList.remove('show');
        
        // Hide after animation completes
        setTimeout(() => {
            if (modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        }, 150);
    }
}

// Process sale
async function processSale() {
    if (cart.length === 0) {
        showNotification('Cart is empty', 'warning');
        return;
    }
    
    // Validate payment details
    if (!validatePayment()) {
        return;
    }
    
    // Show processing
    const confirmBtn = document.getElementById('posConfirmSale');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-loading">Processing...</span>';
    
    try {
        // Prepare sale data
        const saleData = {
            saleNumber: generateSaleNumber(),
            date: new Date().toISOString(),
            items: cart.map(item => ({
                productId: item.id,
                name: item.name,
                sku: item.sku,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                subtotal: item.subtotal
            })),
            subtotal: cartSubtotal,
            discount: cartDiscount,
            tax: cartTax,
            total: cartTotal,
            paymentMethod: selectedPaymentMethod,
            paymentDetails: getPaymentDetails(),
            cashier: localStorage.getItem('userName') || 'Cashier',
            branch: localStorage.getItem('selectedBranch') || 'Main Branch',
            status: 'completed'
        };
        
        // Save sale to Firebase using global function
        const result = await recordSale(saleData);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to record sale');
        }
        
        // Close checkout modal first
        closeCheckoutModal();
        
        // Clear cart
        cart = [];
        
        // Reset discount and tax to 0
        const discountInput = document.getElementById('posDiscountPercent');
        const taxInput = document.getElementById('posTaxPercent');
        
        if (discountInput) {
            discountInput.value = '0';
        }
        
        if (taxInput) {
            taxInput.value = '0';
        }
        
        updateCartDisplay();
        calculateTotals();
        
        // Stats will be updated automatically via StateEvents
        console.log('✅ Sale completed! Stats will update automatically.');
        
        // Show success modal with print options
        showSaleSuccessModal(saleData);
        
        // Auto-print receipt after short delay
        setTimeout(() => {
            printReceipt(saleData);
        }, 500);
        
    } catch (error) {
        console.error('Error processing sale:', error);
        showNotification('Error processing sale', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// Validate payment
function validatePayment() {
    if (selectedPaymentMethod === 'cash') {
        const amountReceived = parseFloat(document.getElementById('posAmountReceived').value) || 0;
        if (amountReceived < cartTotal) {
            showNotification('Insufficient amount received', 'error');
            return false;
        }
    } else if (selectedPaymentMethod === 'mpesa') {
        const mpesaCode = document.getElementById('posMpesaCode').value.trim();
        if (!mpesaCode) {
            showNotification('Please enter M-PESA transaction code', 'error');
            return false;
        }
    } else if (selectedPaymentMethod === 'card') {
        const cardNumber = document.getElementById('posCardNumber').value.trim();
        if (!cardNumber) {
            showNotification('Please enter card details', 'error');
            return false;
        }
    }
    return true;
}

// Get payment details
function getPaymentDetails() {
    const details = {
        method: selectedPaymentMethod
    };
    
    if (selectedPaymentMethod === 'cash') {
        const amountReceived = parseFloat(document.getElementById('posAmountReceived').value) || 0;
        details.amountReceived = amountReceived;
        details.change = amountReceived - cartTotal;
    } else if (selectedPaymentMethod === 'mpesa') {
        details.transactionCode = document.getElementById('posMpesaCode').value.trim();
        details.phoneNumber = document.getElementById('posMpesaPhone').value.trim();
    } else if (selectedPaymentMethod === 'card') {
        details.cardNumber = document.getElementById('posCardNumber').value.trim();
        details.cardType = 'Credit/Debit';
    }
    
    return details;
}

// Generate sale number
function generateSaleNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SALE-${year}${month}${day}-${random}`;
}

// Store last sale data for reprinting
let lastSaleData = null;

// Show sale success modal
function showSaleSuccessModal(saleData) {
    // Store for reprinting
    lastSaleData = saleData;
    
    const modal = document.getElementById('posSaleSuccessModal');
    if (modal) {
        // Update modal content
        document.getElementById('successSaleNumber').textContent = saleData.saleNumber;
        document.getElementById('successSaleTotal').textContent = `KSh ${saleData.total.toFixed(2)}`;
        document.getElementById('successPaymentMethod').textContent = saleData.paymentMethod.toUpperCase();
        
        // Show modal with animation
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

// Close sale success modal
function closeSaleSuccessModal() {
    const modal = document.getElementById('posSaleSuccessModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        }, 150);
    }
}

// Reprint receipt
function reprintReceipt() {
    if (lastSaleData) {
        printReceipt(lastSaleData);
        showNotification('Printing receipt...', 'info');
    }
}

// New sale after success
function newSaleAfterSuccess() {
    closeSaleSuccessModal();
    // Cart is already cleared, just show notification
    showNotification('Ready for new sale', 'info');
}

// Print receipt
function printReceipt(saleData) {
    try {
        // Create receipt window
        const receiptWindow = window.open('', '_blank', 'width=300,height=600');
        
        if (!receiptWindow) {
            showNotification('Please allow pop-ups to print receipt', 'warning');
            return;
        }
        
        const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${saleData.saleNumber}</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; }
                h2 { text-align: center; margin: 10px 0; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .row { display: flex; justify-content: space-between; margin: 5px 0; }
                .total { font-weight: bold; font-size: 1.2em; }
                .center { text-align: center; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 5px 0; }
                .item-name { max-width: 150px; }
            </style>
        </head>
        <body>
            <h2>RECEIPT</h2>
            <div class="center">
                <p><strong>Business Name</strong></p>
                <p>${saleData.branch}</p>
                <p>${new Date(saleData.date).toLocaleString()}</p>
            </div>
            <div class="divider"></div>
            <p><strong>Sale #:</strong> ${saleData.saleNumber}</p>
            <p><strong>Cashier:</strong> ${saleData.cashier}</p>
            <div class="divider"></div>
            <table>
                ${saleData.items.map(item => `
                    <tr>
                        <td class="item-name">${item.name}</td>
                        <td>${item.quantity} x ${item.price.toFixed(2)}</td>
                        <td style="text-align: right;">${item.subtotal.toFixed(2)}</td>
                    </tr>
                    ${item.discount > 0 ? `<tr><td colspan="3" style="font-size: 0.9em;">Disc: ${item.discount}%</td></tr>` : ''}
                `).join('')}
            </table>
            <div class="divider"></div>
            <div class="row"><span>Subtotal:</span><span>KSh ${saleData.subtotal.toFixed(2)}</span></div>
            <div class="row"><span>Discount:</span><span>- KSh ${saleData.discount.toFixed(2)}</span></div>
            <div class="row"><span>Tax:</span><span>+ KSh ${saleData.tax.toFixed(2)}</span></div>
            <div class="divider"></div>
            <div class="row total"><span>TOTAL:</span><span>KSh ${saleData.total.toFixed(2)}</span></div>
            <div class="row"><span>Payment:</span><span>${saleData.paymentMethod.toUpperCase()}</span></div>
            ${saleData.paymentDetails.change !== undefined ? 
                `<div class="row"><span>Change:</span><span>KSh ${saleData.paymentDetails.change.toFixed(2)}</span></div>` : ''}
            <div class="divider"></div>
            <p class="center">Thank you for your business!</p>
            <p class="center" style="font-size: 0.9em;">Powered by POS System</p>
        </body>
        </html>
    `;
    
        receiptWindow.document.write(receiptHTML);
        receiptWindow.document.close();
        
        // Auto print after a short delay
        setTimeout(() => {
            receiptWindow.print();
            
            // Optional: Close window after printing (user can cancel this)
            receiptWindow.onafterprint = function() {
                setTimeout(() => {
                    receiptWindow.close();
                }, 500);
            };
        }, 250);
        
        showNotification('Receipt is being printed...', 'info');
        
    } catch (error) {
        console.error('Error printing receipt:', error);
        showNotification('Error printing receipt. Please try again.', 'error');
    }
}

// ===========================
// Manual Add Product
// ===========================
function showManualAddModal() {
    const modal = document.getElementById('posManualAddModal');
    if (modal) {
        // Clear form first
        const nameInput = document.getElementById('manualProductName');
        const priceInput = document.getElementById('manualProductPrice');
        const qtyInput = document.getElementById('manualProductQuantity');
        
        if (nameInput) nameInput.value = '';
        if (priceInput) priceInput.value = '';
        if (qtyInput) qtyInput.value = '1';
        
        // Show modal with smooth animation
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Focus on name input for quick entry
        requestAnimationFrame(() => {
            if (nameInput) nameInput.focus();
        });
    }
}

function closeManualAddModal() {
    const modal = document.getElementById('posManualAddModal');
    if (modal) {
        modal.classList.remove('show');
        
        // Hide after animation completes
        setTimeout(() => {
            if (modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        }, 150);
    }
}

function addManualProduct() {
    const name = document.getElementById('manualProductName').value.trim();
    const price = parseFloat(document.getElementById('manualProductPrice').value) || 0;
    const quantity = parseInt(document.getElementById('manualProductQuantity').value) || 1;
    
    if (!name) {
        showNotification('Please enter product name', 'error');
        return;
    }
    
    if (price <= 0) {
        showNotification('Please enter valid price', 'error');
        return;
    }
    
    // Add to cart
    const manualProduct = {
        id: `manual-${Date.now()}`,
        name: name,
        sku: 'MANUAL',
        price: price,
        quantity: quantity,
        maxStock: 9999,
        discount: 0,
        subtotal: price * quantity
    };
    
    cart.push(manualProduct);
    updateCartDisplay();
    calculateTotals();
    
    closeManualAddModal();
    showNotification('Product added to cart', 'success');
}

// ===========================
// POS Stats
// ===========================
function loadPOSStats() {
    updatePOSStats();
}

function updatePOSStats() {
    try {
        // Check if AppState is initialized
        if (!AppState || !AppState.isInitialized) {
            console.log('⏳ Waiting for AppState to initialize...');
            return;
        }
        
        const stats = AppState.stats;
        
        console.log('📊 POS Stats:', {
            todayRevenue: stats.todayRevenue,
            todayTransactions: stats.todayTransactions,
            todaySales: stats.todaySales
        });
        
        // Update Today's Sales (number of items sold)
        const todaySalesEl = document.getElementById('posTodaySales');
        if (todaySalesEl) {
            todaySalesEl.textContent = stats.todaySales || 0;
        }
        
        // Update Today's Revenue
        const todayRevenueEl = document.getElementById('posTodayRevenue');
        if (todayRevenueEl) {
            todayRevenueEl.textContent = formatCurrency(stats.todayRevenue || 0);
        }
        
        // Update Today's Transactions
        const todayTransactionsEl = document.getElementById('posTodayTransactions');
        if (todayTransactionsEl) {
            todayTransactionsEl.textContent = stats.todayTransactions || 0;
        }
        
        console.log('✅ POS stats updated successfully');
        
    } catch (error) {
        console.error('❌ Error loading POS stats:', error);
    }
}

// ===========================
// Helper Functions
// ===========================

// Get stock status
function getStockStatus(stock, reorderLevel) {
    if (stock <= 0) {
        return { class: 'out-stock', label: 'Out of Stock' };
    } else if (stock <= reorderLevel) {
        return { class: 'low-stock', label: 'Low Stock' };
    } else {
        return { class: 'ok-stock', label: 'In Stock' };
    }
}

// Mock products for demo
function getMockProducts() {
    return [
        { id: '1', name: 'Laptop Dell XPS 13', sku: 'LAP-001', barcode: '1234567890123', category: 'Electronics', price: 85000, stock: 15, reorderLevel: 5 },
        { id: '2', name: 'iPhone 14 Pro', sku: 'PHO-001', barcode: '1234567890124', category: 'Electronics', price: 120000, stock: 8, reorderLevel: 3 },
        { id: '3', name: 'Samsung 55" TV', sku: 'TV-001', barcode: '1234567890125', category: 'Electronics', price: 55000, stock: 12, reorderLevel: 4 },
        { id: '4', name: 'Office Chair', sku: 'FUR-001', barcode: '1234567890126', category: 'Furniture', price: 8500, stock: 25, reorderLevel: 10 },
        { id: '5', name: 'Desk Lamp', sku: 'LIG-001', barcode: '1234567890127', category: 'Lighting', price: 1500, stock: 50, reorderLevel: 15 },
        { id: '6', name: 'Wireless Mouse', sku: 'ACC-001', barcode: '1234567890128', category: 'Accessories', price: 1200, stock: 100, reorderLevel: 30 },
        { id: '7', name: 'Mechanical Keyboard', sku: 'ACC-002', barcode: '1234567890129', category: 'Accessories', price: 4500, stock: 20, reorderLevel: 8 },
        { id: '8', name: 'USB-C Hub', sku: 'ACC-003', barcode: '1234567890130', category: 'Accessories', price: 2800, stock: 35, reorderLevel: 12 },
        { id: '9', name: 'Notebook A4', sku: 'STA-001', barcode: '1234567890131', category: 'Stationery', price: 250, stock: 200, reorderLevel: 50 },
        { id: '10', name: 'Pen Set', sku: 'STA-002', barcode: '1234567890132', category: 'Stationery', price: 450, stock: 150, reorderLevel: 40 }
    ];
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `pos-notification ${type}`;
    notification.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            ${type === 'success' ? '<path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>' :
              type === 'error' ? '<path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>' :
              type === 'warning' ? '<path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>' :
              '<path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>'}
        </svg>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ===========================
// Today''s Sales Module
// ===========================

// Initialize Today''s Sales Module
function initializeTodaySales() {
    loadTodaySales();
}

// Load and display today's sales
function loadTodaySales() {
    // Check if AppState is initialized
    if (!AppState || !AppState.isInitialized) {
        console.log('⏳ Waiting for AppState to initialize...');
        return;
    }
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    // Filter sales for today from AppState
    const todaySales = AppState.sales.filter(sale => {
        const saleDate = new Date(sale.createdAt || sale.date);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === todayTimestamp;
    });
    
    console.log('📊 Loading today\'s sales:', todaySales.length, 'transactions');
    
    // Update summary cards
    updateTodaySalesSummary(todaySales);
    
    // Display sales table
    displayTodaySalesTable(todaySales);
}

// Update summary cards
function updateTodaySalesSummary(sales) {
    const totalSales = sales.length;
    let totalRevenue = 0;
    let cashSales = 0;
    let digitalSales = 0;
    
    sales.forEach(sale => {
        totalRevenue += sale.total || 0;
        
        if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'Cash') {
            cashSales += sale.total || 0;
        } else {
            digitalSales += sale.total || 0;
        }
    });
    
    // Update DOM
    const todaySalesCountEl = document.getElementById('todaySalesCount');
    const todaySalesRevenueEl = document.getElementById('todaySalesRevenue');
    const todayCashSalesEl = document.getElementById('todayCashSales');
    const todayDigitalSalesEl = document.getElementById('todayDigitalSales');
    
    if (todaySalesCountEl) todaySalesCountEl.textContent = totalSales;
    if (todaySalesRevenueEl) todaySalesRevenueEl.textContent = formatCurrency(totalRevenue);
    if (todayCashSalesEl) todayCashSalesEl.textContent = formatCurrency(cashSales);
    if (todayDigitalSalesEl) todayDigitalSalesEl.textContent = formatCurrency(digitalSales);
}

// Display sales in table
function displayTodaySalesTable(sales) {
    const tbody = document.getElementById('todaySalesTableBody');
    const emptyState = document.getElementById('todaySalesEmpty');
    
    if (!sales || sales.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Sort by date descending (newest first)
    sales.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = '';
    sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const timeString = saleDate.toLocaleTimeString('en-KE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const itemCount = sale.items ? sale.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        
        // Payment method badge
        let paymentBadge = '';
        if (sale.paymentMethod === 'cash') {
            paymentBadge = `<span class="sale-badge cash">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 6h20v12H2V6zm2 2v8h16V8H4zm8 6a3 3 0 100-6 3 3 0 000 6z"/>
                </svg>
                Cash
            </span>`;
        } else if (sale.paymentMethod === 'mpesa') {
            paymentBadge = `<span class="sale-badge mpesa">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                M-PESA
            </span>`;
        } else if (sale.paymentMethod === 'card') {
            paymentBadge = `<span class="sale-badge card">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 2v2H4V6h16zM4 18v-6h16v6H4z"/>
                </svg>
                Card
            </span>`;
        }
        
        html += `
            <tr>
                <td><strong>#${sale.saleNumber}</strong></td>
                <td>${timeString}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td><strong>KSh ${(sale.total || 0).toFixed(2)}</strong></td>
                <td>${paymentBadge}</td>
                <td>${sale.cashier || 'User'}</td>
                <td>
                    <div class="sale-actions">
                        <button class="action-btn view" onclick="viewSaleDetails(''${sale.saleNumber}'')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                            View
                        </button>
                        <button class="action-btn print" onclick="printSaleReceipt(''${sale.saleNumber}'')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                            </svg>
                            Print
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// View sale details
function viewSaleDetails(saleNumber) {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const sale = sales.find(s => s.saleNumber === saleNumber);
    
    if (!sale) {
        showToast('Sale not found', 'error');
        return;
    }
    
    // Create and show modal with sale details
    showSaleDetailsModal(sale);
}

// Show sale details modal
function showSaleDetailsModal(sale) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const saleDate = new Date(sale.date);
    const dateString = saleDate.toLocaleString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let itemsHtml = '';
    if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>KSh ${item.price.toFixed(2)}</td>
                    <td><strong>KSh ${item.subtotal.toFixed(2)}</strong></td>
                </tr>
            `;
        });
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Sale Details - #${sale.saleNumber}</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 20px; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
                        <div>
                            <strong>Date & Time:</strong><br>${dateString}
                        </div>
                        <div>
                            <strong>Cashier:</strong><br>${sale.cashier || 'User'}
                        </div>
                        <div>
                            <strong>Payment Method:</strong><br>${sale.paymentMethod.toUpperCase()}
                        </div>
                        <div>
                            <strong>Branch:</strong><br>${sale.branch || 'Main Branch'}
                        </div>
                    </div>
                </div>
                
                <h3 style="margin-bottom: 12px;">Items</h3>
                <table class="data-table" style="margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div style="padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Subtotal:</span>
                        <span>KSh ${sale.subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Discount (${sale.discount}%):</span>
                        <span>- KSh ${(sale.subtotal * sale.discount / 100).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span>Tax (${sale.tax}%):</span>
                        <span>KSh ${(sale.subtotal * (1 - sale.discount / 100) * sale.tax / 100).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid var(--border-color); font-size: 18px; font-weight: 700;">
                        <span>Total:</span>
                        <span style="color: var(--color-green);">KSh ${sale.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="this.closest(''.modal'').remove()">Close</button>
                <button class="btn-primary" onclick="printSaleReceipt(''${sale.saleNumber}''); this.closest(''.modal'').remove();">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                    </svg>
                    Print Receipt
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Print sale receipt
function printSaleReceipt(saleNumber) {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const sale = sales.find(s => s.saleNumber === saleNumber);
    
    if (!sale) {
        showToast('Sale not found', 'error');
        return;
    }
    
    // Use existing printReceipt function
    printReceipt(sale);
    showToast('Receipt sent to printer', 'success');
}

// Refresh today's sales
function refreshTodaySales() {
    loadTodaySales();
    showToast('Sales refreshed', 'success');
}

// ===========================
// Expose Functions to Window for onclick handlers
// ===========================
window.decreaseQuantity = decreaseQuantity;
window.increaseQuantity = increaseQuantity;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.showCheckoutModal = showCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.showManualAddModal = showManualAddModal;
window.closeManualAddModal = closeManualAddModal;
window.addManualProduct = addManualProduct;
window.processSale = processSale;
window.printReceipt = printReceipt;
window.viewSaleDetails = viewSaleDetails;
window.printSaleReceipt = printSaleReceipt;
window.refreshTodaySales = refreshTodaySales;
