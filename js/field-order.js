// Field Order JavaScript
// Standalone B2B order form for field marketers

let cart = [];
let products = [];
let searchTimeout = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Field Order Form Initialized');
    initializeFieldOrder();
});

function initializeFieldOrder() {
    loadProducts();
    setupSearchFunction();
    setupManualEntry();
    setupCalculations();
    setupSubmitButton();
    setupResetButton();
}

// Load Products from Firebase
function loadProducts() {
    const db = firebase.database();
    db.ref('products').on('value', (snapshot) => {
        products = [];
        snapshot.forEach((childSnapshot) => {
            const product = {
                id: childSnapshot.key,
                ...childSnapshot.val()
            };
            products.push(product);
        });
        console.log(`✅ Loaded ${products.length} products`);
    });
}

// Setup Product Search
function setupSearchFunction() {
    const searchInput = document.getElementById('productSearch');
    const resultsDiv = document.getElementById('searchResults');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        clearTimeout(searchTimeout);

        if (query.length < 2) {
            resultsDiv.classList.remove('active');
            return;
        }

        searchTimeout = setTimeout(() => {
            const filtered = products.filter(p => 
                p.name?.toLowerCase().includes(query) ||
                p.sku?.toLowerCase().includes(query)
            );

            displaySearchResults(filtered);
        }, 300);
    });
}

// Display Search Results
function displaySearchResults(results) {
    const resultsDiv = document.getElementById('searchResults');

    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item">No products found</div>';
        resultsDiv.classList.add('active');
        return;
    }

    const html = results.map(product => `
        <div class="search-result-item" onclick="addProductToCart('${product.id}')">
            <div class="result-info">
                <div class="result-name">${product.name}</div>
                <div class="result-sku">${product.sku || 'N/A'}</div>
            </div>
            <div class="result-price">${formatCurrency(product.price || 0)}</div>
        </div>
    `).join('');

    resultsDiv.innerHTML = html;
    resultsDiv.classList.add('active');
}

// Add Product to Cart
function addProductToCart(productId) {
    const product = products.find(p => p.id === productId);

    if (!product) {
        showToast('Product not found', 'error');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            sku: product.sku || '',
            price: product.price || 0,
            quantity: 1,
            description: product.description || ''
        });
    }

    document.getElementById('productSearch').value = '';
    document.getElementById('searchResults').classList.remove('active');

    updateCart();
    showToast('Product added to cart', 'success');
}

// Setup Manual Entry
function setupManualEntry() {
    const manualBtn = document.getElementById('manualAddBtn');
    const modal = document.getElementById('manualProductModal');
    const addBtn = document.getElementById('addManualProductBtn');

    manualBtn.addEventListener('click', () => {
        modal.classList.add('show');
    });

    addBtn.addEventListener('click', addManualProduct);
}

// Add Manual Product
function addManualProduct() {
    const name = document.getElementById('manualProductName').value.trim();
    const price = parseFloat(document.getElementById('manualProductPrice').value || 0);
    const quantity = parseInt(document.getElementById('manualProductQty').value || 1);
    const description = document.getElementById('manualProductDesc').value.trim();

    if (!name) {
        showToast('Please enter product name', 'error');
        return;
    }

    if (price <= 0) {
        showToast('Please enter a valid price', 'error');
        return;
    }

    cart.push({
        id: `manual_${Date.now()}`,
        name,
        sku: 'MANUAL',
        price,
        quantity,
        description,
        isManual: true
    });

    // Reset modal
    document.getElementById('manualProductName').value = '';
    document.getElementById('manualProductPrice').value = '';
    document.getElementById('manualProductQty').value = '1';
    document.getElementById('manualProductDesc').value = '';

    closeManualModal();
    updateCart();
    showToast('Manual product added', 'success');
}

// Close Manual Modal
function closeManualModal() {
    document.getElementById('manualProductModal').classList.remove('show');
}

// Update Cart Display
function updateCart() {
    const cartBody = document.getElementById('cartBody');
    const cartCount = document.getElementById('cartCount');

    if (cart.length === 0) {
        cartBody.innerHTML = `
            <tr class="empty-cart-row">
                <td colspan="5" style="text-align: center; padding: 40px; color: #9ca3af;">
                    <p>No items in cart</p>
                    <span style="font-size: 12px;">Search and add products to create an order</span>
                </td>
            </tr>
        `;
        cartCount.textContent = '0 items';
    } else {
        const html = cart.map((item, index) => `
            <tr>
                <td>
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-sku">${item.sku}</div>
                </td>
                <td>${formatCurrency(item.price)}</td>
                <td>
                    <div class="quantity-controls">
                        <button class="qty-btn" onclick="updateQuantity(${index}, -1)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <input type="number" class="qty-input" value="${item.quantity}" min="1" 
                            onchange="setQuantity(${index}, this.value)">
                        <button class="qty-btn" onclick="updateQuantity(${index}, 1)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </td>
                <td><strong>${formatCurrency(item.price * item.quantity)}</strong></td>
                <td>
                    <button class="remove-item-btn" onclick="removeItem(${index})" title="Remove">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m3 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6h14z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');

        cartBody.innerHTML = html;
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    }

    updateCalculations();
}

// Update Quantity
function updateQuantity(index, change) {
    cart[index].quantity = Math.max(1, cart[index].quantity + change);
    updateCart();
}

// Set Quantity
function setQuantity(index, value) {
    const qty = parseInt(value);
    if (qty > 0) {
        cart[index].quantity = qty;
        updateCart();
    }
}

// Remove Item
function removeItem(index) {
    cart.splice(index, 1);
    updateCart();
    showToast('Item removed from cart', 'success');
}

// Setup Calculations
function setupCalculations() {
    const discountInput = document.getElementById('discountPercent');
    const taxInput = document.getElementById('taxPercent');

    discountInput.addEventListener('input', updateCalculations);
    taxInput.addEventListener('input', updateCalculations);
}

// Update Calculations
function updateCalculations() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('discountPercent').value || 0);
    const taxPercent = parseFloat(document.getElementById('taxPercent').value || 0);

    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    const grandTotal = afterDiscount + taxAmount;

    document.getElementById('subtotalDisplay').textContent = formatCurrency(subtotal);
    document.getElementById('discountDisplay').textContent = formatCurrency(discountAmount);
    document.getElementById('taxDisplay').textContent = formatCurrency(taxAmount);
    document.getElementById('grandTotalDisplay').textContent = formatCurrency(grandTotal);
}

// Setup Submit Button
function setupSubmitButton() {
    const submitBtn = document.getElementById('submitOrderBtn');
    submitBtn.addEventListener('click', submitOrder);

    const createAnotherBtn = document.getElementById('createAnotherBtn');
    createAnotherBtn.addEventListener('click', () => {
        document.getElementById('successMessage').classList.remove('show');
        document.getElementById('orderFormSection').style.display = 'block';
        resetForm();
    });

    // Track Order Button (Placeholder for future implementation)
    const trackOrderBtn = document.getElementById('trackOrderBtn');
    if (trackOrderBtn) {
        trackOrderBtn.addEventListener('click', () => {
            showToast('Order tracking feature coming soon!', 'success');
            // TODO: Implement order tracking functionality
        });
    }
}

// Submit Order
async function submitOrder() {
    const customerName = document.getElementById('customerName').value.trim();
    const customerCompany = document.getElementById('customerCompany').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerEmail = document.getElementById('customerEmail').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();
    const attendant = document.getElementById('attendant').value.trim();
    const promoMessage = document.getElementById('promoMessage').value.trim();

    // Validation
    if (!customerName) {
        showToast('Please enter customer name', 'error');
        return;
    }

    if (!customerPhone) {
        showToast('Please enter customer phone', 'error');
        return;
    }

    if (!attendant) {
        showToast('Please enter marketer name', 'error');
        return;
    }

    if (cart.length === 0) {
        showToast('Please add items to cart', 'error');
        return;
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('discountPercent').value || 0);
    const taxPercent = parseFloat(document.getElementById('taxPercent').value || 0);

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
        items: cart,
        subtotal,
        discount: discountAmount,
        discountPercent,
        tax: taxAmount,
        taxPercent,
        attendant: attendant,
        total: grandTotal,
        promoMessage,
        status: 'pending',
        source: 'field-marketing',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toISOString()
    };

    // Save to Firebase
    try {
        const db = firebase.database();
        
        // Get count of existing orders to generate sequential ID
        const ordersSnapshot = await db.ref('b2bOrders').once('value');
        const orderCount = ordersSnapshot.numChildren();
        const orderNumber = orderCount + 1;
        
        // Add order number to order object
        order.orderNumber = orderNumber;
        
        const orderRef = await db.ref('b2bOrders').push(order);
        const orderId = orderRef.key;

        showToast('Order submitted successfully!', 'success');

        // Display order ID in success message
        const orderIdDisplay = document.getElementById('orderIdDisplay');
        if (orderIdDisplay) {
            orderIdDisplay.textContent = formatOrderId(orderNumber);
        }

        // Show success message
        document.getElementById('orderFormSection').style.display = 'none';
        document.getElementById('successMessage').classList.add('show');

    } catch (error) {
        console.error('Error submitting order:', error);
        showToast('Error submitting order. Please try again.', 'error');
    }
}

// Format Order ID (B2B format - matches main system)
function formatOrderId(orderNumber) {
    if (!orderNumber) return 'N/A';
    
    // If it's already a number, format it
    if (typeof orderNumber === 'number') {
        return `B2B-${String(orderNumber).padStart(3, '0')}`;
    }
    
    // If it's a string with a number, extract and format
    const numMatch = String(orderNumber).match(/\d+/);
    if (numMatch) {
        const num = parseInt(numMatch[0]);
        return `B2B-${String(num).padStart(3, '0')}`;
    }
    
    // Fallback
    return `B2B-${String(orderNumber).slice(0, 3).padStart(3, '0')}`;
}

// Setup Reset Button
function setupResetButton() {
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
            resetForm();
        }
    });
}

// Reset Form
function resetForm() {
    cart = [];
    document.getElementById('customerName').value = '';
    document.getElementById('customerCompany').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('attendant').value = '';
    document.getElementById('discountPercent').value = '0';
    document.getElementById('taxPercent').value = '0';
    document.getElementById('promoMessage').value = 'Thank you for your business!';
    document.getElementById('productSearch').value = '';

    updateCart();
    showToast('Form reset', 'success');
}

// Format Currency
function formatCurrency(amount) {
    return 'KSh ' + parseFloat(amount || 0).toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Show Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
