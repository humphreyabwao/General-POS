// ===========================
// POS Stats Functions - Real-time
// ===========================

// Load POS Stats
function loadPOSStats() {
    updatePOSStats();
}

// Update POS Stats (Real-time)
function updatePOSStats() {
    const stats = AppState.stats;
    
    // Update stat cards
    const todaySalesEl = document.getElementById('posTodaySales');
    const todayRevenueEl = document.getElementById('posTodayRevenue');
    const todayTransactionsEl = document.getElementById('posTodayTransactions');
    
    if (todaySalesEl) {
        todaySalesEl.textContent = stats.todayTransactions || 0;
    }
    
    if (todayRevenueEl) {
        todayRevenueEl.textContent = formatCurrency(stats.todayRevenue || 0);
    }
    
    if (todayTransactionsEl) {
        todayTransactionsEl.textContent = stats.todayTransactions || 0;
    }
    
    console.log('💳 POS stats updated');
}
