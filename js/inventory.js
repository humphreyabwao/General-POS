// ===========================
// Inventory Module
// ===========================

// Initialize Inventory
function initializeInventory() {
    loadInventoryStats();
    loadInventoryTable();
    populateFilterDropdowns();
    initializeInventoryControls();
    
    // Refresh stats every minute
    setInterval(loadInventoryStats, 60000);
}

// Initialize Inventory Controls
function initializeInventoryControls() {
    // Search input - real-time filtering
    const searchInput = document.getElementById('inventorySearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadInventoryTable();
        }, 300));
    }
    
    // Filter dropdowns - real-time filtering
    const filterCategory = document.getElementById('inventoryFilterCategory');
    const filterSupplier = document.getElementById('inventoryFilterSupplier');
    const filterStock = document.getElementById('inventoryFilterStock');
    const filterDateFrom = document.getElementById('inventoryFilterDateFrom');
    const filterDateTo = document.getElementById('inventoryFilterDateTo');
    
    [filterCategory, filterSupplier, filterStock, filterDateFrom, filterDateTo].forEach(element => {
        if (element) {
            element.addEventListener('change', () => loadInventoryTable());
        }
    });
    
    // Clear filters button
    const clearBtn = document.getElementById('inventoryClearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            filterCategory.value = '';
            filterSupplier.value = '';
            filterStock.value = '';
            filterDateFrom.value = '';
            filterDateTo.value = '';
            loadInventoryTable();
        });
    }
    
    // Add Product button - Navigate to Add Item submenu
    const addBtn = document.getElementById('inventoryAddProduct');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            // Find and click the Add Item submenu
            const addItemSubmenu = document.querySelector('a[data-page="inventory-add-item"]');
            if (addItemSubmenu) {
                addItemSubmenu.click();
            }
        });
    }
    
    // Import button
    const importBtn = document.getElementById('inventoryImport');
    const importFile = document.getElementById('inventoryImportFile');
    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => {
            importFile.click();
        });
        
        importFile.addEventListener('change', (e) => {
            handleImportFile(e.target.files[0]);
        });
    }
    
    // Export button
    const exportBtn = document.getElementById('inventoryExport');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            showExportOptionsModal();
        });
    }
}

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

// Load Inventory Stats
async function loadInventoryStats() {
    try {
        // Load inventory items from Firebase/localStorage
        const inventoryItems = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        
        // Calculate Total Stock Value
        let totalValue = 0;
        let totalItems = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let expiredCount = 0;
        
        const today = new Date();
        
        inventoryItems.forEach(item => {
            const quantity = item.quantity || 0;
            const price = item.price || 0;
            const reorderLevel = item.reorderLevel || 10;
            const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
            
            // Total value and items
            totalValue += quantity * price;
            totalItems += quantity;
            
            // Low stock check
            if (quantity > 0 && quantity <= reorderLevel) {
                lowStockCount++;
            }
            
            // Out of stock check
            if (quantity === 0) {
                outOfStockCount++;
            }
            
            // Expired items check
            if (expiryDate && expiryDate < today && quantity > 0) {
                expiredCount++;
            }
        });
        
        // Update stat cards
        updateInventoryStat('inventoryTotalValue', totalValue);
        updateInventoryStat('inventoryTotalItems', totalItems);
        updateInventoryStat('inventoryLowStock', lowStockCount);
        updateInventoryStat('inventoryOutStock', outOfStockCount + expiredCount);
        updateInventoryStat('inventoryOutStockMeta', outOfStockCount, expiredCount);
        
        // Update dashboard stock value if on dashboard
        const dashboardStockValue = document.getElementById('stockValue');
        if (dashboardStockValue && window.Dashboard) {
            dashboardStockValue.textContent = window.Dashboard.formatKenyaShillings(totalValue);
        }
        
    } catch (error) {
        console.error('Error loading inventory stats:', error);
    }
}

// Update Inventory Stat
function updateInventoryStat(elementId, value, expiredCount = null) {
    const element = document.getElementById(elementId);
    
    if (!element) return;
    
    if (elementId === 'inventoryTotalValue') {
        element.textContent = formatKenyaShillings(value);
    } else if (elementId === 'inventoryTotalItems') {
        element.textContent = `${formatNumber(value)} items in stock`;
    } else if (elementId === 'inventoryOutStockMeta') {
        const outOfStock = value;
        const expired = expiredCount || 0;
        
        if (outOfStock === 0 && expired === 0) {
            element.textContent = 'All items in stock';
        } else {
            const parts = [];
            if (outOfStock > 0) parts.push(`${outOfStock} out of stock`);
            if (expired > 0) parts.push(`${expired} expired`);
            element.textContent = parts.join(', ');
        }
    } else {
        element.textContent = formatNumber(value);
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

// Add Inventory Item (to be called from Add Item form)
function addInventoryItem(itemData) {
    const inventoryItems = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    
    const newItem = {
        id: Date.now(),
        name: itemData.name,
        sku: itemData.sku || '',
        category: itemData.category || '',
        quantity: parseInt(itemData.quantity) || 0,
        price: parseFloat(itemData.price) || 0,
        cost: parseFloat(itemData.cost) || 0,
        reorderLevel: parseInt(itemData.reorderLevel) || 10,
        supplier: itemData.supplier || '',
        expiryDate: itemData.expiryDate || null,
        addedBy: itemData.addedBy || 'Admin',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    inventoryItems.push(newItem);
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    
    // Log activity
    if (window.Dashboard && window.Dashboard.addActivity) {
        window.Dashboard.addActivity(
            'product',
            `Added product: ${newItem.name}`,
            newItem.addedBy,
            'Inventory',
            `Qty: ${newItem.quantity}, Price: ${formatKenyaShillings(newItem.price)}`
        );
    }
    
    // Refresh stats
    loadInventoryStats();
    
    return newItem;
}

// Update Inventory Item
function updateInventoryItem(itemId, updateData) {
    const inventoryItems = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    const itemIndex = inventoryItems.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
        return { success: false, error: 'Item not found' };
    }
    
    const oldQuantity = inventoryItems[itemIndex].quantity;
    
    inventoryItems[itemIndex] = {
        ...inventoryItems[itemIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    
    // Log activity if quantity changed
    if (updateData.quantity !== undefined && updateData.quantity !== oldQuantity) {
        const item = inventoryItems[itemIndex];
        const difference = updateData.quantity - oldQuantity;
        const action = difference > 0 ? 'restocked' : 'reduced';
        
        if (window.Dashboard && window.Dashboard.addActivity) {
            window.Dashboard.addActivity(
                'inventory',
                `${action} ${item.name}`,
                'Admin',
                'Inventory',
                `Qty changed: ${oldQuantity} → ${updateData.quantity}`
            );
        }
    }
    
    // Refresh stats
    loadInventoryStats();
    
    return { success: true, item: inventoryItems[itemIndex] };
}

// Delete Inventory Item
function deleteInventoryItem(itemId) {
    const inventoryItems = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    const itemIndex = inventoryItems.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
        return { success: false, error: 'Item not found' };
    }
    
    const deletedItem = inventoryItems[itemIndex];
    inventoryItems.splice(itemIndex, 1);
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    
    // Log activity
    if (window.Dashboard && window.Dashboard.addActivity) {
        window.Dashboard.addActivity(
            'inventory',
            `Deleted product: ${deletedItem.name}`,
            'Admin',
            'Inventory',
            `Removed from inventory`
        );
    }
    
    // Refresh stats
    loadInventoryStats();
    
    return { success: true };
}

// Get Inventory Item by ID
function getInventoryItem(itemId) {
    const inventoryItems = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    return inventoryItems.find(item => item.id === itemId);
}

// Get All Inventory Items
function getAllInventoryItems() {
    return JSON.parse(localStorage.getItem('inventoryItems') || '[]');
}

// Get Low Stock Items
function getLowStockItems() {
    const items = getAllInventoryItems();
    return items.filter(item => {
        const quantity = item.quantity || 0;
        const reorderLevel = item.reorderLevel || 10;
        return quantity > 0 && quantity <= reorderLevel;
    });
}

// Get Out of Stock Items
function getOutOfStockItems() {
    const items = getAllInventoryItems();
    return items.filter(item => (item.quantity || 0) === 0);
}

// Get Expired Items
function getExpiredItems() {
    const items = getAllInventoryItems();
    const today = new Date();
    
    return items.filter(item => {
        if (!item.expiryDate) return false;
        const expiryDate = new Date(item.expiryDate);
        return expiryDate < today && (item.quantity || 0) > 0;
    });
}

// Load Inventory Table with Filters
function loadInventoryTable() {
    const items = getAllInventoryItems();
    const tbody = document.getElementById('inventoryTableBody');
    
    if (!tbody) return;
    
    // Get filter values
    const searchTerm = document.getElementById('inventorySearch')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('inventoryFilterCategory')?.value || '';
    const supplierFilter = document.getElementById('inventoryFilterSupplier')?.value || '';
    const stockFilter = document.getElementById('inventoryFilterStock')?.value || '';
    const dateFrom = document.getElementById('inventoryFilterDateFrom')?.value || '';
    const dateTo = document.getElementById('inventoryFilterDateTo')?.value || '';
    
    // Apply filters
    let filteredItems = items.filter(item => {
        // Search filter
        if (searchTerm) {
            const matchesSearch = 
                item.name?.toLowerCase().includes(searchTerm) ||
                item.sku?.toLowerCase().includes(searchTerm) ||
                item.barcode?.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
        }
        
        // Category filter
        if (categoryFilter && item.category !== categoryFilter) return false;
        
        // Supplier filter
        if (supplierFilter && item.supplier !== supplierFilter) return false;
        
        // Stock status filter
        if (stockFilter) {
            const status = getStockStatus(item);
            if (status !== stockFilter) return false;
        }
        
        // Date range filter
        if (dateFrom) {
            const itemDate = new Date(item.addedAt).toISOString().split('T')[0];
            if (itemDate < dateFrom) return false;
        }
        if (dateTo) {
            const itemDate = new Date(item.addedAt).toISOString().split('T')[0];
            if (itemDate > dateTo) return false;
        }
        
        return true;
    });
    
    // Update results count
    const resultsCount = document.getElementById('inventoryResultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Showing ${filteredItems.length} of ${items.length} products`;
    }
    
    // Render table
    if (filteredItems.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="10">
                    <div class="empty-state-content">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/>
                        </svg>
                        <p>${searchTerm || categoryFilter || supplierFilter || stockFilter ? 'No products match your filters' : 'No products in inventory'}</p>
                        ${!searchTerm && !categoryFilter && !supplierFilter && !stockFilter ? 
                            '<button class="btn-primary" onclick="document.getElementById(\'inventoryAddProduct\').click()">Add Your First Product</button>' : 
                            '<button class="btn-secondary" onclick="document.getElementById(\'inventoryClearFilters\').click()">Clear Filters</button>'}
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by name
    filteredItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    tbody.innerHTML = filteredItems.map(item => {
        const status = getStockStatus(item);
        const statusClass = getStatusClass(status);
        const statusText = getStatusText(status);
        const value = (item.quantity || 0) * (item.price || 0);
        const addedDate = new Date(item.addedAt).toLocaleDateString('en-KE', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        return `
            <tr>
                <td class="product-name">${item.name || 'N/A'}</td>
                <td>${item.sku || item.barcode || 'N/A'}</td>
                <td>${item.category || 'Uncategorized'}</td>
                <td>${formatNumber(item.quantity || 0)}</td>
                <td>${formatKenyaShillings(item.price || 0)}</td>
                <td>${formatKenyaShillings(value)}</td>
                <td>${item.supplier || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${addedDate}</td>
                <td>
                    <div class="table-actions">
                        <button class="table-action-btn view" onclick="window.Inventory.viewItem(${item.id})" title="View Details">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="table-action-btn edit" onclick="window.Inventory.editItem(${item.id})" title="Edit Product">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="table-action-btn delete" onclick="window.Inventory.confirmDelete(${item.id}, '${item.name?.replace(/'/g, "\\'")}', '${item.barcode?.replace(/'/g, "\\'")}', ${item.quantity || 0})" title="Delete Product">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get Stock Status
function getStockStatus(item) {
    const quantity = item.quantity || 0;
    const reorderLevel = item.reorderLevel || 10;
    const today = new Date();
    
    // Check if expired
    if (item.expiryDate) {
        const expiryDate = new Date(item.expiryDate);
        if (expiryDate < today && quantity > 0) {
            return 'expired';
        }
    }
    
    // Check stock levels
    if (quantity === 0) return 'out';
    if (quantity <= reorderLevel) return 'low';
    return 'ok';
}

// Get Status Class
function getStatusClass(status) {
    return status; // ok, low, out, expired
}

// Get Status Text
function getStatusText(status) {
    const statusMap = {
        'ok': 'In Stock',
        'low': 'Low Stock',
        'out': 'Out of Stock',
        'expired': 'Expired'
    };
    return statusMap[status] || 'Unknown';
}

// Populate Filter Dropdowns
function populateFilterDropdowns() {
    const items = getAllInventoryItems();
    
    // Get unique categories and suppliers
    const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort();
    const suppliers = [...new Set(items.map(item => item.supplier).filter(Boolean))].sort();
    
    // Populate category filter
    const categoryFilter = document.getElementById('inventoryFilterCategory');
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">All Categories</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
    
    // Populate supplier filter
    const supplierFilter = document.getElementById('inventoryFilterSupplier');
    if (supplierFilter) {
        supplierFilter.innerHTML = '<option value="">All Suppliers</option>' +
            suppliers.map(sup => `<option value="${sup}">${sup}</option>`).join('');
    }
}

// View Item Details
function viewItem(itemId) {
    const item = getInventoryItem(itemId);
    if (!item) return;
    
    const modal = createModal('View Product Details');
    const content = modal.querySelector('.modal-body');
    
    const status = getStockStatus(item);
    const statusClass = getStatusClass(status);
    const statusText = getStatusText(status);
    const value = (item.quantity || 0) * (item.price || 0);
    const profit = (item.price || 0) - (item.cost || 0);
    const margin = item.cost > 0 ? ((profit / item.price) * 100).toFixed(2) : 0;
    
    content.innerHTML = `
        <div class="view-details-grid">
            <div class="detail-section">
                <h4 class="detail-section-title">Basic Information</h4>
                <div class="detail-row">
                    <span class="detail-label">Product Name:</span>
                    <span class="detail-value">${item.name || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Category:</span>
                    <span class="detail-value">${item.category || 'Uncategorized'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Brand:</span>
                    <span class="detail-value">${item.brand || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">${item.description || 'No description'}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4 class="detail-section-title">Inventory Details</h4>
                <div class="detail-row">
                    <span class="detail-label">SKU:</span>
                    <span class="detail-value">${item.sku || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Barcode:</span>
                    <span class="detail-value">${item.barcode || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Quantity:</span>
                    <span class="detail-value"><strong>${formatNumber(item.quantity || 0)}</strong> ${item.unit || 'pcs'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Reorder Level:</span>
                    <span class="detail-value">${formatNumber(item.reorderLevel || 10)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value"><span class="status-badge ${statusClass}">${statusText}</span></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${item.location || 'N/A'}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4 class="detail-section-title">Pricing & Financials</h4>
                <div class="detail-row">
                    <span class="detail-label">Cost Price:</span>
                    <span class="detail-value">${formatKenyaShillings(item.cost || 0)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Selling Price:</span>
                    <span class="detail-value"><strong>${formatKenyaShillings(item.price || 0)}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Profit per Unit:</span>
                    <span class="detail-value" style="color: ${profit > 0 ? '#10b981' : '#ef4444'}">${formatKenyaShillings(profit)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Profit Margin:</span>
                    <span class="detail-value">${margin}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Value:</span>
                    <span class="detail-value"><strong>${formatKenyaShillings(value)}</strong></span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4 class="detail-section-title">Supplier Information</h4>
                <div class="detail-row">
                    <span class="detail-label">Supplier:</span>
                    <span class="detail-value">${item.supplier || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Contact:</span>
                    <span class="detail-value">${item.supplierContact || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Expiry Date:</span>
                    <span class="detail-value">${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-KE') : 'N/A'}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4 class="detail-section-title">Record Information</h4>
                <div class="detail-row">
                    <span class="detail-label">Added By:</span>
                    <span class="detail-value">${item.addedBy || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date Added:</span>
                    <span class="detail-value">${new Date(item.addedAt).toLocaleString('en-KE')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Last Updated:</span>
                    <span class="detail-value">${new Date(item.updatedAt).toLocaleString('en-KE')}</span>
                </div>
            </div>
        </div>
    `;
    
    const footer = modal.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn-primary" onclick="this.closest('.modal-overlay').remove(); window.Inventory.editItem(${itemId})">Edit Product</button>
    `;
    
    document.body.appendChild(modal);
}

// Edit Item
function editItem(itemId) {
    const item = getInventoryItem(itemId);
    if (!item) return;
    
    const modal = createModal('Edit Product');
    const content = modal.querySelector('.modal-body');
    
    content.innerHTML = `
        <form id="editItemForm" class="modal-form">
            <div class="form-grid-modal">
                <div class="form-group">
                    <label for="edit_productName" class="required">Product Name</label>
                    <input type="text" id="edit_productName" class="form-control" value="${item.name || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="edit_productCategory">Category</label>
                    <select id="edit_productCategory" class="form-control">
                        <option value="">Select Category</option>
                        <option value="Fashion" ${item.category === 'Fashion' ? 'selected' : ''}>Fashion & Clothing</option>
                        <option value="Electronics" ${item.category === 'Electronics' ? 'selected' : ''}>Electronics</option>
                        <option value="Home Decor" ${item.category === 'Home Decor' ? 'selected' : ''}>Home Decor</option>
                        <option value="Beauty" ${item.category === 'Beauty' ? 'selected' : ''}>Beauty & Cosmetics</option>
                        <option value="Food & Beverage" ${item.category === 'Food & Beverage' ? 'selected' : ''}>Food & Beverage</option>
                        <option value="Furniture" ${item.category === 'Furniture' ? 'selected' : ''}>Furniture</option>
                        <option value="Accessories" ${item.category === 'Accessories' ? 'selected' : ''}>Accessories</option>
                        <option value="Stationery" ${item.category === 'Stationery' ? 'selected' : ''}>Stationery</option>
                        <option value="Hardware" ${item.category === 'Hardware' ? 'selected' : ''}>Hardware</option>
                        <option value="Other" ${item.category === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="edit_productSKU">SKU</label>
                    <input type="text" id="edit_productSKU" class="form-control" value="${item.sku || ''}">
                </div>
                
                <div class="form-group">
                    <label for="edit_productBarcode">Barcode</label>
                    <input type="text" id="edit_productBarcode" class="form-control" value="${item.barcode || ''}">
                </div>
                
                <div class="form-group">
                    <label for="edit_productCost">Cost Price (KSh)</label>
                    <input type="number" id="edit_productCost" class="form-control" value="${item.cost || 0}" step="0.01" min="0">
                </div>
                
                <div class="form-group">
                    <label for="edit_productPrice" class="required">Selling Price (KSh)</label>
                    <input type="number" id="edit_productPrice" class="form-control" value="${item.price || 0}" step="0.01" min="0" required>
                </div>
                
                <div class="form-group">
                    <label for="edit_productQuantity" class="required">Quantity</label>
                    <input type="number" id="edit_productQuantity" class="form-control" value="${item.quantity || 0}" min="0" required>
                </div>
                
                <div class="form-group">
                    <label for="edit_productReorderLevel">Reorder Level</label>
                    <input type="number" id="edit_productReorderLevel" class="form-control" value="${item.reorderLevel || 10}" min="0">
                </div>
                
                <div class="form-group">
                    <label for="edit_productSupplier">Supplier</label>
                    <input type="text" id="edit_productSupplier" class="form-control" value="${item.supplier || ''}">
                </div>
                
                <div class="form-group">
                    <label for="edit_productLocation">Storage Location</label>
                    <input type="text" id="edit_productLocation" class="form-control" value="${item.location || ''}">
                </div>
            </div>
        </form>
    `;
    
    const footer = modal.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-primary" onclick="window.Inventory.saveEdit(${itemId})">Save Changes</button>
    `;
    
    document.body.appendChild(modal);
}

// Save Edit
function saveEdit(itemId) {
    const updateData = {
        name: document.getElementById('edit_productName').value.trim(),
        category: document.getElementById('edit_productCategory').value,
        sku: document.getElementById('edit_productSKU').value.trim(),
        barcode: document.getElementById('edit_productBarcode').value.trim(),
        cost: parseFloat(document.getElementById('edit_productCost').value) || 0,
        price: parseFloat(document.getElementById('edit_productPrice').value) || 0,
        quantity: parseInt(document.getElementById('edit_productQuantity').value) || 0,
        reorderLevel: parseInt(document.getElementById('edit_productReorderLevel').value) || 10,
        supplier: document.getElementById('edit_productSupplier').value.trim(),
        location: document.getElementById('edit_productLocation').value.trim()
    };
    
    if (!updateData.name || !updateData.price) {
        alert('Please fill in all required fields.');
        return;
    }
    
    const result = updateInventoryItem(itemId, updateData);
    
    if (result.success) {
        document.querySelector('.modal-overlay').remove();
        loadInventoryTable();
        showSuccessNotification(`Product "${updateData.name}" updated successfully!`);
    }
}

// Confirm Delete
function confirmDelete(itemId, itemName, barcode, quantity) {
    const modal = createModal('Delete Product', 'danger');
    const content = modal.querySelector('.modal-body');
    
    content.innerHTML = `
        <div class="delete-warning">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>Are you sure you want to delete this product?</h3>
            <div class="delete-details">
                <p><strong>Product:</strong> ${itemName}</p>
                ${barcode ? `<p><strong>Barcode:</strong> ${barcode}</p>` : ''}
                <p><strong>Current Stock:</strong> ${quantity} units</p>
            </div>
            <p class="delete-warning-text">⚠️ This action cannot be undone. All product data will be permanently removed.</p>
        </div>
    `;
    
    const footer = modal.querySelector('.modal-footer');
    footer.innerHTML = `
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-danger" onclick="window.Inventory.executeDelete(${itemId}, '${itemName.replace(/'/g, "\\'")}')">Delete Product</button>
    `;
    
    document.body.appendChild(modal);
}

// Execute Delete
function executeDelete(itemId, itemName) {
    const result = deleteInventoryItem(itemId);
    if (result.success) {
        document.querySelector('.modal-overlay').remove();
        loadInventoryTable();
        showSuccessNotification(`Product "${itemName}" deleted successfully!`);
    }
}

// Create Modal
function createModal(title, type = 'default') {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container ${type}">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer"></div>
        </div>
    `;
    return modal;
}

// Show Success Notification
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
        </svg>
        ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Show Export Options Modal
function showExportOptionsModal() {
    const modal = createModal('Export Inventory', 'export');
    
    const content = `
        <div class="export-options">
            <p style="margin-bottom: 24px; color: var(--text-secondary); font-size: 14px;">
                Choose your preferred export format:
            </p>
            <div class="export-format-grid">
                <button class="export-format-btn" onclick="window.Inventory.exportToCSV()">
                    <div class="export-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                    </div>
                    <div class="export-format-details">
                        <h4>CSV</h4>
                        <p>Comma-separated values</p>
                    </div>
                </button>
                
                <button class="export-format-btn" onclick="window.Inventory.exportToExcel()">
                    <div class="export-icon excel">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                            <line x1="9" y1="12" x2="15" y2="12"/>
                            <line x1="9" y1="18" x2="15" y2="18"/>
                        </svg>
                    </div>
                    <div class="export-format-details">
                        <h4>Excel</h4>
                        <p>Microsoft Excel format</p>
                    </div>
                </button>
                
                <button class="export-format-btn" onclick="window.Inventory.exportToPDF()">
                    <div class="export-icon pdf">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <path d="M10 12h4M10 16h4"/>
                        </svg>
                    </div>
                    <div class="export-format-details">
                        <h4>PDF</h4>
                        <p>Portable document format</p>
                    </div>
                </button>
            </div>
        </div>
    `;
    
    modal.querySelector('.modal-body').innerHTML = content;
    modal.querySelector('.modal-footer').innerHTML = `
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
    `;
    
    document.body.appendChild(modal);
}

// Export Inventory to CSV
function exportInventoryToCSV() {
    const items = getAllInventoryItems();
    
    if (items.length === 0) {
        alert('No inventory items to export.');
        return;
    }
    
    // CSV Headers
    const headers = ['Product Name', 'SKU/Barcode', 'Category', 'Quantity', 'Price', 'Cost', 'Value', 'Supplier', 'Reorder Level', 'Status', 'Expiry Date', 'Date Added'];
    
    // CSV Rows
    const rows = items.map(item => {
        const status = getStockStatus(item);
        const statusText = getStatusText(status);
        const value = (item.quantity || 0) * (item.price || 0);
        const addedDate = new Date(item.addedAt).toLocaleDateString('en-KE');
        const expiryDate = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-KE') : 'N/A';
        
        return [
            item.name || '',
            item.sku || item.barcode || '',
            item.category || '',
            item.quantity || 0,
            item.price || 0,
            item.cost || 0,
            value,
            item.supplier || '',
            item.reorderLevel || 10,
            statusText,
            expiryDate,
            addedDate
        ];
    });
    
    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Log activity
    if (window.Dashboard && window.Dashboard.addActivity) {
        window.Dashboard.addActivity(
            'report',
            'Exported inventory to CSV',
            'Admin',
            'Inventory',
            `${items.length} items exported`
        );
    }
    
    showSuccessNotification(`Successfully exported ${items.length} items to CSV!`);
    document.querySelector('.modal-overlay')?.remove();
}

// Export Inventory to Excel
function exportInventoryToExcel() {
    const items = getAllInventoryItems();
    
    if (items.length === 0) {
        alert('No inventory items to export.');
        return;
    }
    
    // Create Excel-compatible HTML table
    const headers = ['Product Name', 'SKU/Barcode', 'Category', 'Quantity', 'Price', 'Cost', 'Value', 'Supplier', 'Reorder Level', 'Status', 'Expiry Date', 'Date Added'];
    
    const rows = items.map(item => {
        const status = getStockStatus(item);
        const statusText = getStatusText(status);
        const value = (item.quantity || 0) * (item.price || 0);
        const addedDate = new Date(item.addedAt).toLocaleDateString('en-KE');
        const expiryDate = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-KE') : 'N/A';
        
        return {
            name: item.name || '',
            sku: item.sku || item.barcode || '',
            category: item.category || '',
            quantity: item.quantity || 0,
            price: item.price || 0,
            cost: item.cost || 0,
            value: value,
            supplier: item.supplier || '',
            reorderLevel: item.reorderLevel || 10,
            status: statusText,
            expiryDate: expiryDate,
            addedDate: addedDate
        };
    });
    
    // Create Excel HTML
    let excelHTML = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th { background-color: #2563eb; color: white; font-weight: bold; padding: 10px; border: 1px solid #ddd; }
                td { padding: 8px; border: 1px solid #ddd; }
                tr:nth-child(even) { background-color: #f9fafb; }
            </style>
        </head>
        <body>
            <table>
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            <td>${row.name}</td>
                            <td>${row.sku}</td>
                            <td>${row.category}</td>
                            <td>${row.quantity}</td>
                            <td>KSh ${row.price.toLocaleString()}</td>
                            <td>KSh ${row.cost.toLocaleString()}</td>
                            <td>KSh ${row.value.toLocaleString()}</td>
                            <td>${row.supplier}</td>
                            <td>${row.reorderLevel}</td>
                            <td>${row.status}</td>
                            <td>${row.expiryDate}</td>
                            <td>${row.addedDate}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    // Create download link
    const blob = new Blob([excelHTML], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${timestamp}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Log activity
    if (window.Dashboard && window.Dashboard.addActivity) {
        window.Dashboard.addActivity(
            'report',
            'Exported inventory to Excel',
            'Admin',
            'Inventory',
            `${items.length} items exported`
        );
    }
    
    showSuccessNotification(`Successfully exported ${items.length} items to Excel!`);
    document.querySelector('.modal-overlay')?.remove();
}

// Export Inventory to PDF
function exportInventoryToPDF() {
    const items = getAllInventoryItems();
    
    if (items.length === 0) {
        alert('No inventory items to export.');
        return;
    }
    
    // Create print window
    const printWindow = window.open('', '_blank');
    
    const headers = ['Product', 'SKU', 'Category', 'Qty', 'Price', 'Value', 'Supplier', 'Status'];
    
    const rows = items.map(item => {
        const status = getStockStatus(item);
        const statusText = getStatusText(status);
        const value = (item.quantity || 0) * (item.price || 0);
        
        return {
            name: item.name || '',
            sku: (item.sku || item.barcode || '').substring(0, 15),
            category: item.category || '',
            quantity: item.quantity || 0,
            price: item.price || 0,
            value: value,
            supplier: (item.supplier || '').substring(0, 15),
            status: statusText
        };
    });
    
    // Calculate totals
    const totalValue = rows.reduce((sum, item) => sum + item.value, 0);
    const totalItems = rows.reduce((sum, item) => sum + item.quantity, 0);
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Inventory Report - ${dateStr}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    padding: 30px;
                    font-size: 11px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #2563eb;
                }
                .header h1 {
                    font-size: 24px;
                    color: #1f2937;
                    margin-bottom: 8px;
                }
                .header p {
                    color: #6b7280;
                    font-size: 12px;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f9fafb;
                    border-radius: 8px;
                }
                .info-item {
                    display: flex;
                    flex-direction: column;
                }
                .info-label {
                    font-size: 10px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                .info-value {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1f2937;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 25px;
                }
                thead {
                    background: #2563eb;
                    color: white;
                }
                th {
                    padding: 10px 8px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                td {
                    padding: 10px 8px;
                    border-bottom: 1px solid #e5e7eb;
                }
                tbody tr:hover {
                    background: #f9fafb;
                }
                .status-ok { color: #059669; font-weight: 600; }
                .status-low { color: #f59e0b; font-weight: 600; }
                .status-out { color: #dc2626; font-weight: 600; }
                .status-expired { color: #991b1b; font-weight: 600; }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .summary {
                    display: flex;
                    gap: 30px;
                }
                .summary-item {
                    display: flex;
                    flex-direction: column;
                }
                .summary-label {
                    font-size: 10px;
                    color: #6b7280;
                    margin-bottom: 4px;
                }
                .summary-value {
                    font-size: 18px;
                    font-weight: 700;
                    color: #2563eb;
                }
                .text-right { text-align: right; }
                @media print {
                    body { padding: 15px; }
                    .no-print { display: none; }
                    @page { margin: 15mm; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📦 Inventory Report</h1>
                <p>Generated on ${dateStr} at ${timeStr}</p>
            </div>
            
            <div class="info-row">
                <div class="info-item">
                    <span class="info-label">Total Products</span>
                    <span class="info-value">${items.length}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Stock</span>
                    <span class="info-value">${totalItems.toLocaleString()} units</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Value</span>
                    <span class="info-value">KSh ${totalValue.toLocaleString()}</span>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => {
                        const statusClass = row.status.toLowerCase().replace(' ', '-').replace('/', '-');
                        return `
                            <tr>
                                <td>${row.name}</td>
                                <td>${row.sku}</td>
                                <td>${row.category}</td>
                                <td class="text-right">${row.quantity}</td>
                                <td class="text-right">KSh ${row.price.toLocaleString()}</td>
                                <td class="text-right">KSh ${row.value.toLocaleString()}</td>
                                <td>${row.supplier}</td>
                                <td><span class="status-${statusClass}">${row.status}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <div class="summary">
                    <div class="summary-item">
                        <span class="summary-label">Total Products</span>
                        <span class="summary-value">${items.length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Value</span>
                        <span class="summary-value">KSh ${totalValue.toLocaleString()}</span>
                    </div>
                </div>
                <button class="no-print" onclick="window.print()" style="
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                ">
                    🖨️ Print / Save as PDF
                </button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Log activity
    if (window.Dashboard && window.Dashboard.addActivity) {
        window.Dashboard.addActivity(
            'report',
            'Exported inventory to PDF',
            'Admin',
            'Inventory',
            `${items.length} items exported`
        );
    }
    
    showSuccessNotification(`PDF report opened in new window!`);
    document.querySelector('.modal-overlay')?.remove();
}

// Handle Import File
function handleImportFile(file) {
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        alert('Please upload a CSV or Excel file.');
        return;
    }
    
    if (fileName.endsWith('.csv')) {
        importCSVFile(file);
    } else {
        alert('Excel import requires additional library. CSV import is fully functional. Please convert your Excel file to CSV format.');
    }
}

// Import CSV File
function importCSVFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                alert('CSV file is empty or invalid.');
                return;
            }
            
            // Parse headers
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            
            // Expected headers (flexible)
            const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('product'));
            const skuIndex = headers.findIndex(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('barcode'));
            const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'));
            const quantityIndex = headers.findIndex(h => h.toLowerCase().includes('quantity') || h.toLowerCase().includes('qty'));
            const priceIndex = headers.findIndex(h => h.toLowerCase().includes('price') && !h.toLowerCase().includes('cost'));
            const costIndex = headers.findIndex(h => h.toLowerCase().includes('cost'));
            const supplierIndex = headers.findIndex(h => h.toLowerCase().includes('supplier'));
            const reorderIndex = headers.findIndex(h => h.toLowerCase().includes('reorder'));
            
            if (nameIndex === -1 || quantityIndex === -1 || priceIndex === -1) {
                alert('CSV must contain at least: Product Name, Quantity, and Price columns.');
                return;
            }
            
            let importedCount = 0;
            let errorCount = 0;
            
            // Parse data rows
            for (let i = 1; i < lines.length; i++) {
                try {
                    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
                    
                    if (values.length < headers.length) continue;
                    
                    const itemData = {
                        name: values[nameIndex],
                        sku: skuIndex !== -1 ? values[skuIndex] : '',
                        category: categoryIndex !== -1 ? values[categoryIndex] : '',
                        quantity: quantityIndex !== -1 ? values[quantityIndex] : '0',
                        price: priceIndex !== -1 ? values[priceIndex] : '0',
                        cost: costIndex !== -1 ? values[costIndex] : '0',
                        supplier: supplierIndex !== -1 ? values[supplierIndex] : '',
                        reorderLevel: reorderIndex !== -1 ? values[reorderIndex] : '10',
                        addedBy: 'CSV Import'
                    };
                    
                    if (itemData.name) {
                        addInventoryItem(itemData);
                        importedCount++;
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error importing row ${i}:`, error);
                }
            }
            
            loadInventoryTable();
            populateFilterDropdowns();
            
            alert(`Import completed!\nSuccessfully imported: ${importedCount} items\nErrors: ${errorCount}`);
            
            // Log activity
            if (window.Dashboard && window.Dashboard.addActivity) {
                window.Dashboard.addActivity(
                    'product',
                    'Imported products from CSV',
                    'Admin',
                    'Inventory',
                    `${importedCount} items imported`
                );
            }
            
        } catch (error) {
            console.error('Error parsing CSV:', error);
            alert('Error parsing CSV file. Please check the file format.');
        }
    };
    
    reader.readAsText(file);
}

// Export functions
window.Inventory = {
    initialize: initializeInventory,
    loadStats: loadInventoryStats,
    loadTable: loadInventoryTable,
    addItem: addInventoryItem,
    updateItem: updateInventoryItem,
    deleteItem: deleteInventoryItem,
    viewItem: viewItem,
    editItem: editItem,
    saveEdit: saveEdit,
    confirmDelete: confirmDelete,
    executeDelete: executeDelete,
    getItem: getInventoryItem,
    getAllItems: getAllInventoryItems,
    getLowStock: getLowStockItems,
    getOutOfStock: getOutOfStockItems,
    getExpired: getExpiredItems,
    exportToCSV: exportInventoryToCSV,
    exportToExcel: exportInventoryToExcel,
    exportToPDF: exportInventoryToPDF,
    formatKenyaShillings,
    formatNumber
};

// Auto-initialize when inventory module is shown
document.addEventListener('DOMContentLoaded', () => {
    // Initialize if inventory module is active
    const inventoryModule = document.getElementById('inventory-module');
    if (inventoryModule && inventoryModule.classList.contains('active')) {
        initializeInventory();
    }
    
    // Watch for module changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'inventory-module' && 
                mutation.target.classList.contains('active')) {
                initializeInventory();
            }
        });
    });
    
    if (inventoryModule) {
        observer.observe(inventoryModule, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
});
