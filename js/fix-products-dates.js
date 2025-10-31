// ===========================
// Fix Products Dates Migration Script
// ===========================
// This script adds missing addedAt and updatedAt fields to existing products
// Run this once in the browser console on the inventory page

async function fixProductsDates() {
    console.log('🔧 Starting products date fix...');
    
    if (!AppState || !AppState.products) {
        console.error('❌ AppState not initialized. Please wait for data to load.');
        return;
    }
    
    let fixedCount = 0;
    let alreadyOkCount = 0;
    const now = new Date().toISOString();
    
    for (const product of AppState.products) {
        let needsUpdate = false;
        const updates = {};
        
        // Check if addedAt is missing or invalid
        if (!product.addedAt) {
            updates.addedAt = now;
            needsUpdate = true;
            console.log(`📝 Adding addedAt to: ${product.name}`);
        } else {
            // Verify it's a valid date
            const date = new Date(product.addedAt);
            if (isNaN(date.getTime())) {
                updates.addedAt = now;
                needsUpdate = true;
                console.log(`📝 Fixing invalid addedAt for: ${product.name}`);
            }
        }
        
        // Check if updatedAt is missing or invalid
        if (!product.updatedAt) {
            updates.updatedAt = now;
            needsUpdate = true;
            console.log(`📝 Adding updatedAt to: ${product.name}`);
        } else {
            // Verify it's a valid date
            const date = new Date(product.updatedAt);
            if (isNaN(date.getTime())) {
                updates.updatedAt = now;
                needsUpdate = true;
                console.log(`📝 Fixing invalid updatedAt for: ${product.name}`);
            }
        }
        
        if (needsUpdate) {
            try {
                await Firebase.db.updateData(`products/${product.id}`, updates);
                fixedCount++;
                console.log(`✅ Fixed: ${product.name}`);
            } catch (error) {
                console.error(`❌ Error fixing ${product.name}:`, error);
            }
        } else {
            alreadyOkCount++;
        }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 Migration Complete!');
    console.log(`✅ Fixed products: ${fixedCount}`);
    console.log(`👍 Already OK: ${alreadyOkCount}`);
    console.log(`📦 Total products: ${AppState.products.length}`);
    console.log('═══════════════════════════════════════');
    
    // Refresh the inventory table
    if (window.Inventory && window.Inventory.loadTable) {
        console.log('🔄 Refreshing inventory table...');
        setTimeout(() => {
            window.Inventory.loadTable();
            console.log('✨ Done! The inventory table should now show correct dates and statuses.');
        }, 1000);
    }
}

// Make function available globally
window.fixProductsDates = fixProductsDates;

// Instructions
console.log('');
console.log('═══════════════════════════════════════');
console.log('📝 Products Date Fix Script Loaded!');
console.log('');
console.log('To fix all products with missing dates:');
console.log('1. Make sure you\'re on the Inventory page');
console.log('2. Wait for products to load');
console.log('3. Run: fixProductsDates()');
console.log('');
console.log('═══════════════════════════════════════');
