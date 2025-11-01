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
    row.querySelector('.action-view')?.addEventListener('click', (e) => {
        e.stopPropagation();
        viewCustomerDetails(customer);
    });
    
    // Edit button
    row.querySelector('.action-edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        editCustomer(customer);
    });
    
    // WhatsApp button
    row.querySelector('.action-whatsapp')?.addEventListener('click', (e) => {
        e.stopPropagation();
        sendWhatsAppMessage(customer);
    });
    
    // Delete button
    row.querySelector('.action-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCustomer(customer);
    });
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
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'customerDetailModal';
    
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
                        <span class="detail-value">${customer.totalOrders || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Spent</span>
                        <span class="detail-value">KES ${formatCurrency(customer.totalSpent || 0)}</span>
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
    
    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
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
console.log('✅ Customers Module Loaded');
