// ===========================
// Customers Module - Management
// ===========================

let customersCache = [];
let filteredCustomers = [];
let customersListener = null;
let currentEditingCustomerId = null;

// Filter state
const CustomersFilterState = {
    searchTerm: '',
    status: '', // all, active, inactive
    sortBy: 'newest', // newest, oldest, name-asc, name-desc
};

// ===========================
// Initialize Customers Module
// ===========================
function initializeCustomersModule() {
    console.log('✅ Initializing Customers Module');
    
    // Set up real-time listener
    setupCustomersRealtimeListener();
    
    // Initialize UI elements
    initializeCustomersSearchbar();
    initializeCustomersFilters();
    initializeCustomersActions();
    
    // Listen to state events
    StateEvents.on('customers:updated', () => {
        console.log('👥 Customers data updated, refreshing view');
        applyCustomersFiltersAndDisplay();
    });
    
    // Listen for customer order updates from other modules
    StateEvents.on('customerOrderUpdated', (data) => {
        const { customerId, totalOrders } = data;
        console.log(`📊 Customer order updated: ${customerId} -> ${totalOrders} orders`);
        updateCustomerOrderCountDisplay(customerId, totalOrders);
    });
    
    // Load initial data if available
    if (AppState.isInitialized && AppState.customers && AppState.customers.length > 0) {
        customersCache = [...AppState.customers];
        applyCustomersFiltersAndDisplay();
    }
}

// ===========================
// Real-time Customers Listener
// ===========================
function setupCustomersRealtimeListener() {
    console.log('🔄 Setting up real-time customers listener');
    
    try {
        if (customersListener) {
            customersListener = null;
        }
        
        // Initialize customers in AppState if not exists
        if (!AppState.customers) {
            AppState.customers = [];
        }
        
        // Listen to customers updates
        customersListener = database.ref('customers').on('value', (snapshot) => {
            const data = snapshot.val();
            let customers = [];
            
            if (data) {
                customers = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
            }
            
            console.log('👥 Real-time customers update received:', customers.length, 'customers');
            customersCache = customers;
            AppState.customers = customers;
            
            // Update dashboard stats
            updateCustomersStats();
            
            // Emit event for other modules
            StateEvents.emit('customers:updated', customers);
            
            // Refresh the display
            applyCustomersFiltersAndDisplay();
            
        }, (error) => {
            console.error('❌ Error listening to customers:', error);
            showToast('Error loading customers data', 'error', 3000);
        });
        
    } catch (error) {
        console.error('❌ Error setting up customers listener:', error);
    }
}

// ===========================
// Search Bar Initialization
// ===========================
function initializeCustomersSearchbar() {
    const searchInput = document.getElementById('customersSearchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            CustomersFilterState.searchTerm = e.target.value.trim().toLowerCase();
            applyCustomersFiltersAndDisplay();
        }, 300));
    }
}

// ===========================
// Filters Initialization
// ===========================
function initializeCustomersFilters() {
    // Status filter
    const statusFilter = document.getElementById('customersFilterStatus');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            CustomersFilterState.status = e.target.value;
            applyCustomersFiltersAndDisplay();
        });
    }
    
    // Sort filter
    const sortFilter = document.getElementById('customersFilterSort');
    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            CustomersFilterState.sortBy = e.target.value;
            applyCustomersFiltersAndDisplay();
        });
    }
}

// ===========================
// Actions Initialization
// ===========================
function initializeCustomersActions() {
    // Add new customer button
    const addNewCustomerBtn = document.getElementById('addNewCustomerBtn');
    if (addNewCustomerBtn) {
        addNewCustomerBtn.addEventListener('click', () => {
            openAddCustomerForm();
        });
    }
    
    // Export button and dropdown
    const exportBtn = document.getElementById('exportCustomersBtn');
    const exportDropdown = document.querySelector('.export-dropdown-menu');
    
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
        document.querySelectorAll('.export-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                exportDropdown.classList.remove('active');
                
                if (format === 'excel') {
                    exportCustomersToExcel();
                } else if (format === 'pdf') {
                    exportCustomersToPDF();
                }
            });
        });
    }
    
    // Empty state add button
    const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
    if (emptyStateAddBtn) {
        emptyStateAddBtn.addEventListener('click', () => {
            openAddCustomerForm();
        });
    }
    
    // Cancel button
    const cancelCustomerBtn = document.getElementById('cancelCustomerBtn');
    if (cancelCustomerBtn) {
        cancelCustomerBtn.addEventListener('click', () => {
            closeCustomerForm();
        });
    }
    
    // Form submission
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', handleCustomerFormSubmit);
    }
    
    // Customer type toggle buttons
    initializeCustomerTypeToggle();
}

// ===========================
// Customer Type Toggle
// ===========================
function initializeCustomerTypeToggle() {
    const toggleIndividual = document.getElementById('toggleIndividual');
    const toggleCompany = document.getElementById('toggleCompany');
    const individualFields = document.getElementById('individualFields');
    const companyFields = document.getElementById('companyFields');
    
    if (toggleIndividual && toggleCompany) {
        toggleIndividual.addEventListener('click', () => {
            toggleIndividual.classList.add('active');
            toggleCompany.classList.remove('active');
            if (individualFields) individualFields.style.display = 'block';
            if (companyFields) companyFields.style.display = 'none';
            
            // Clear and adjust required fields
            document.getElementById('customerName').required = true;
            if (document.getElementById('companyName')) {
                document.getElementById('companyName').required = false;
            }
        });
        
        toggleCompany.addEventListener('click', () => {
            toggleCompany.classList.add('active');
            toggleIndividual.classList.remove('active');
            if (individualFields) individualFields.style.display = 'none';
            if (companyFields) companyFields.style.display = 'block';
            
            // Clear and adjust required fields
            document.getElementById('customerName').required = false;
            if (document.getElementById('companyName')) {
                document.getElementById('companyName').required = true;
            }
        });
    }
}

// ===========================
// Apply Filters and Display
// ===========================
function applyCustomersFiltersAndDisplay() {
    // Start with all customers
    filteredCustomers = [...customersCache];
    
    // Apply search filter
    if (CustomersFilterState.searchTerm) {
        filteredCustomers = filteredCustomers.filter(customer => {
            const searchTerm = CustomersFilterState.searchTerm;
            return (
                customer.name?.toLowerCase().includes(searchTerm) ||
                customer.email?.toLowerCase().includes(searchTerm) ||
                customer.phone?.toLowerCase().includes(searchTerm)
            );
        });
    }
    
    // Apply status filter
    if (CustomersFilterState.status) {
        filteredCustomers = filteredCustomers.filter(customer => 
            customer.status === CustomersFilterState.status
        );
    }
    
    // Apply sorting
    sortCustomers();
    
    // Display results
    displayCustomersTable();
    updateCustomersStats();
}

// ===========================
// Sort Customers
// ===========================
function sortCustomers() {
    const sortBy = CustomersFilterState.sortBy;
    
    switch (sortBy) {
        case 'newest':
            filteredCustomers.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });
            break;
        case 'oldest':
            filteredCustomers.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateA - dateB;
            });
            break;
        case 'name-asc':
            filteredCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'name-desc':
            filteredCustomers.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            break;
    }
}

// ===========================
// Display Customers Table
// ===========================
function displayCustomersTable() {
    const tableBody = document.getElementById('customersTableBody');
    const emptyState = document.getElementById('customersEmptyState');
    const table = document.querySelector('.customers-table');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (filteredCustomers.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'flex';
        }
        if (table) {
            table.style.display = 'none';
        }
        return;
    }
    
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    if (table) {
        table.style.display = 'table';
    }
    
    filteredCustomers.forEach(customer => {
        const row = createCustomerTableRow(customer);
        tableBody.appendChild(row);
    });
}

// ===========================
// Create Customer Table Row
// ===========================
function createCustomerTableRow(customer) {
    const tr = document.createElement('tr');
    
    const statusClass = customer.status === 'active' ? 'active' : 'inactive';
    const statusText = customer.status === 'active' ? 'Active' : 'Inactive';
    
    // Add company indicator if applicable
    const companyBadge = customer.isCompany ? '<span style="font-size: 11px; background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Company</span>' : '';
    
    tr.innerHTML = `
        <td class="customer-name">${escapeHtml(customer.name || 'N/A')}${companyBadge}</td>
        <td class="customer-email">${escapeHtml(customer.email || '-')}</td>
        <td class="customer-phone">${escapeHtml(customer.phone || '-')}</td>
        <td>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td>${customer.totalOrders || 0}</td>
        <td>KES ${formatCurrency(customer.totalSpent || 0)}</td>
        <td>
            <div class="table-action-buttons">
                <button class="action-btn action-view" data-customer-id="${customer.id}" title="View Details">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
                <button class="action-btn action-edit" data-customer-id="${customer.id}" title="Edit Customer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="action-btn action-whatsapp" data-customer-id="${customer.id}" title="Send WhatsApp Message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                </button>
                <button class="action-btn action-delete" data-customer-id="${customer.id}" title="Delete Customer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        </td>
    `;
    
    // Attach event listeners
    attachRowEventListeners(tr, customer);
    
    return tr;
}

// ===========================
// Attach Row Event Listeners
// ===========================
function attachRowEventListeners(row, customer) {
    // View button
    const viewBtn = row.querySelector('.action-view');
    console.log('🔍 Attaching listeners. View button found:', !!viewBtn, 'Customer:', customer?.name || customer?.id);
    
    if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('👁️ View button clicked for customer:', customer);
            try {
                viewCustomerDetails(customer);
            } catch (error) {
                console.error('❌ Error opening customer details:', error);
                showToast('Error opening customer details', 'error', 2000);
            }
        });
    } else {
        console.error('❌ View button not found in row!');
    }
    
    // Edit button
    const editBtn = row.querySelector('.action-edit');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('✏️ Edit button clicked');
            editCustomer(customer);
        });
    }
    
    // WhatsApp button
    const whatsappBtn = row.querySelector('.action-whatsapp');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('💬 WhatsApp button clicked');
            sendWhatsAppMessage(customer);
        });
    }
    
    // Delete button
    const deleteBtn = row.querySelector('.action-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🗑️ Delete button clicked');
            deleteCustomer(customer);
        });
    }
}

// ===========================
// Update Customers Stats
// ===========================
function updateCustomersStats() {
    const totalEl = document.getElementById('customersTotal');
    const activeEl = document.getElementById('customersActive');
    const inactiveEl = document.getElementById('customersInactive');
    
    if (totalEl) {
        totalEl.textContent = customersCache.length;
    }
    
    if (activeEl) {
        const active = customersCache.filter(c => c.status === 'active').length;
        activeEl.textContent = active;
    }
    
    if (inactiveEl) {
        const inactive = customersCache.filter(c => c.status === 'inactive').length;
        inactiveEl.textContent = inactive;
    }
    
    // Update dashboard stats in real-time
    updateDashboardCustomerStats();
}

// ===========================
// Update Dashboard Customer Stats
// ===========================
function updateDashboardCustomerStats() {
    const dashboardTotal = document.getElementById('totalCustomers');
    if (dashboardTotal) {
        dashboardTotal.textContent = customersCache.length;
        console.log('📊 Dashboard customer stat updated:', customersCache.length);
    }
    
    // Update AppState
    if (AppState.stats) {
        AppState.stats.totalCustomers = customersCache.length;
    }
    
    // Emit event for other modules that may need this
    StateEvents.emit('customers:stats:updated', {
        total: customersCache.length,
        active: customersCache.filter(c => c.status === 'active').length,
        inactive: customersCache.filter(c => c.status === 'inactive').length
    });
}

// ===========================
// Open Add Customer Form
// ===========================
function openAddCustomerForm() {
    currentEditingCustomerId = null;
    const title = document.getElementById('addCustomerTitle');
    if (title) {
        title.textContent = 'Add New Customer';
    }
    
    // Clear form
    resetCustomerForm();
    
    // Navigate to form
    const link = document.querySelector('[data-page="customers-add"]');
    if (link) {
        link.click();
    }
}

// ===========================
// Edit Customer
// ===========================
function editCustomer(customer) {
    currentEditingCustomerId = customer.id;
    const title = document.getElementById('addCustomerTitle');
    if (title) {
        title.textContent = 'Edit Customer';
    }
    
    // Handle company vs individual
    const toggleIndividual = document.getElementById('toggleIndividual');
    const toggleCompany = document.getElementById('toggleCompany');
    const individualFields = document.getElementById('individualFields');
    const companyFields = document.getElementById('companyFields');
    
    if (customer.isCompany) {
        // Switch to company mode
        if (toggleCompany) {
            toggleCompany.click();
        }
        
        // Populate company fields
        if (document.getElementById('companyName')) {
            document.getElementById('companyName').value = customer.name || '';
        }
        if (customer.companyInfo) {
            if (document.getElementById('companyContactPerson')) {
                document.getElementById('companyContactPerson').value = customer.companyInfo.contactPerson || '';
            }
            if (document.getElementById('companyRegistration')) {
                document.getElementById('companyRegistration').value = customer.companyInfo.registrationNumber || '';
            }
        }
    } else {
        // Switch to individual mode
        if (toggleIndividual) {
            toggleIndividual.click();
        }
        
        // Populate individual fields
        document.getElementById('customerName').value = customer.name || '';
    }
    
    // Populate common fields
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerAddress').value = customer.address || '';
    document.getElementById('customerCity').value = customer.city || '';
    if (document.getElementById('customerCountry')) {
        document.getElementById('customerCountry').value = customer.country || 'Kenya';
    }
    document.getElementById('customerStatus').value = customer.status || 'active';
    document.getElementById('customerType').value = customer.type || 'retail';
    document.getElementById('customerNotes').value = customer.notes || '';
    
    // Navigate to form
    const link = document.querySelector('[data-page="customers-add"]');
    if (link) {
        link.click();
    }
}

// ===========================
// Handle Customer Form Submit
// ===========================
async function handleCustomerFormSubmit(e) {
    e.preventDefault();
    
    // Check if it's individual or company
    const toggleIndividual = document.getElementById('toggleIndividual');
    const isIndividual = toggleIndividual?.classList.contains('active');
    
    // Get form values
    let name = '';
    let isCompany = false;
    let companyInfo = {};
    
    if (isIndividual) {
        name = document.getElementById('customerName').value.trim();
    } else {
        name = document.getElementById('companyName').value.trim();
        isCompany = true;
        companyInfo = {
            contactPerson: document.getElementById('companyContactPerson')?.value.trim() || '',
            registrationNumber: document.getElementById('companyRegistration')?.value.trim() || ''
        };
    }
    
    const email = document.getElementById('customerEmail').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const city = document.getElementById('customerCity').value.trim();
    const country = document.getElementById('customerCountry')?.value.trim() || 'Kenya';
    const status = document.getElementById('customerStatus').value;
    const type = document.getElementById('customerType').value;
    const notes = document.getElementById('customerNotes').value.trim();
    
    // Validation
    if (!name || !phone) {
        showToast('Please fill in all required fields', 'error', 3000);
        return;
    }
    
    // Show loading state
    const saveBtn = document.querySelector('.btn-save');
    const saveBtnText = document.getElementById('saveButtonText');
    const originalText = saveBtnText.textContent;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtnText.textContent = 'Saving...';
    }
    
    try {
        const customerData = {
            name,
            email,
            phone,
            address,
            city,
            country,
            status,
            type,
            notes,
            isCompany,
            updatedAt: new Date().toISOString()
        };
        
        // Add company info if applicable
        if (isCompany) {
            customerData.companyInfo = companyInfo;
        }
        
        if (currentEditingCustomerId) {
            // Update existing customer
            await database.ref(`customers/${currentEditingCustomerId}`).update(customerData);
            showToast('Customer updated successfully', 'success', 2000);
            console.log('✅ Customer updated:', currentEditingCustomerId);
        } else {
            // Add new customer
            customerData.createdAt = new Date().toISOString();
            customerData.totalOrders = 0;
            customerData.totalSpent = 0;
            
            const newRef = database.ref('customers').push();
            await newRef.set(customerData);
            showToast('Customer added successfully', 'success', 2000);
            console.log('✅ New customer added:', newRef.key);
        }
        
        // Force update dashboard stats
        updateDashboardCustomerStats();
        
        // Reset form and close
        resetCustomerForm();
        closeCustomerForm();
        
    } catch (error) {
        console.error('❌ Error saving customer:', error);
        showToast('Error saving customer: ' + error.message, 'error', 3000);
    } finally {
        // Reset button state
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtnText.textContent = originalText;
        }
    }
}

// ===========================
// Update Order Count Display
// ===========================
function updateCustomerOrderCountDisplay(customerId, totalOrders) {
    // Find the row for this customer
    const tableBody = document.querySelector('#customersTableBody');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const viewBtn = row.querySelector('.action-view');
        if (viewBtn && viewBtn.dataset.customerId === customerId) {
            const orderCell = row.cells[4]; // Total Orders column
            if (orderCell) {
                orderCell.textContent = totalOrders;
                
                // Add animation
                orderCell.classList.add('count-updated');
                setTimeout(() => {
                    orderCell.classList.remove('count-updated');
                }, 1000);
            }
            
            // Also update total spent if customer exists in cache
            const customer = customersCache.find(c => c.id === customerId);
            if (customer) {
                const spentCell = row.cells[5]; // Total Spent column
                if (spentCell) {
                    spentCell.textContent = 'KES ' + formatCurrency(customer.totalSpent || 0);
                }
            }
        }
    });
}

// ===========================
// Manual Order Count Update
// ===========================
function showManualOrderCountModal(customer) {
    const modalHtml = `
        <div class="modal active" id="manualOrderCountModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Update Order Count</h2>
                    <button class="modal-close" onclick="document.getElementById('manualOrderCountModal').remove()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 8px;"><strong>Customer:</strong> ${escapeHtml(customer.name || customer.companyName)}</p>
                    <p style="margin-bottom: 20px;"><strong>Current Total Orders:</strong> ${customer.totalOrders || 0}</p>
                    <div class="form-group">
                        <label for="manualOrderCount">New Total Orders:</label>
                        <input type="number" id="manualOrderCount" class="form-control" value="${customer.totalOrders || 0}" min="0" step="1">
                        <small style="color: var(--text-secondary); margin-top: 4px; display: block;">Enter the total number of orders for this customer</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('manualOrderCountModal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="updateManualOrderCount('${customer.id}')">Update</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.updateManualOrderCount = function(customerId) {
    const input = document.getElementById('manualOrderCount');
    const newCount = parseInt(input.value);
    
    if (isNaN(newCount) || newCount < 0) {
        showToast('Please enter a valid number', 'error', 2000);
        return;
    }
    
    // Update in Firebase
    database.ref(`customers/${customerId}`).update({
        totalOrders: newCount,
        lastOrderDate: new Date().toISOString()
    }).then(() => {
        showToast('Order count updated successfully', 'success', 2000);
        
        // Update local cache
        const customer = customersCache.find(c => c.id === customerId);
        if (customer) {
            customer.totalOrders = newCount;
            customer.lastOrderDate = new Date().toISOString();
        }
        
        // Update display
        updateCustomerOrderCountDisplay(customerId, newCount);
        
        // Close modal
        document.getElementById('manualOrderCountModal').remove();
    }).catch(error => {
        console.error('Error updating order count:', error);
        showToast('Error updating order count', 'error', 3000);
    });
};

// ===========================
// Send WhatsApp Message
// ===========================
function sendWhatsAppMessage(customer) {
    // Get phone number (remove any non-numeric characters except +)
    let phone = customer.phone.replace(/[^\d+]/g, '');
    
    // Remove leading zeros and add country code if not present
    if (phone.startsWith('0')) {
        phone = '254' + phone.substring(1); // Kenya country code
    }
    if (!phone.startsWith('+')) {
        phone = '+' + phone;
    }
    
    // Create promotional message
    const message = encodeURIComponent(
        `Hello ${customer.name}! 🎉\n\n` +
        `We have exciting offers just for you at our store!\n\n` +
        `Visit us today and enjoy special discounts on selected items.\n\n` +
        `Thank you for being our valued customer! 💙`
    );
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

// ===========================
// Delete Customer
// ===========================
async function deleteCustomer(customer) {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) {
        return;
    }
    
    try {
        await database.ref(`customers/${customer.id}`).remove();
        showToast('Customer deleted successfully', 'success', 2000);
    } catch (error) {
        console.error('❌ Error deleting customer:', error);
        showToast('Error deleting customer: ' + error.message, 'error', 3000);
    }
}

// ===========================
// View Customer Details
// ===========================
function viewCustomerDetails(customer) {
    console.log('📋 Opening customer details modal for:', customer);
    
    if (!customer) {
        console.error('❌ No customer data provided');
        showToast('Customer data not found', 'error', 2000);
        return;
    }
    
    // Remove any existing modals first
    const existingModal = document.getElementById('customerDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'customerDetailModal';
    modal.style.display = 'flex'; // Force display immediately
    
    const createdDate = new Date(customer.createdAt).toLocaleDateString();
    const customerTypeLabel = customer.isCompany ? '🏢 Company' : '👤 Individual';
    
    // Build company info section if applicable
    let companyInfoHTML = '';
    if (customer.isCompany && customer.companyInfo) {
        companyInfoHTML = `
            <div class="detail-item">
                <span class="detail-label">Contact Person</span>
                <span class="detail-value">${escapeHtml(customer.companyInfo.contactPerson || 'N/A')}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Registration Number</span>
                <span class="detail-value">${escapeHtml(customer.companyInfo.registrationNumber || 'N/A')}</span>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Customer Details</h2>
                <button class="modal-close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="customer-detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Customer Type</span>
                        <span class="detail-value">${customerTypeLabel}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Name</span>
                        <span class="detail-value">${escapeHtml(customer.name)}</span>
                    </div>
                    ${companyInfoHTML}
                    <div class="detail-item">
                        <span class="detail-label">Phone</span>
                        <span class="detail-value">${escapeHtml(customer.phone || 'N/A')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${escapeHtml(customer.email || 'N/A')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${customer.status}">${customer.status === 'active' ? 'Active' : 'Inactive'}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">City</span>
                        <span class="detail-value">${escapeHtml(customer.city || 'N/A')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Country</span>
                        <span class="detail-value">${escapeHtml(customer.country || 'Kenya')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Type</span>
                        <span class="detail-value">${customer.type === 'retail' ? 'Retail' : customer.type === 'wholesale' ? 'Wholesale' : 'VIP'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Orders</span>
                        <span class="detail-value">
                            ${customer.totalOrders || 0}
                            <button class="btn btn-secondary btn-sm" style="margin-left: 10px; padding: 4px 12px; font-size: 12px;" data-customer-id="${customer.id}" id="updateOrderCountBtn">
                                Update
                            </button>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Spent</span>
                        <span class="detail-value">KES ${formatCurrency(customer.totalSpent || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Order Date</span>
                        <span class="detail-value">${customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Member Since</span>
                        <span class="detail-value">${createdDate}</span>
                    </div>
                </div>
                ${customer.notes ? `
                    <div class="detail-item" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                        <span class="detail-label">Notes</span>
                        <span class="detail-value">${escapeHtml(customer.notes)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('✅ Customer details modal added to DOM and displayed');
    
    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Add event listener for update button
    const updateBtn = document.getElementById('updateOrderCountBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.remove();
            showManualOrderCountModal(customer);
        });
    }
}

// ===========================
// Reset Customer Form
// ===========================
function resetCustomerForm() {
    const form = document.getElementById('customerForm');
    if (form) {
        form.reset();
    }
    currentEditingCustomerId = null;
    
    // Reset to individual mode
    const toggleIndividual = document.getElementById('toggleIndividual');
    if (toggleIndividual && !toggleIndividual.classList.contains('active')) {
        toggleIndividual.click();
    }
    
    // Reset title
    const title = document.getElementById('addCustomerTitle');
    if (title) {
        title.textContent = 'Add New Customer';
    }
}

// ===========================
// Close Customer Form
// ===========================
function closeCustomerForm() {
    resetCustomerForm();
    const link = document.querySelector('[data-page="customers"]');
    if (link) {
        link.click();
    }
}

// ===========================
// Utility Functions
// ===========================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(value) {
    return parseFloat(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ===========================
// Export Functions
// ===========================
function exportCustomersToExcel() {
    try {
        // Use filtered customers if filters are active, otherwise use all customers
        const customersToExport = filteredCustomers.length > 0 ? filteredCustomers : customersCache;
        
        if (customersToExport.length === 0) {
            showToast('No customers to export', 'warning', 2000);
            return;
        }
        
        // Prepare data for Excel
        const excelData = customersToExport.map(customer => {
            const baseData = {
                'Customer ID': customer.id,
                'Name': customer.name,
                'Email': customer.email,
                'Phone': customer.phone,
                'Type': customer.isCompany ? 'Company' : 'Individual',
                'Status': customer.status === 'active' ? 'Active' : 'Inactive',
                'Created Date': new Date(customer.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            };
            
            // Add company-specific fields if it's a company
            if (customer.isCompany && customer.companyInfo) {
                baseData['Company Name'] = customer.companyInfo.companyName || '-';
                baseData['Contact Person'] = customer.companyInfo.contactPerson || '-';
                baseData['Registration Number'] = customer.companyInfo.registrationNumber || '-';
            }
            
            return baseData;
        });
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        const colWidths = [
            { wch: 15 }, // Customer ID
            { wch: 25 }, // Name
            { wch: 30 }, // Email
            { wch: 15 }, // Phone
            { wch: 12 }, // Type
            { wch: 10 }, // Status
            { wch: 20 }, // Created Date
        ];
        
        // Add company columns width if any company customers exist
        const hasCompanies = customersToExport.some(c => c.isCompany);
        if (hasCompanies) {
            colWidths.push(
                { wch: 25 }, // Company Name
                { wch: 25 }, // Contact Person
                { wch: 20 }  // Registration Number
            );
        }
        
        ws['!cols'] = colWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        
        // Generate filename with date
        const date = new Date().toISOString().split('T')[0];
        const filename = `customers_export_${date}.xlsx`;
        
        // Download file
        XLSX.writeFile(wb, filename);
        
        showToast(`Exported ${customersToExport.length} customers to Excel`, 'success', 2000);
        console.log('✅ Customers exported to Excel:', filename);
        
    } catch (error) {
        console.error('❌ Error exporting to Excel:', error);
        showToast('Error exporting to Excel: ' + error.message, 'error', 3000);
    }
}

function exportCustomersToPDF() {
    try {
        // Use filtered customers if filters are active, otherwise use all customers
        const customersToExport = filteredCustomers.length > 0 ? filteredCustomers : customersCache;
        
        if (customersToExport.length === 0) {
            showToast('No customers to export', 'warning', 2000);
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        
        // Add title
        doc.setFontSize(18);
        doc.setTextColor(37, 99, 235); // Blue color
        doc.text('Customers Report', 14, 20);
        
        // Add export date and count
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const exportDate = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.text(`Export Date: ${exportDate}`, 14, 28);
        doc.text(`Total Customers: ${customersToExport.length}`, 14, 34);
        
        // Prepare table data
        const tableData = customersToExport.map(customer => {
            const row = [
                customer.name,
                customer.email,
                customer.phone,
                customer.isCompany ? '🏢 Company' : '👤 Individual',
                customer.status === 'active' ? 'Active' : 'Inactive',
                new Date(customer.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })
            ];
            
            // Add company name if it's a company
            if (customer.isCompany && customer.companyInfo?.companyName) {
                row.push(customer.companyInfo.companyName);
            } else {
                row.push('-');
            }
            
            return row;
        });
        
        // Define table columns
        const columns = [
            { header: 'Name', dataKey: 'name' },
            { header: 'Email', dataKey: 'email' },
            { header: 'Phone', dataKey: 'phone' },
            { header: 'Type', dataKey: 'type' },
            { header: 'Status', dataKey: 'status' },
            { header: 'Created', dataKey: 'created' },
            { header: 'Company', dataKey: 'company' }
        ];
        
        // Add table
        doc.autoTable({
            startY: 40,
            head: [['Name', 'Email', 'Phone', 'Type', 'Status', 'Created', 'Company']],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 4,
                overflow: 'linebreak',
                font: 'helvetica'
            },
            headStyles: {
                fillColor: [37, 99, 235], // Blue
                textColor: 255,
                fontStyle: 'bold',
                halign: 'left'
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250]
            },
            columnStyles: {
                0: { cellWidth: 35 }, // Name
                1: { cellWidth: 50 }, // Email
                2: { cellWidth: 30 }, // Phone
                3: { cellWidth: 25 }, // Type
                4: { cellWidth: 20 }, // Status
                5: { cellWidth: 25 }, // Created
                6: { cellWidth: 35 }  // Company
            },
            didDrawCell: (data) => {
                // Color code status column
                if (data.column.index === 4 && data.cell.section === 'body') {
                    const status = data.cell.raw;
                    if (status === 'Active') {
                        doc.setTextColor(5, 150, 105); // Green
                    } else {
                        doc.setTextColor(220, 38, 38); // Red
                    }
                }
            }
        });
        
        // Add footer with page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }
        
        // Generate filename with date
        const date = new Date().toISOString().split('T')[0];
        const filename = `customers_report_${date}.pdf`;
        
        // Download file
        doc.save(filename);
        
        showToast(`Exported ${customersToExport.length} customers to PDF`, 'success', 2000);
        console.log('✅ Customers exported to PDF:', filename);
        
    } catch (error) {
        console.error('❌ Error exporting to PDF:', error);
        showToast('Error exporting to PDF: ' + error.message, 'error', 3000);
    }
}

// Export functions to global scope
window.showManualOrderCountModal = showManualOrderCountModal;
window.viewCustomerDetails = viewCustomerDetails;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;

console.log('✅ Customers Module Loaded');
