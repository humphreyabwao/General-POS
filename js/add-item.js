// ===========================
// Add Item Form Module
// ===========================

let barcodeScanner = null;

// Initialize Add Item Form
function initializeAddItemForm() {
    const form = document.getElementById('addItemForm');
    if (!form) return;
    
    // Generate SKU button
    const generateSKUBtn = document.getElementById('generateSKU');
    if (generateSKUBtn) {
        generateSKUBtn.addEventListener('click', generateSKU);
    }
    
    // Generate Barcode button
    const generateBarcodeBtn = document.getElementById('generateBarcode');
    if (generateBarcodeBtn) {
        generateBarcodeBtn.addEventListener('click', generateBarcodeNumber);
    }
    
    // Scan Barcode button
    const scanBarcodeBtn = document.getElementById('scanBarcode');
    if (scanBarcodeBtn) {
        scanBarcodeBtn.addEventListener('click', startBarcodeScanner);
    }
    
    // Print Barcode button
    const printBarcodeBtn = document.getElementById('printBarcode');
    if (printBarcodeBtn) {
        printBarcodeBtn.addEventListener('click', printBarcode);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelAddItem');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // Navigate back to inventory
            const inventoryLink = document.querySelector('a[data-page="inventory"]');
            if (inventoryLink) inventoryLink.click();
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetForm');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            form.reset();
            hideBarcodePreview();
            calculateProfit();
        });
    }
    
    // Form submit
    form.addEventListener('submit', handleFormSubmit);
    
    // Auto-calculate profit margin
    const costInput = document.getElementById('productCost');
    const priceInput = document.getElementById('productPrice');
    
    if (costInput && priceInput) {
        costInput.addEventListener('input', calculateProfit);
        priceInput.addEventListener('input', calculateProfit);
    }
    
    // Update barcode preview when barcode changes
    const barcodeInput = document.getElementById('productBarcode');
    if (barcodeInput) {
        barcodeInput.addEventListener('input', updateBarcodePreview);
    }
}

// Generate SKU
function generateSKU() {
    const category = document.getElementById('productCategory').value;
    const categoryCode = category ? category.substring(0, 3).toUpperCase() : 'PRD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const sku = `${categoryCode}-${timestamp}-${random}`;
    document.getElementById('productSKU').value = sku;
}

// Generate Barcode Number
function generateBarcodeNumber() {
    // Generate EAN-13 compatible barcode
    const prefix = '978'; // Standard prefix
    const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    const barcode = prefix + random;
    
    // Calculate check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(barcode[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    const fullBarcode = barcode + checkDigit;
    document.getElementById('productBarcode').value = fullBarcode;
    updateBarcodePreview();
}

// Update Barcode Preview
function updateBarcodePreview() {
    const barcodeValue = document.getElementById('productBarcode').value.trim();
    const previewContainer = document.getElementById('barcodePreviewContainer');
    const previewSVG = document.getElementById('barcodePreview');
    
    if (!barcodeValue) {
        hideBarcodePreview();
        return;
    }
    
    try {
        // Generate barcode using JsBarcode
        JsBarcode(previewSVG, barcodeValue, {
            format: "CODE128",
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 14,
            margin: 10
        });
        
        previewContainer.style.display = 'block';
    } catch (error) {
        console.error('Invalid barcode:', error);
        hideBarcodePreview();
    }
}

// Hide Barcode Preview
function hideBarcodePreview() {
    const previewContainer = document.getElementById('barcodePreviewContainer');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

// Start Barcode Scanner
function startBarcodeScanner() {
    // Check if browser supports barcode scanning
    if ('BarcodeDetector' in window) {
        useBrowserBarcodeScanner();
    } else {
        // Fallback to manual input or keyboard scanner
        useKeyboardScanner();
    }
}

// Browser Barcode Scanner (Experimental)
async function useBrowserBarcodeScanner() {
    try {
        const barcodeDetector = new BarcodeDetector({ formats: ['code_128', 'ean_13', 'qr_code'] });
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        
        // Create video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        // Create modal for camera
        showCameraModal(video, stream, barcodeDetector);
        
    } catch (error) {
        console.error('Camera access denied:', error);
        alert('Camera access denied or not supported. Please enter barcode manually or use a USB scanner.');
    }
}

// Show Camera Modal
function showCameraModal(video, stream, detector) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
    `;
    
    video.style.cssText = 'max-width: 90%; max-height: 70%; border-radius: 12px;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close Scanner';
    closeBtn.className = 'btn-secondary';
    closeBtn.style.cssText = 'padding: 12px 24px; font-size: 16px;';
    
    closeBtn.onclick = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
    };
    
    modal.appendChild(video);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
    
    // Scan for barcodes
    const scanInterval = setInterval(async () => {
        try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
                const barcode = barcodes[0].rawValue;
                document.getElementById('productBarcode').value = barcode;
                updateBarcodePreview();
                
                clearInterval(scanInterval);
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(modal);
            }
        } catch (error) {
            console.error('Barcode detection error:', error);
        }
    }, 100);
}

// Keyboard Scanner (USB Barcode Scanner)
function useKeyboardScanner() {
    alert('Please use your USB barcode scanner to scan directly into the Barcode field, or enter manually.');
    document.getElementById('productBarcode').focus();
}

// Calculate Profit Margin
function calculateProfit() {
    const cost = parseFloat(document.getElementById('productCost').value) || 0;
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    
    if (cost > 0 && price > 0) {
        const profit = price - cost;
        const margin = ((profit / price) * 100).toFixed(2);
        
        document.getElementById('productProfit').value = `KSh ${profit.toFixed(2)} (${margin}%)`;
    } else {
        document.getElementById('productProfit').value = '';
    }
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitAddItem');
    const originalText = submitBtn.innerHTML;
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Adding Product...
    `;
    
    try {
        // Get form data
        const formData = {
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value,
            brand: document.getElementById('productBrand').value.trim(),
            description: document.getElementById('productDescription').value.trim(),
            sku: document.getElementById('productSKU').value.trim(),
            barcode: document.getElementById('productBarcode').value.trim(),
            cost: parseFloat(document.getElementById('productCost').value) || 0,
            price: parseFloat(document.getElementById('productPrice').value) || 0,
            quantity: parseInt(document.getElementById('productQuantity').value) || 0,
            reorderLevel: parseInt(document.getElementById('productReorderLevel').value) || 10,
            unit: document.getElementById('productUnit').value,
            supplier: document.getElementById('productSupplier').value.trim(),
            supplierContact: document.getElementById('productSupplierContact').value.trim(),
            expiryDate: document.getElementById('productExpiryDate').value || null,
            location: document.getElementById('productLocation').value.trim(),
            addedBy: 'Admin' // TODO: Get from authenticated user
        };
        
        // Validate required fields
        if (!formData.name || !formData.price || formData.quantity < 0) {
            throw new Error('Please fill in all required fields.');
        }
        
        // Add item to Firebase
        const result = await addProduct(formData);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to add product');
        }
        
        // Show success message
        showToast(`Product "${formData.name}" added successfully!`, 'success');
        
        // Reset form
        document.getElementById('addItemForm').reset();
        hideBarcodePreview();
        
        // Navigate back to inventory after 1.5 seconds
        setTimeout(() => {
            const inventoryLink = document.querySelector('a[data-page="inventory"]');
            if (inventoryLink) {
                inventoryLink.click();
                // Reload inventory table
                if (window.Inventory && window.Inventory.loadTable) {
                    window.Inventory.loadTable();
                }
            }
        }, 1500);
        
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Error: ' + error.message);
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Show Success Message
function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        z-index: 10000;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
        </svg>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Print Barcode
function printBarcode() {
    const barcodeValue = document.getElementById('productBarcode').value.trim();
    const productName = document.getElementById('productName').value.trim() || 'Product';
    const price = document.getElementById('productPrice').value;
    const category = document.getElementById('productCategory').value;
    const sku = document.getElementById('productSKU').value.trim();
    
    if (!barcodeValue) {
        alert('Please generate or enter a barcode first.');
        return;
    }
    
    // Show print options modal
    showPrintOptionsModal(barcodeValue, productName, price, category, sku);
}

// Show Print Options Modal
function showPrintOptionsModal(barcode, name, price, category, sku) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    modalContent.innerHTML = `
        <h2 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937;">Print Barcode Label</h2>
        
        <div style="margin-bottom: 24px;">
            <label style="display: block; font-weight: 600; margin-bottom: 12px; color: #374151;">Label Size:</label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                <button class="label-size-btn" data-size="small" style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; background: white; cursor: pointer; font-weight: 600;">
                    Small (40x25mm)
                </button>
                <button class="label-size-btn active" data-size="medium" style="padding: 12px; border: 2px solid #3b82f6; border-radius: 8px; background: #eff6ff; cursor: pointer; font-weight: 600; color: #3b82f6;">
                    Medium (50x30mm)
                </button>
                <button class="label-size-btn" data-size="large" style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; background: white; cursor: pointer; font-weight: 600;">
                    Large (60x40mm)
                </button>
                <button class="label-size-btn" data-size="full" style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; background: white; cursor: pointer; font-weight: 600;">
                    Full Page (A4)
                </button>
            </div>
        </div>
        
        <div style="margin-bottom: 24px;">
            <label style="display: block; font-weight: 600; margin-bottom: 12px; color: #374151;">Number of Copies:</label>
            <input type="number" id="labelCopies" value="1" min="1" max="50" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
        </div>
        
        <div style="margin-bottom: 24px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="includePrice" checked style="width: 18px; height: 18px; cursor: pointer;">
                <span style="font-weight: 600; color: #374151;">Include Price</span>
            </label>
        </div>
        
        <div style="margin-bottom: 24px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="includeSKU" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="font-weight: 600; color: #374151;">Include SKU</span>
            </label>
        </div>
        
        <div style="margin-bottom: 24px; padding: 20px; background: #f9fafb; border-radius: 8px; border: 2px dashed #d1d5db;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: center;">Preview</h4>
            <div id="labelPreview" style="text-align: center; background: white; padding: 16px; border-radius: 4px;">
                <svg id="previewBarcode"></svg>
            </div>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="cancelPrint" style="padding: 12px 24px; background: #f3f4f6; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: #374151;">
                Cancel
            </button>
            <button id="confirmPrint" style="padding: 12px 24px; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                Print Labels
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Generate preview
    setTimeout(() => {
        JsBarcode("#previewBarcode", barcode, {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 12,
            margin: 5
        });
    }, 100);
    
    // Handle label size selection
    let selectedSize = 'medium';
    const sizeButtons = modalContent.querySelectorAll('.label-size-btn');
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeButtons.forEach(b => {
                b.style.border = '2px solid #e5e7eb';
                b.style.background = 'white';
                b.style.color = '#374151';
                b.classList.remove('active');
            });
            btn.style.border = '2px solid #3b82f6';
            btn.style.background = '#eff6ff';
            btn.style.color = '#3b82f6';
            btn.classList.add('active');
            selectedSize = btn.dataset.size;
        });
    });
    
    // Cancel button
    modalContent.querySelector('#cancelPrint').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Confirm print button
    modalContent.querySelector('#confirmPrint').addEventListener('click', () => {
        const copies = parseInt(document.getElementById('labelCopies').value) || 1;
        const includePrice = document.getElementById('includePrice').checked;
        const includeSKU = document.getElementById('includeSKU').checked;
        
        document.body.removeChild(modal);
        printBarcodeLabels(barcode, name, price, category, sku, selectedSize, copies, includePrice, includeSKU);
    });
}

// Print Barcode Labels
function printBarcodeLabels(barcode, name, price, category, sku, size, copies, includePrice, includeSKU) {
    const sizes = {
        small: { width: '40mm', height: '25mm', barcodeWidth: 1.5, barcodeHeight: 40, fontSize: 10 },
        medium: { width: '50mm', height: '30mm', barcodeWidth: 2, barcodeHeight: 50, fontSize: 12 },
        large: { width: '60mm', height: '40mm', barcodeWidth: 2, barcodeHeight: 60, fontSize: 14 },
        full: { width: '210mm', height: '297mm', barcodeWidth: 3, barcodeHeight: 100, fontSize: 18 }
    };
    
    const selectedSize = sizes[size];
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    let labelsHTML = '';
    for (let i = 0; i < copies; i++) {
        labelsHTML += `
            <div class="barcode-label" style="width: ${selectedSize.width}; height: ${selectedSize.height};">
                <div class="label-header">
                    <strong class="product-name">${name}</strong>
                    ${category ? `<span class="category">${category}</span>` : ''}
                </div>
                <div class="barcode-wrapper">
                    <svg class="barcode" data-barcode="${barcode}"></svg>
                </div>
                <div class="label-footer">
                    ${includePrice && price ? `<div class="price">KSh ${parseFloat(price).toFixed(2)}</div>` : ''}
                    ${includeSKU && sku ? `<div class="sku">SKU: ${sku}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Barcode Labels - ${name}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    background: #f5f5f5;
                    padding: 20px;
                }
                
                .labels-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10mm;
                    justify-content: center;
                }
                
                .barcode-label {
                    background: white;
                    border: 2px solid #000;
                    padding: ${size === 'full' ? '20px' : '8px'};
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    page-break-inside: avoid;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .label-header {
                    text-align: center;
                    margin-bottom: ${size === 'full' ? '12px' : '4px'};
                }
                
                .product-name {
                    display: block;
                    font-size: ${selectedSize.fontSize}px;
                    font-weight: bold;
                    color: #000;
                    margin-bottom: 2px;
                    word-wrap: break-word;
                    line-height: 1.2;
                }
                
                .category {
                    display: block;
                    font-size: ${selectedSize.fontSize - 2}px;
                    color: #666;
                    text-transform: uppercase;
                }
                
                .barcode-wrapper {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex: 1;
                }
                
                .barcode {
                    max-width: 100%;
                    height: auto;
                }
                
                .label-footer {
                    text-align: center;
                    margin-top: ${size === 'full' ? '12px' : '4px'};
                }
                
                .price {
                    font-size: ${selectedSize.fontSize + 2}px;
                    font-weight: bold;
                    color: #000;
                    margin-bottom: 2px;
                }
                
                .sku {
                    font-size: ${selectedSize.fontSize - 2}px;
                    color: #666;
                }
                
                .controls {
                    text-align: center;
                    margin: 20px 0;
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .controls button {
                    padding: 12px 24px;
                    font-size: 16px;
                    font-weight: 600;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    margin: 0 8px;
                }
                
                .print-btn {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                
                .close-btn {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                @media print {
                    body {
                        background: white;
                        padding: 0;
                    }
                    
                    .controls {
                        display: none;
                    }
                    
                    .labels-container {
                        gap: 5mm;
                    }
                    
                    .barcode-label {
                        box-shadow: none;
                        page-break-after: ${size === 'full' ? 'always' : 'auto'};
                    }
                }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
            <div class="controls">
                <button class="print-btn" onclick="window.print()">
                    🖨️ Print ${copies} Label${copies > 1 ? 's' : ''}
                </button>
                <button class="close-btn" onclick="window.close()">
                    ❌ Close
                </button>
            </div>
            
            <div class="labels-container">
                ${labelsHTML}
            </div>
            
            <script>
                document.querySelectorAll('.barcode').forEach(svg => {
                    const barcodeValue = svg.getAttribute('data-barcode');
                    JsBarcode(svg, barcodeValue, {
                        format: "CODE128",
                        width: ${selectedSize.barcodeWidth},
                        height: ${selectedSize.barcodeHeight},
                        displayValue: true,
                        fontSize: ${selectedSize.fontSize},
                        margin: 5
                    });
                });
                
                // Auto print after barcodes are generated
                setTimeout(() => {
                    // Uncomment to auto-print
                    // window.print();
                }, 500);
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Add spinning animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spinning {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .spinning {
        animation: spinning 1s linear infinite;
    }
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Auto-initialize when Add Item module is shown
document.addEventListener('DOMContentLoaded', () => {
    const addItemModule = document.getElementById('inventory-add-item-module');
    if (addItemModule && addItemModule.classList.contains('active')) {
        initializeAddItemForm();
    }
    
    // Watch for module changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'inventory-add-item-module' && 
                mutation.target.classList.contains('active')) {
                initializeAddItemForm();
            }
        });
    });
    
    if (addItemModule) {
        observer.observe(addItemModule, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
});

// Export functions
window.AddItem = {
    initialize: initializeAddItemForm,
    generateSKU,
    generateBarcode: generateBarcodeNumber,
    printBarcode
};
