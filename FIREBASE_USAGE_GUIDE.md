# Firebase Realtime Database - Usage Guide

## Overview
Your POS system is now configured to use Firebase Realtime Database instead of Firestore. This guide shows you how to use the database functions.

## Database Structure
```
vendly-7e566/
├── products/
│   ├── {productId}/
│   │   ├── name
│   │   ├── sku
│   │   ├── barcode
│   │   ├── price
│   │   ├── quantity
│   │   └── ...
├── sales/
│   ├── {saleId}/
│   │   ├── items[]
│   │   ├── total
│   │   ├── date
│   │   └── ...
├── customers/
├── expenses/
├── users/
└── settings/
```

## Available Functions

### 1. Add Data (Create)
Adds new data with auto-generated ID:

```javascript
// Add a new product
const result = await Firebase.db.addData('products', {
    name: 'iPhone 15',
    sku: 'IPH-001',
    barcode: '1234567890',
    price: 85000,
    quantity: 10,
    category: 'Electronics'
});

if (result.success) {
    console.log('Product added with ID:', result.id);
}
```

### 2. Set Data (Overwrite)
Sets data at a specific path:

```javascript
// Set a specific product
await Firebase.db.setData('products/product-123', {
    name: 'Samsung S24',
    price: 75000
});
```

### 3. Get Data (Read)
Retrieves data from a path:

```javascript
// Get a specific product
const result = await Firebase.db.getData('products/product-123');
if (result.success) {
    console.log('Product:', result.data);
}
```

### 4. Get All Data
Gets all items from a path:

```javascript
// Get all products
const result = await Firebase.db.getAllData('products');
if (result.success) {
    console.log('All products:', result.data);
    // result.data is an array of objects with id
}
```

### 5. Update Data (Merge)
Updates existing data without overwriting:

```javascript
// Update product quantity
await Firebase.db.updateData('products/product-123', {
    quantity: 15,
    price: 76000
});
```

### 6. Delete Data
Removes data at a path:

```javascript
// Delete a product
await Firebase.db.deleteData('products/product-123');
```

### 7. Query Data
Query with ordering and filtering:

```javascript
// Get products ordered by price, limited to 10
const result = await Firebase.db.queryData('products', 'price', 10);

// Get products with specific category
const result = await Firebase.db.queryData('products', 'category', null, null, 'Electronics');
```

### 8. Real-time Listeners
Listen to data changes in real-time:

```javascript
// Listen to all products
const unsubscribe = Firebase.db.listenToPath('products', (products) => {
    console.log('Products updated:', products);
    // Update UI with new data
});

// Stop listening when done
unsubscribe();
```

### 9. Child Listeners
Listen to specific child events:

```javascript
// Listen for new products added
const unsub1 = Firebase.db.listenToChildAdded('products', (product) => {
    console.log('New product added:', product);
});

// Listen for product updates
const unsub2 = Firebase.db.listenToChildChanged('products', (product) => {
    console.log('Product updated:', product);
});

// Listen for product deletions
const unsub3 = Firebase.db.listenToChildRemoved('products', (productId) => {
    console.log('Product deleted:', productId);
});
```

### 10. Transactions
For atomic operations (like counters):

```javascript
// Increment a counter atomically
await Firebase.db.runTransaction('stats/totalSales', (currentValue) => {
    return (currentValue || 0) + 1;
});
```

## POS System Examples

### Adding a Product to Inventory
```javascript
async function addProduct(productData) {
    const result = await Firebase.db.addData('products', {
        name: productData.name,
        sku: productData.sku,
        barcode: productData.barcode,
        price: productData.price,
        cost: productData.cost,
        quantity: productData.quantity,
        category: productData.category,
        supplier: productData.supplier,
        reorderLevel: productData.reorderLevel || 10
    });
    
    if (result.success) {
        alert('Product added successfully!');
        return result.id;
    } else {
        alert('Error: ' + result.error);
    }
}
```

### Recording a Sale
```javascript
async function recordSale(saleData) {
    // Add sale record
    const saleResult = await Firebase.db.addData('sales', {
        items: saleData.items,
        subtotal: saleData.subtotal,
        discount: saleData.discount,
        tax: saleData.tax,
        total: saleData.total,
        paymentMethod: saleData.paymentMethod,
        cashier: saleData.cashier,
        branch: saleData.branch
    });
    
    if (saleResult.success) {
        // Update product quantities
        for (const item of saleData.items) {
            const productResult = await Firebase.db.getData(`products/${item.productId}`);
            if (productResult.success) {
                const newQuantity = productResult.data.quantity - item.quantity;
                await Firebase.db.updateData(`products/${item.productId}`, {
                    quantity: newQuantity
                });
            }
        }
        
        // Update daily sales counter
        await Firebase.db.runTransaction('stats/dailySales', (current) => {
            return (current || 0) + saleData.total;
        });
        
        return saleResult.id;
    }
}
```

### Getting Low Stock Products
```javascript
async function getLowStockProducts() {
    const result = await Firebase.db.getAllData('products');
    
    if (result.success) {
        const lowStock = result.data.filter(product => {
            return product.quantity <= product.reorderLevel;
        });
        
        console.log('Low stock products:', lowStock);
        return lowStock;
    }
}
```

### Real-time Inventory Monitor
```javascript
function startInventoryMonitor() {
    // Listen to product changes
    const unsubscribe = Firebase.db.listenToPath('products', (products) => {
        // Update UI
        displayProducts(products);
        
        // Check for low stock
        const lowStock = products.filter(p => p.quantity <= p.reorderLevel);
        if (lowStock.length > 0) {
            showLowStockAlert(lowStock);
        }
    });
    
    return unsubscribe;
}
```

### Search Products
```javascript
async function searchProducts(searchTerm) {
    const result = await Firebase.db.getAllData('products');
    
    if (result.success) {
        const filtered = result.data.filter(product => {
            const search = searchTerm.toLowerCase();
            return product.name.toLowerCase().includes(search) ||
                   product.sku.toLowerCase().includes(search) ||
                   product.barcode.includes(search);
        });
        
        return filtered;
    }
    return [];
}
```

## Authentication Examples

### Sign In
```javascript
async function signIn(email, password) {
    const result = await Firebase.auth.signIn(email, password);
    
    if (result.success) {
        console.log('Logged in:', result.user);
    } else {
        console.error('Login failed:', result.error);
    }
}
```

### Check Auth State
```javascript
Firebase.auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User logged in:', user);
        // Show POS interface
    } else {
        console.log('No user logged in');
        // Show login page
    }
});
```

## Storage Examples

### Upload Product Image
```javascript
async function uploadProductImage(file, productId) {
    const path = `products/${productId}/image.jpg`;
    const result = await Firebase.storage.uploadFile(path, file);
    
    if (result.success) {
        // Save URL to database
        await Firebase.db.updateData(`products/${productId}`, {
            imageUrl: result.url
        });
        
        return result.url;
    }
}
```

## Important Notes

1. **Database URL**: Make sure your Firebase project has Realtime Database enabled. The URL should be: `https://vendly-7e566-default-rtdb.firebaseio.com`

2. **Security Rules**: Set up security rules in Firebase Console:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

3. **Indexing**: For better query performance, add indexes in Firebase Console for frequently queried fields.

4. **Offline Persistence**: Firebase Realtime Database automatically handles offline data:
```javascript
firebase.database().goOffline(); // Disconnect
firebase.database().goOnline();  // Reconnect
```

## Migration from Firestore

If you had Firestore code, replace:
- `db.collection('products').add()` → `Firebase.db.addData('products', data)`
- `db.collection('products').doc(id).get()` → `Firebase.db.getData('products/' + id)`
- `db.collection('products').doc(id).update()` → `Firebase.db.updateData('products/' + id, data)`
- `db.collection('products').doc(id).delete()` → `Firebase.db.deleteData('products/' + id)`

## Testing Your Setup

Open your browser console and test:

```javascript
// Test adding data
Firebase.db.addData('test', { message: 'Hello World', time: Date.now() })
    .then(result => console.log('Test successful:', result));

// Test reading data
Firebase.db.getAllData('test')
    .then(result => console.log('Test data:', result));
```

## Need Help?

- Firebase Realtime Database Docs: https://firebase.google.com/docs/database
- Firebase Console: https://console.firebase.google.com/project/vendly-7e566
