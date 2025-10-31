# Sales Module - User Guide

## Overview
The All Sales module provides a comprehensive real-time view of all sales transactions with powerful filtering, searching, and exporting capabilities.

## Features

### 🔍 Real-time Updates
- Automatically syncs with Firebase Realtime Database
- Instant updates when new sales are processed
- No page refresh required

### 🔎 Search Functionality
- Search by Sale ID
- Search by Customer Name
- Search by Phone Number
- Search by Product Name
- Real-time search with debouncing (300ms delay)

### 📅 Date Filters
- **Today**: View today's sales
- **Yesterday**: View yesterday's sales
- **This Week**: View all sales from the current week
- **This Month**: View all sales from the current month
- **Custom**: Select custom date range with start and end dates

### 🎯 Advanced Filters
- **Payment Method**: Filter by Cash, Card, Check, Crypto, or Mobile Money
- **Sort By**: Sort by Date, Amount, Customer, or Items count
- **Sort Order**: Ascending or Descending order

### 📊 Export Options
- **PDF Export**: Professional formatted PDF with table and summary
- **CSV Export**: Standard CSV format for spreadsheet applications
- **Excel Export**: Multi-sheet Excel workbook with summary and analytics

### 👁️ Action Buttons
- **View**: Open detailed modal with complete sale information
- **Print**: Print receipt directly from the table or modal

## How to Use

### Accessing the Module
1. Click on "All Sales" in the sidebar
2. Then click on "View Sales" to see the sales table

### Searching for Sales
1. Type in the search bar at the top
2. Search works across multiple fields:
   - Sale ID
   - Customer name
   - Phone number
   - Product names in the sale

### Filtering by Date
1. Click on one of the date filter buttons:
   - Today (default)
   - Yesterday
   - This Week
   - This Month
   - Custom (opens date picker)
2. For custom dates, select start and end dates

### Filtering by Payment Method
1. Click the "All Payment Methods" dropdown
2. Select the desired payment method
3. Table updates automatically

### Sorting Sales
1. Use the "Sort by" dropdown to choose sort field
2. Click the arrow buttons to change sort order:
   - ⬇️ Descending (newest/highest first)
   - ⬆️ Ascending (oldest/lowest first)

### Viewing Sale Details
1. Click the "👁️ View" button on any sale row
2. A modal opens showing:
   - Sale information (ID, Date, Customer, Payment, Status)
   - Complete item list with quantities and prices
   - Subtotal, discounts, tax, and total
3. Click "Print Receipt" to print from the modal
4. Click "Close" or the X button to close

### Printing Receipts
1. Click the "🖨️ Print" button on any sale row
2. A print-optimized receipt window opens
3. Use browser print dialog to print or save as PDF

### Exporting Data

#### PDF Export
1. Click the "PDF" button in the export section
2. A professionally formatted PDF downloads with:
   - Sales report title and date range
   - Summary statistics (total sales, items, revenue)
   - Complete sales table
   - Page numbers and generation timestamp
3. File naming: `Sales_Report_YYYYMMDD_HHMM.pdf`

#### CSV Export
1. Click the "CSV" button
2. A comma-separated values file downloads
3. Compatible with Excel, Google Sheets, and other tools
4. File naming: `Sales_Report_YYYYMMDD_HHMM.csv`

#### Excel Export
1. Click the "Excel" button
2. A multi-sheet Excel workbook downloads with:
   - **Sales Report**: Complete sales data
   - **Summary**: Key metrics and statistics
   - **Payment Methods**: Breakdown by payment type
3. File naming: `Sales_Report_YYYYMMDD_HHMM.xlsx`

## Data Fields

### Sales Table Columns
- **Sale ID**: Unique transaction identifier
- **Customer**: Customer name or "Walk-in"
- **Date & Time**: When the sale was made
- **Items**: Number of items sold
- **Amount**: Total sale amount
- **Payment**: Payment method with icon
- **Status**: Sale status (Completed, Pending, Cancelled, Returned)
- **Actions**: View and Print buttons

### Payment Method Badges
- 💵 Cash (Green)
- 💳 Card (Blue)
- 📋 Check (Orange)
- ₿ Crypto (Purple)
- 📱 Mobile Money (Pink)

### Status Badges
- **Completed**: Green badge
- **Pending**: Orange badge
- **Cancelled**: Red badge
- **Returned**: Gray badge

## Technical Details

### Files
- `js/sales.js` - Main sales module logic
- `js/sales-export.js` - Export functionality
- `css/sales.css` - Sales module styling

### Dependencies
- Firebase Realtime Database
- jsPDF (PDF generation)
- jsPDF AutoTable plugin (PDF tables)
- SheetJS/XLSX (Excel generation)

### Real-time Sync
- Listens to Firebase `sales` path
- Updates automatically when data changes
- Maintains filter state during updates
- Efficient re-rendering of table

### Performance
- Debounced search (300ms)
- Optimized filtering algorithms
- Lazy loading for large datasets
- Efficient DOM updates

## Keyboard Shortcuts
- **Tab**: Navigate through filters and buttons
- **Enter**: Apply date filter or search
- **Esc**: Close modal (when focused)

## Responsive Design
- **Desktop**: Full table view with all features
- **Tablet**: Responsive layout with horizontal scroll
- **Mobile**: Optimized for touch with stacked filters

## Troubleshooting

### Sales Not Loading
1. Check Firebase connection in console
2. Verify Firebase Realtime Database rules
3. Check internet connection
4. Refresh the page

### Export Not Working
1. Check browser console for errors
2. Verify export libraries are loaded:
   - jsPDF for PDF export
   - XLSX for Excel export
3. Check browser pop-up settings
4. Ensure sufficient browser storage

### Search Not Working
1. Clear search input and try again
2. Check if data is loaded in table
3. Verify search input is focused
4. Check browser console for errors

### Filters Not Applying
1. Make sure a date range is selected
2. Check if custom dates are valid (start < end)
3. Clear all filters and reapply
4. Refresh the page if needed

## Best Practices

1. **Use Date Filters**: Narrow down data for better performance
2. **Export Regularly**: Keep backups of sales data
3. **Check Details**: Always verify sale details before processing returns
4. **Print Receipts**: Print receipts immediately after viewing
5. **Clear Search**: Clear search after finding specific sales

## Future Enhancements
- Advanced analytics dashboard
- Email export functionality
- Scheduled automatic exports
- Custom column selection
- Bulk actions (mark multiple sales)
- Sales comparison charts
- Customer purchase history

---

**Need Help?**
Contact support or check the main README.md for more information.
