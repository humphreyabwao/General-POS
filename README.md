# POS System

A clean and simple Point of Sale (POS) system built with HTML, CSS, JavaScript, and Firebase.

## Features

### Navigation
- **Sidebar Navigation**: Collapsible sidebar with the following modules:
  - Dashboard
  - Inventory (with Add Item)
  - **POS / Sales** (Full Implementation)
  - All Sales
  - Customers
  - Expenses
  - Reports
  - Admin Panel

### POS Module (Complete Implementation)
The Point of Sale module is now fully functional with the following features:

#### Real-time Product Search
- **Live Search**: Search products by name, SKU, barcode, or category
- **Instant Results**: Results appear as you type with product details
- **Stock Information**: Shows available stock and stock status
- **Quick Add**: Add products to cart directly from search results

#### Barcode Scanner Support
- Enter or scan barcodes to quickly add products
- Auto-adds products to cart on Enter key
- Compatible with USB barcode scanners

#### Cart Management
- **Dynamic Cart**: Real-time cart updates with item details
- **Quantity Control**: Increase/decrease quantities with stock limits
- **Item Discounts**: Apply individual item discounts (percentage)
- **Remove Items**: Quick remove button for each item
- **Clear Cart**: Clear entire cart with confirmation

#### Real-time Calculations
- **Subtotal**: Automatic calculation of all items
- **Global Discount**: Fully editable percentage discount (default 0%, supports decimals)
- **VAT/Tax**: Fully editable tax percentage (default 0%, supports decimals)
- **Validation**: Automatic range validation (0-100%)
- **Grand Total**: Real-time total with all calculations

#### Payment Methods
1. **Cash Payment**
   - Enter amount received
   - Automatic change calculation
   - Shows if payment is sufficient

2. **M-PESA Payment**
   - Enter M-PESA transaction code
   - Optional phone number field
   - Transaction reference tracking

3. **Card Payment**
   - Card reference/last 4 digits entry
   - Card type tracking

#### Manual Product Addition
- Add products not in inventory
- Custom name, price, and quantity
- Useful for one-time items or services

#### Sales Processing
- Complete sale with selected payment method
- Automatic inventory stock updates
- Generate and print receipt
- Save transaction to database/localStorage
- Transaction history tracking

#### Receipt Generation
- Professional receipt layout
- Sale number and date/time
- Itemized list with quantities and prices
- Shows discounts, tax, and totals
- Payment method and change (if cash)
- Auto-print functionality

#### Today's Statistics
- Total sales count
- Today's revenue
- Number of transactions
- Real-time updates

### Top Bar Features
- Sidebar toggle button
- Business logo and name display
- Dark/Light mode toggle
- Notification center
- Profile dropdown with user info and settings

### Design
- Clean, modern interface
- Static solid colors (Blue, Green, Red)
- Responsive design
- Dark and light mode support
- Smooth transitions and animations

## Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Navigate to Project Settings > General
4. Under "Your apps", click on the web icon (</>)
5. Register your app and copy the Firebase configuration
6. Open `js/firebase-config.js` and replace the placeholder values with your Firebase credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. Enable Firebase Services

In the Firebase Console:

1. **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable Email/Password authentication

2. **Firestore Database**:
   - Go to Firestore Database
   - Create database in production or test mode
   - Set up security rules as needed

3. **Storage**:
   - Go to Storage
   - Get started and set up storage bucket

### 3. Run the Application

1. Open `index.html` in a web browser
2. Or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```

## Project Structure

```
POS/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # Main stylesheet
├── js/
│   ├── app.js             # Main application logic
│   └── firebase-config.js # Firebase configuration
└── README.md              # This file
```

## Color Scheme

- **Blue**: `#2563eb` (Primary actions, active states)
- **Green**: `#10b981` (Success, positive actions)
- **Red**: `#ef4444` (Danger, delete actions)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Notes

- All modules are created but left blank (no demo data)
- Firebase integration is ready to use
- Dark/light mode preference is saved in localStorage
- Sidebar state (collapsed/expanded) is saved in localStorage
- Current page is saved in localStorage for persistence

## Module Status

### ✅ Completed Modules
- **POS / Sales**: Fully functional with real-time search, cart management, multiple payment methods, and receipt printing
- **Inventory**: Product listing, search, filters, and stock management (Add Item form implemented)
- **Dashboard**: Statistics, activity log, and quick overview

### 🚧 Future Development

Modules that can be expanded:
- All Sales: Sales history, transaction details, refunds
- Customers: Customer database, loyalty programs, purchase history
- Expenses: Expense tracking, categories, reports
- Reports: Advanced analytics, charts, export functionality
- Admin Panel: User management, roles, system settings

## Usage Guide

### Using the POS Module

1. **Access POS**: Click on "POS / Sales" > "New Sale" in the sidebar

2. **Search Products**:
   - Type product name, SKU, or barcode in the search field
   - Click "Add" button on desired product
   - Or scan barcode using barcode input

3. **Manage Cart**:
   - Adjust quantities using +/- buttons
   - Add item-specific discounts in percentage
   - Remove items using the X button

4. **Apply Discounts & Tax**:
   - Set global discount percentage (default 0%)
   - Adjust VAT/tax rate (default 0%)
   - Supports decimal values (e.g., 16.5%)
   - Calculations update in real-time
   - Auto-validates to 0-100% range

5. **Checkout**:
   - Click "Proceed to Checkout"
   - Select payment method (Cash/M-PESA/Card)
   - Enter payment details
   - Click "Complete Sale"
   - Receipt will print automatically

6. **Manual Products**:
   - Click "Manual Add" button
   - Enter product name, price, quantity
   - Add to cart

### Demo Mode

If Firebase is not configured, the system uses:
- Mock product data for searching
- localStorage for storing sales
- All features remain functional for testing

## License

This project is provided as-is for development purposes.
