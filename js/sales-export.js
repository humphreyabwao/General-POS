// ===========================
// Sales Export Module - PDF, CSV, Excel
// ===========================

// ===========================
// Initialize Export Buttons
// ===========================
function initializeSalesExport() {
    console.log('✅ Initializing Sales Export');
    
    // PDF Export
    const pdfBtn = document.getElementById('exportPdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => exportToPDF());
    }
    
    // CSV Export
    const csvBtn = document.getElementById('exportCsvBtn');
    if (csvBtn) {
        csvBtn.addEventListener('click', () => exportToCSV());
    }
    
    // Excel Export
    const excelBtn = document.getElementById('exportExcelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', () => exportToExcel());
    }
}

// ===========================
// Export to PDF
// ===========================
function exportToPDF() {
    try {
        // Check if jsPDF is loaded
        if (typeof jspdf === 'undefined') {
            showToast('PDF library not loaded. Please refresh the page.', 'error', 3000);
            return;
        }
        
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        // Get the export data
        const salesData = getSalesDataForExport();
        
        if (salesData.length === 0) {
            showToast('No sales data to export', 'warning', 2000);
            return;
        }
        
        // Add title
        doc.setFontSize(18);
        doc.setTextColor(37, 99, 235); // Primary blue
        doc.text('Sales Report', 14, 20);
        
        // Add date range info
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Secondary text
        const dateRange = getDateRangeText();
        doc.text(dateRange, 14, 28);
        
        // Add summary stats
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42); // Primary text
        const totalItems = salesData.reduce((sum, sale) => sum + sale.Items, 0);
        
        doc.text(`Total Sales: ${salesData.length}`, 14, 36);
        doc.text(`Total Items Sold: ${totalItems}`, 14, 42);
        doc.text(`Total Revenue: ${salesData[0] ? salesData.reduce((sum, sale) => {
            const amountStr = sale.Amount.replace('KSh ', '').replace(/,/g, '');
            return sum + parseFloat(amountStr);
        }, 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '0.00'} KSh`, 14, 48);
        
        // Prepare table data
        const tableData = salesData.map(sale => [
            sale['Sale ID'],
            sale.Customer,
            sale.Date,
            sale.Items.toString(),
            sale.Amount,
            sale['Payment Method'].replace(/[^\w\s]/gi, ''),
            sale.Status
        ]);
        
        // Add table
        doc.autoTable({
            head: [['ID', 'Customer', 'Date', 'Items', 'Amount', 'Payment', 'Status']],
            body: tableData,
            startY: 55,
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                2: { cellWidth: 35 },
                3: { cellWidth: 15 },
                4: { cellWidth: 25 },
                5: { cellWidth: 25 },
                6: { cellWidth: 25 }
            }
        });
        
        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Generated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}`,
                14,
                doc.internal.pageSize.height - 10
            );
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.width - 30,
                doc.internal.pageSize.height - 10
            );
        }
        
        // Save the PDF
        const fileName = `Sales_Report_${getFileNameDate()}.pdf`;
        doc.save(fileName);
        
        showToast(`PDF exported successfully: ${fileName}`, 'success', 3000);
        
    } catch (error) {
        console.error('❌ Error exporting to PDF:', error);
        showToast('Error exporting to PDF', 'error', 3000);
    }
}

// ===========================
// Export to CSV
// ===========================
function exportToCSV() {
    try {
        const salesData = getSalesDataForExport();
        
        if (salesData.length === 0) {
            showToast('No sales data to export', 'warning', 2000);
            return;
        }
        
        // Convert to CSV format
        const headers = Object.keys(salesData[0]);
        const csvRows = [];
        
        // Add header row
        csvRows.push(headers.join(','));
        
        // Add data rows
        salesData.forEach(sale => {
            const values = headers.map(header => {
                const value = sale[header];
                // Escape values that contain commas or quotes
                const escaped = String(value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });
        
        // Create CSV content
        const csvContent = csvRows.join('\n');
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Sales_Report_${getFileNameDate()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('CSV exported successfully', 'success', 3000);
        
    } catch (error) {
        console.error('❌ Error exporting to CSV:', error);
        showToast('Error exporting to CSV', 'error', 3000);
    }
}

// ===========================
// Export to Excel
// ===========================
function exportToExcel() {
    try {
        // Check if SheetJS is loaded
        if (typeof XLSX === 'undefined') {
            showToast('Excel library not loaded. Please refresh the page.', 'error', 3000);
            return;
        }
        
        const salesData = getSalesDataForExport();
        
        if (salesData.length === 0) {
            showToast('No sales data to export', 'warning', 2000);
            return;
        }
        
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // Create worksheet from sales data
        const ws = XLSX.utils.json_to_sheet(salesData);
        
        // Set column widths
        const colWidths = [
            { wch: 20 }, // Sale ID
            { wch: 20 }, // Customer
            { wch: 25 }, // Date
            { wch: 10 }, // Items
            { wch: 12 }, // Amount
            { wch: 18 }, // Payment Method
            { wch: 12 }  // Status
        ];
        ws['!cols'] = colWidths;
        
        // Add the worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
        
        // Create summary worksheet
        const totalItems = salesData.reduce((sum, sale) => sum + sale.Items, 0);
        
        // Calculate total revenue from KSh formatted strings
        const totalSales = salesData.reduce((sum, sale) => {
            const amountStr = sale.Amount.replace('KSh ', '').replace(/,/g, '');
            return sum + parseFloat(amountStr);
        }, 0);
        
        const summary = [
            { Metric: 'Date Range', Value: getDateRangeText() },
            { Metric: 'Total Sales', Value: salesData.length },
            { Metric: 'Total Items Sold', Value: totalItems },
            { Metric: 'Total Revenue', Value: `KSh ${totalSales.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { Metric: 'Average Sale Value', Value: `KSh ${(totalSales / salesData.length).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
        ];
        
        const wsSummary = XLSX.utils.json_to_sheet(summary);
        wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        
        // Create payment method breakdown
        const paymentBreakdown = {};
        salesData.forEach(sale => {
            const method = sale['Payment Method'];
            const amountStr = sale.Amount.replace('KSh ', '').replace(/,/g, '');
            const amount = parseFloat(amountStr);
            
            if (!paymentBreakdown[method]) {
                paymentBreakdown[method] = { count: 0, total: 0 };
            }
            paymentBreakdown[method].count++;
            paymentBreakdown[method].total += amount;
        });
        
        const paymentData = Object.keys(paymentBreakdown).map(method => ({
            'Payment Method': method,
            'Count': paymentBreakdown[method].count,
            'Total Amount': `KSh ${paymentBreakdown[method].total.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }));
        
        const wsPayment = XLSX.utils.json_to_sheet(paymentData);
        wsPayment['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsPayment, 'Payment Methods');
        
        // Save the file
        const fileName = `Sales_Report_${getFileNameDate()}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showToast(`Excel file exported successfully: ${fileName}`, 'success', 3000);
        
    } catch (error) {
        console.error('❌ Error exporting to Excel:', error);
        showToast('Error exporting to Excel', 'error', 3000);
    }
}

// ===========================
// Helper Functions
// ===========================
function getFileNameDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
}

function getDateRangeText() {
    const filterType = SalesFilterState.dateRange;
    
    switch (filterType) {
        case 'today':
            return `Today: ${new Date().toLocaleDateString('en-US')}`;
        
        case 'yesterday':
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return `Yesterday: ${yesterday.toLocaleDateString('en-US')}`;
        
        case 'thisWeek':
            const today = new Date();
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return `This Week: ${weekStart.toLocaleDateString('en-US')} - ${today.toLocaleDateString('en-US')}`;
        
        case 'thisMonth':
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return `This Month: ${monthStart.toLocaleDateString('en-US')} - ${monthEnd.toLocaleDateString('en-US')}`;
        
        case 'custom':
            if (SalesFilterState.customStartDate && SalesFilterState.customEndDate) {
                return `Custom: ${new Date(SalesFilterState.customStartDate).toLocaleDateString('en-US')} - ${new Date(SalesFilterState.customEndDate).toLocaleDateString('en-US')}`;
            }
            return 'Custom Date Range';
        
        default:
            return 'All Time';
    }
}
