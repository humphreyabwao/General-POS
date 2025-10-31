# Quick Reference - Real-time POS System

## 🚀 Quick Start

### 1. Firebase Setup (One-time)
```
1. Visit: https://console.firebase.google.com/project/vendly-7e566
2. Enable Realtime Database
3. Set to test mode initially
```

### 2. Open Your POS
```
Open index.html in browser
Watch console for: "✅ Real-time sync initialized successfully"
```

## 📚 Common Tasks

### Add a Product
```javascript
await addProduct({
    name: 'Product Name',
    sku: 'SKU-001',
    barcode: '1234567890',
    price: 1000,
    cost: 500,
    quantity: 100,
    category: 'Electronics',
    reorderLevel: 10
});
```

### Update Product Stock
```javascript
await updateProduct('productId', {
    quantity: 50
});
```

### Record a Sale
```javascript
await recordSale({
    items: [
        { productId: 'id1', name: 'Item 1', quantity: 2, price: 1000 }
    ],
    subtotal: 2000,
    discount: 0,
    tax: 0,
    total: 2000,
    paymentMethod: 'cash'
});
```

### Search Products
```javascript
const results = searchProducts('laptop');
console.log(results);
```

### Get Statistics
```javascript
const stats = getStats();
console.log('Today Revenue:', formatCurrency(stats.todayRevenue));
console.log('Stock Value:', formatCurrency(stats.stockValue));
console.log('Low Stock:', stats.lowStockCount);
```

### Show Notifications
```javascript
showToast('Success!', 'success');
showToast('Error occurred', 'error');
showToast('Information', 'info');
```

## 🎯 State Events

### Listen to Updates
```javascript
// Products updated
StateEvents.on('products:updated', (products) => {
    console.log('Products changed:', products.length);
});

// Sales updated
StateEvents.on('sales:updated', (sales) => {
    console.log('New sale recorded');
});

// Stats updated
StateEvents.on('stats:updated', (stats) => {
    console.log('Stats refreshed:', stats);
});

// Sync ready
StateEvents.on('sync:ready', (state) => {
    console.log('All data loaded');
});
```

## 🔍 Debug Commands

### Check Status
```javascript
// Is sync active?
console.log('Synced:', AppState.isInitialized);

// View all data
console.log('Products:', AppState.products.length);
console.log('Sales:', AppState.sales.length);
console.log('Stats:', AppState.stats);
```

### Test Real-time
```javascript
// Open in 2 browser windows
// Window 1: Add product
addProduct({ name: 'Test', price: 100, quantity: 10 });

// Window 2: Watch console - should see update automatically!
```

## ⚡ Performance Tips

1. **Batch Updates** - Add multiple products, then sync
2. **Use Filters** - `getProducts({ category: 'Electronics' })`
3. **Limit Results** - `searchProducts('term', 5)` - limits to 5
4. **Cache in Memory** - AppState already cached for you

## 🐛 Troubleshooting

### Data Not Syncing?
```javascript
// 1. Check Firebase connection
console.log('Database:', Firebase.database);

// 2. Reinitialize
initializeRealtimeSync();

// 3. Check listeners
console.log('Listeners:', AppState.listeners);
```

### Stats Not Updating?
```javascript
// Force recalculate
calculateStats();

// Check event listeners
StateEvents.listeners;
```

### Products Not Appearing?
```javascript
// Check if data loaded
console.log('Products count:', AppState.products.length);

// Force reload from Firebase
Firebase.db.getAllData('products')
    .then(r => console.log('Firebase products:', r.data));
```

## 📱 Mobile Testing
```
1. Use ngrok or local network IP
2. Open on phone browser
3. Test real-time across devices
4. Changes on desktop appear on phone instantly!
```

## 🎨 UI Integration

### Update UI on State Change
```javascript
StateEvents.on('products:updated', (products) => {
    // Refresh your product list
    displayProducts(products);
});
```

### Show Loading States
```javascript
// Before async operation
element.classList.add('loading');

// After complete
element.classList.remove('loading');
```

## 🔒 Security (Before Production)

Update Firebase rules:
```json
{
  "rules": {
    "products": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "sales": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 📊 Monitor Usage

### Firebase Console
- Real-time connections
- Database size
- Read/write operations
- Cost monitoring

## 💡 Pro Tips

1. **Use Global Functions** - They handle Firebase + UI updates
2. **Listen to Events** - Don't poll, use StateEvents
3. **Trust the Cache** - AppState is always current
4. **Show Toast** - Users love feedback
5. **Log Everything** - Console logs help debugging

## 🎯 Testing Checklist

- [ ] Products sync across modules
- [ ] Sales update dashboard instantly
- [ ] Inventory changes reflect in POS
- [ ] No page refresh needed
- [ ] Toast notifications appear
- [ ] Stats calculate correctly
- [ ] Works without Firebase (offline)
- [ ] Multiple windows sync

## 🆘 Need Help?

Check implementation details in:
- `REALTIME_IMPLEMENTATION.md` - Full documentation
- `FIREBASE_USAGE_GUIDE.md` - Firebase specifics
- `global-state.js` - All functions with comments

---

**Happy coding! Your POS system is now blazing fast! 🔥**
