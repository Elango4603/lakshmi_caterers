/**
 * Lakshmi Caterings & Events - Main Application Logic
 */

// --- State Management ---
const AppState = {
    isLoggedIn: false, // Default false
    items: [],
    menus: [],
    orders: [],
    currentOrder: null,
    editingItemId: null,
    editingMenuId: null
};

const STORAGE_KEYS = {
    ITEMS: 'lakshmi_items',
    MENUS: 'lakshmi_menus',
    ORDERS: 'lakshmi_orders',
    SESSION: 'lakshmi_session' // Simple session persistence
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    ensureLoaderComponent();
    checkSession(); // Check login
    loadData();
    setupEventListeners();

    // Set default month for report
    const today = new Date();
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthInput = document.getElementById('month-filter');
    if (monthInput) monthInput.value = monthStr;
});

function ensureLoaderComponent() {
    if (!document.getElementById('global-loader')) {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'loader-overlay hidden';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    }
}

function checkSession() {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (session === 'active') {
        AppState.isLoggedIn = true;
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('main-app-view').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('main-app-view').classList.remove('hidden');
    renderAll();
}

function loadData() {
    AppState.items = JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS)) || [];
    AppState.menus = JSON.parse(localStorage.getItem(STORAGE_KEYS.MENUS)) || [];
    AppState.orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS)) || [];
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// --- Utils: Loader ---
async function withLoader(action, delay = 800) {
    const loader = document.getElementById('global-loader');
    loader.classList.remove('hidden');

    // Simulate network/processing delay for UX
    await new Promise(r => setTimeout(r, delay));

    try {
        await action();
    } catch (e) {
        console.error(e);
        showToast('An error occurred', 'error');
    } finally {
        loader.classList.add('hidden');
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Login
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem(STORAGE_KEYS.SESSION);
                AppState.isLoggedIn = false;
                window.location.reload(); // Simple reload to clear state
            }
        });
    }

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.getAttribute('data-target'));
        });
    });

    // Mobile Menu
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        document.getElementById('main-nav').classList.toggle('mobile-active');
    });

    // Item Master
    document.getElementById('add-item-btn').addEventListener('click', () => withLoader(addItem));
    const updateBtn = document.getElementById('update-item-btn');
    if (updateBtn) updateBtn.addEventListener('click', () => withLoader(updateItem));

    // Menu Master
    document.getElementById('save-menu-btn').addEventListener('click', () => withLoader(saveMenu));
    document.getElementById('cancel-menu-edit-btn').addEventListener('click', cancelMenuEdit);

    // Chip Selection Delegation
    const chipContainer = document.getElementById('menu-item-selector');
    if (chipContainer) {
        chipContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('chip')) {
                e.target.classList.toggle('selected');
            }
        });
    }

    // Order Section
    document.getElementById('menu-select').addEventListener('change', updateCartPreview);
    document.getElementById('order-quantity').addEventListener('input', updateCartPreview);
    document.getElementById('confirm-order-btn').addEventListener('click', () => withLoader(confirmOrder));
    document.getElementById('clear-order-btn').addEventListener('click', clearOrderForm);

    // Reports
    const monthFilter = document.getElementById('month-filter');
    if (monthFilter) monthFilter.addEventListener('change', renderRevenueReport);

    // Exports
    document.getElementById('export-pdf-btn').addEventListener('click', () => withLoader(generatePDF));
    document.getElementById('export-word-btn').addEventListener('click', () => withLoader(generateWord));
    document.getElementById('export-excel-btn').addEventListener('click', () => withLoader(generateExcel));
}

function handleLogin() {
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;

    if (u && p) {
        // Any login works for demo, or specifically 'admin'
        withLoader(async () => {
            localStorage.setItem(STORAGE_KEYS.SESSION, 'active');
            AppState.isLoggedIn = true;
            showApp();
        }, 1500); // Longer load for login effect
    }
}

// --- Navigation ---
function navigateTo(targetId) {
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('data-target') === targetId) l.classList.add('active');
    });

    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(targetId).classList.add('active-section');

    if (targetId === 'order-section') populateMenuSelect();
    if (targetId === 'reports-section') renderRevenueReport();

    document.getElementById('main-nav').classList.remove('mobile-active');
}

// --- Item Master Logic ---
function addItem() {
    const input = document.getElementById('item-name-input');
    const name = input.value.trim();

    if (!name) return showToast('Please enter an item name', 'error');

    const newItem = {
        id: Date.now().toString(),
        name: name
    };

    AppState.items.push(newItem);
    saveData(STORAGE_KEYS.ITEMS, AppState.items);

    input.value = '';
    renderItems();
    showToast('Item added successfully');
}

function updateItem() {
    if (!AppState.editingItemId) return;

    const input = document.getElementById('item-name-input');
    const name = input.value.trim();

    if (!name) return showToast('Please enter an item name', 'error');

    const index = AppState.items.findIndex(i => i.id === AppState.editingItemId);
    if (index > -1) {
        AppState.items[index].name = name;
        saveData(STORAGE_KEYS.ITEMS, AppState.items);
    }

    // Reset UI
    AppState.editingItemId = null;
    input.value = '';

    const addBtn = document.getElementById('add-item-btn');
    const updBtn = document.getElementById('update-item-btn');
    addBtn.classList.remove('hidden');
    updBtn.classList.add('hidden');

    renderItems();
    showToast('Item updated successfully');
}

window.editItem = function (id) {
    const item = AppState.items.find(i => i.id === id);
    if (!item) return;

    AppState.editingItemId = id;
    document.getElementById('item-name-input').value = item.name;

    const addBtn = document.getElementById('add-item-btn');
    const updBtn = document.getElementById('update-item-btn');

    addBtn.classList.add('hidden');
    updBtn.classList.remove('hidden');

    document.getElementById('item-name-input').focus();
};

window.deleteItem = function (id) {
    if (!confirm('Delete this item? It will be removed from existing menus.')) return;

    withLoader(async () => {
        AppState.items = AppState.items.filter(i => i.id !== id);
        saveData(STORAGE_KEYS.ITEMS, AppState.items);

        AppState.menus.forEach(m => {
            m.items = m.items.filter(itemId => itemId !== id);
        });
        saveData(STORAGE_KEYS.MENUS, AppState.menus);

        renderItems();
    });
};

function renderItems() {
    const list = document.getElementById('items-list');
    list.innerHTML = '';

    if (AppState.items.length === 0) {
        list.innerHTML = '<div class="empty-state">No items added yet.</div>';
        renderMenuItemSelector();
        return;
    }

    AppState.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-tag';
        div.innerHTML = `
            <span>${item.name}</span>
            <div class="item-icon-group">
                <i class="fas fa-edit edit-item" onclick="editItem('${item.id}')"></i>
                <i class="fas fa-trash-alt delete-item" onclick="deleteItem('${item.id}')"></i>
            </div>
        `;
        list.appendChild(div);
    });

    renderMenuItemSelector();
}


// --- Menu Master Logic ---
function renderMenuItemSelector() {
    const container = document.getElementById('menu-item-selector');
    container.innerHTML = '';

    if (AppState.items.length === 0) {
        container.innerHTML = '<p class="text-muted">No items available. Add items first.</p>';
        return;
    }

    AppState.items.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = item.name;
        chip.setAttribute('data-id', item.id);

        if (AppState.editingMenuId) {
            const menu = AppState.menus.find(m => m.id === AppState.editingMenuId);
            if (menu && menu.items.includes(item.id)) {
                chip.classList.add('selected');
            }
        }

        container.appendChild(chip);
    });
}

function saveMenu() {
    const nameInput = document.getElementById('menu-name');
    const priceInput = document.getElementById('menu-price');
    const selectedChips = document.querySelectorAll('#menu-item-selector .chip.selected');

    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!name || isNaN(price)) return showToast('Please enter valid menu details', 'error');

    const selectedItemIds = Array.from(selectedChips).map(c => c.getAttribute('data-id'));

    if (AppState.editingMenuId) {
        const index = AppState.menus.findIndex(m => m.id === AppState.editingMenuId);
        if (index > -1) {
            AppState.menus[index] = { ...AppState.menus[index], name, price, items: selectedItemIds };
        }
        AppState.editingMenuId = null;
        document.getElementById('save-menu-btn').innerHTML = '<i class="fas fa-save"></i> Save Menu';
        document.getElementById('cancel-menu-edit-btn').classList.add('hidden');
    } else {
        const newMenu = {
            id: Date.now().toString(),
            name,
            price,
            items: selectedItemIds
        };
        AppState.menus.push(newMenu);
    }

    saveData(STORAGE_KEYS.MENUS, AppState.menus);
    renderMenus();
    clearMenuForm();
    showToast('Menu saved successfully');
}

window.editMenu = function (id) {
    const menu = AppState.menus.find(m => m.id === id);
    if (!menu) return;

    AppState.editingMenuId = id;
    document.getElementById('menu-name').value = menu.name;
    document.getElementById('menu-price').value = menu.price;

    renderMenuItemSelector();

    document.getElementById('save-menu-btn').innerHTML = '<i class="fas fa-save"></i> Update Menu';
    document.getElementById('cancel-menu-edit-btn').classList.remove('hidden');

    document.querySelector('.input-card').scrollIntoView({ behavior: 'smooth' });
};

function cancelMenuEdit() {
    AppState.editingMenuId = null;
    clearMenuForm();
    document.getElementById('save-menu-btn').innerHTML = '<i class="fas fa-save"></i> Save Menu';
    document.getElementById('cancel-menu-edit-btn').classList.add('hidden');
    renderMenuItemSelector();
}

window.deleteMenu = function (id) {
    if (!confirm('Delete this menu?')) return;

    withLoader(async () => {
        AppState.menus = AppState.menus.filter(m => m.id !== id);
        saveData(STORAGE_KEYS.MENUS, AppState.menus);
        renderMenus();
    });
};

function clearMenuForm() {
    document.getElementById('menu-name').value = '';
    document.getElementById('menu-price').value = '';
    document.querySelectorAll('#menu-item-selector .chip').forEach(c => c.classList.remove('selected'));
}

function renderMenus() {
    const list = document.getElementById('menus-list');
    list.innerHTML = '';

    if (AppState.menus.length === 0) {
        list.innerHTML = '<p class="text-muted">No menus created yet.</p>';
        return;
    }

    AppState.menus.forEach(menu => {
        const itemNames = menu.items
            .map(id => AppState.items.find(i => i.id === id)?.name)
            .filter(n => n)
            .join(', ');

        const div = document.createElement('div');
        div.className = 'menu-item-card';
        div.innerHTML = `
            <div class="menu-info">
                <h4>${menu.name}</h4>
                <div class="price">₹${menu.price.toFixed(2)} / plate</div>
                <small class="text-muted">${itemNames || 'No items selected'}</small>
            </div>
            <div class="menu-actions">
                <button class="btn-edit" onclick="editMenu('${menu.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" onclick="deleteMenu('${menu.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}


// --- Order Logic ---
function populateMenuSelect() {
    const select = document.getElementById('menu-select');
    select.innerHTML = '<option value="">-- Select a Menu --</option>';

    AppState.menus.forEach(menu => {
        const option = document.createElement('option');
        option.value = menu.id;
        option.textContent = `${menu.name} - ₹${menu.price}`;
        select.appendChild(option);
    });
}

function updateCartPreview() {
    const menuId = document.getElementById('menu-select').value;
    const qty = parseInt(document.getElementById('order-quantity').value) || 0;
    const preview = document.getElementById('cart-preview');

    if (!menuId || qty < 1) {
        preview.classList.add('hidden');
        disableExportButtons(true);
        AppState.currentOrder = null;
        return;
    }

    const menu = AppState.menus.find(m => m.id === menuId);
    if (!menu) return;

    const total = menu.price * qty;
    const itemNames = menu.items.map(id => AppState.items.find(i => i.id === id)?.name).filter(n => n);

    document.getElementById('cart-menu-name').textContent = menu.name;
    document.getElementById('cart-total-price').textContent = `₹${total.toFixed(2)}`;
    document.getElementById('cart-price-plate').textContent = menu.price.toFixed(2);
    document.getElementById('cart-qty-display').textContent = qty;

    const itemList = document.getElementById('cart-items-ul');
    itemList.innerHTML = itemNames.map(n => `<li>${n}</li>`).join('');

    preview.classList.remove('hidden');

    const clientName = document.getElementById('client-name').value.trim() || 'Guest';
    const clientPhone = document.getElementById('client-phone')?.value.trim() || '';
    const clientAddress = document.getElementById('client-address')?.value.trim() || '';

    AppState.currentOrder = {
        id: Date.now().toString(),
        clientName,
        clientPhone,
        clientAddress,
        menuName: menu.name,
        menuPrice: menu.price,
        items: itemNames,
        quantity: qty,
        totalAmount: total,
        date: new Date().toISOString()
    };
}

function confirmOrder() {
    updateCartPreview();

    if (!AppState.currentOrder) return showToast('Please select a menu and quantity', 'error');

    AppState.orders.push(AppState.currentOrder);
    saveData(STORAGE_KEYS.ORDERS, AppState.orders);

    showToast('Order confirmed & saved!');
    disableExportButtons(false);
}

function clearOrderForm() {
    document.getElementById('client-name').value = '';
    const nameEl = document.getElementById('client-name');
    const phoneEl = document.getElementById('client-phone');
    const addrEl = document.getElementById('client-address');

    if (nameEl) nameEl.value = '';
    if (phoneEl) phoneEl.value = '';
    if (addrEl) addrEl.value = '';

    document.getElementById('menu-select').value = '';
    document.getElementById('order-quantity').value = 1;
    updateCartPreview();
    disableExportButtons(true);
}

function disableExportButtons(disabled) {
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = disabled);
}


// --- Reports Logic ---

window.viewOrder = function (orderId) {
    const order = AppState.orders.find(o => o.id === orderId);
    if (!order) return showToast("Order not found.", "error");

    // Switch to Order Section
    navigateTo('order-section');

    // Fill Form
    document.getElementById('client-name').value = order.clientName;
    const phoneEl = document.getElementById('client-phone');
    const addrEl = document.getElementById('client-address');
    if (phoneEl) phoneEl.value = order.clientPhone || '';
    if (addrEl) addrEl.value = order.clientAddress || '';

    // Set Menu and Qty
    const menu = AppState.menus.find(m => m.name === order.menuName); // Try to find by name if ID matches changed
    if (menu) {
        document.getElementById('menu-select').value = menu.id;
    }
    document.getElementById('order-quantity').value = order.quantity;

    // Trigger Update
    updateCartPreview();

    showToast("Order details loaded.", "success");
}

function renderRevenueReport() {
    const tbody = document.getElementById('revenue-table-body');
    const totalRevDisplay = document.getElementById('total-revenue-display');
    const totalOrdersDisplay = document.getElementById('total-orders-display');
    const filterInput = document.getElementById('month-filter');

    tbody.innerHTML = ''; // Clear

    const monthValue = filterInput ? filterInput.value : '';

    let grandTotal = 0;

    const sortedOrders = [...AppState.orders].sort((a, b) => new Date(b.date) - new Date(a.date));

    const filteredOrders = sortedOrders.filter(order => {
        if (!monthValue) return true;
        const orderDate = new Date(order.date);
        const orderMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        return orderMonth === monthValue;
    });

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No orders found for this period.</td></tr>';
        totalRevDisplay.textContent = '₹0.00';
        totalOrdersDisplay.textContent = '0';
        return;
    }

    filteredOrders.forEach(order => {
        grandTotal += order.totalAmount;

        const row = document.createElement('tr');
        const dateStr = new Date(order.date).toLocaleDateString();
        // Add Phone column and Receipt Action
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${order.clientName}</td>
            <td>${order.clientPhone || '-'}</td>
            <td>${order.menuName}</td>
            <td>${order.quantity}</td>
            <td>₹${order.totalAmount.toFixed(2)}</td>
            <td>
                <button class="btn text-btn" onclick="viewOrder('${order.id}')">
                    <i class="fas fa-receipt"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    totalRevDisplay.textContent = `₹${grandTotal.toFixed(2)}`;
    totalOrdersDisplay.textContent = filteredOrders.length;
}


// --- Export Utilities ---
// --- Export Utilities ---
function generateSafeLogo() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // Circle Background
    ctx.fillStyle = "#0F2557"; // Primary
    ctx.beginPath();
    ctx.arc(100, 100, 95, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = "#D4AF37"; // Gold
    ctx.lineWidth = 10;
    ctx.stroke();

    // Text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 80px Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LC", 100, 100);

    return canvas.toDataURL('image/png');
}

function generatePDF() {
    if (!AppState.currentOrder) return;

    (async () => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const o = AppState.currentOrder;

            // Add Logo
            const logoData = generateSafeLogo();
            doc.addImage(logoData, 'PNG', 15, 10, 30, 30);

            // Header
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(15, 37, 87); // Primary Color
            doc.text("Lakshmi Caterings & Events", 55, 20);

            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text("Professional Catering Services", 55, 28);

            // Divider
            doc.setDrawColor(212, 175, 55); // Gold
            doc.setLineWidth(1.5);
            doc.line(10, 45, 200, 45);

            // Client Info Section
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text("INVOICE", 10, 58);

            doc.setFontSize(11);
            doc.setTextColor(50);

            // Left Column: Client Details
            doc.text(`Client: ${o.clientName}`, 10, 68);
            doc.text(`Phone: ${o.clientPhone || 'N/A'}`, 10, 75);

            const splitAddr = doc.splitTextToSize(`Address: ${o.clientAddress || 'N/A'}`, 90);
            doc.text(splitAddr, 10, 82);

            // Right Column: Invoice Details
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 68);
            doc.text(`Order ID: #${o.id.slice(-6)}`, 140, 75);

            // Calculate start position for table
            const addrHeight = splitAddr.length * 5;
            const tableStartY = Math.max(95, 82 + addrHeight + 10);

            // Main Items Table
            doc.autoTable({
                startY: tableStartY,
                head: [['Menu Package', 'Price/Plate', 'Qty', 'Total']],
                body: [
                    [o.menuName, `Rs ${o.menuPrice}`, o.quantity, `Rs ${o.totalAmount}`]
                ],
                theme: 'grid',
                headStyles: {
                    fillColor: [15, 37, 87],
                    fontSize: 12
                },
                styles: {
                    fontSize: 12, // Font size for table content
                    cellPadding: 6
                }
            });

            // Included Items List - Font Size 14px as requested
            const itemsY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.setTextColor(15, 37, 87);
            doc.text("Included Menu Items:", 14, itemsY);

            // Create a simple table for items to handle alignment and font size
            const itemRows = o.items.map(i => [i]);
            doc.autoTable({
                startY: itemsY + 5,
                body: itemRows,
                theme: 'plain',
                styles: {
                    fontSize: 14, // Requested 14px
                    cellPadding: 3,
                },
                columnStyles: {
                    0: { cellWidth: 180 }
                }
            });

            // Footer
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(10);
            doc.setTextColor(128);
            doc.text("Thank you for choosing Lakshmi Caterings!", 105, pageHeight - 20, { align: "center" });
            doc.text("Developed by Elango", 105, pageHeight - 15, { align: "center" });

            doc.save(`Invoice_${o.clientName}_${o.id.slice(-4)}.pdf`);
        } catch (e) {
            console.error("PDF Gen Error:", e);
            showToast("Failed to generate PDF.", "error");
        }
    })();
}

function generateWord() {
    if (!AppState.currentOrder) return;
    const o = AppState.currentOrder;

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, ImageRun, AlignmentType, BorderStyle } = window.docx;

    // Convert Logo Base64 to ArrayBuffer for docx
    const logoBase64 = generateSafeLogo();
    const logoString = logoBase64.split(',')[1];
    const logoBytes = window.atob(logoString);
    const logoBuffer = new Uint8Array(logoBytes.length);
    for (let i = 0; i < logoBytes.length; i++) {
        logoBuffer[i] = logoBytes.charCodeAt(i);
    }

    // Styles
    const cellStyle = {
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
    };

    // Header Table
    const tableHeader = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: "Menu Name", bold: true, size: 24 })], ...cellStyle }),
            new TableCell({ children: [new Paragraph({ text: "Price", bold: true, size: 24 })], ...cellStyle }),
            new TableCell({ children: [new Paragraph({ text: "Qty", bold: true, size: 24 })], ...cellStyle }),
            new TableCell({ children: [new Paragraph({ text: "Total", bold: true, size: 24 })], ...cellStyle }),
        ],
    });

    const tableRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: o.menuName, size: 24 })], ...cellStyle }),
            new TableCell({ children: [new Paragraph({ text: o.menuPrice.toString(), size: 24 })], ...cellStyle }),
            new TableCell({ children: [new Paragraph({ text: o.quantity.toString(), size: 24 })], ...cellStyle }),
            new TableCell({ children: [new Paragraph({ text: o.totalAmount.toString(), size: 24 })], ...cellStyle }),
        ],
    });

    // Items List
    const itemParas = [new Paragraph({ text: "Included Items:", heading: HeadingLevel.HEADING_3, spacing: { before: 400 } })];
    o.items.forEach(i => {
        itemParas.push(new Paragraph({
            text: `• ${i}`,
            size: 28 // 14pt (docx size is half-points, so 28 = 14px approx)
        }));
    });

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: logoBuffer,
                            transformation: { width: 80, height: 80 }
                        })
                    ],
                    alignment: AlignmentType.CENTER
                }),
                new Paragraph({
                    text: "Lakshmi Caterings & Events",
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    text: `Invoice for ${o.clientName}`,
                    heading: HeadingLevel.HEADING_2,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 }
                }),
                new Paragraph({ text: `Phone: ${o.clientPhone || 'N/A'}` }),
                new Paragraph({ text: `Address: ${o.clientAddress || 'N/A'}` }),
                new Paragraph({ text: `Date: ${new Date().toLocaleDateString()}` }),
                new Paragraph({ text: "" }), // Spacer
                new Table({
                    rows: [tableHeader, tableRow],
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }),
                ...itemParas,
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Developed by Elango",
                    alignment: AlignmentType.CENTER,
                    color: "888888",
                    spacing: { before: 600 }
                })
            ],
        }],
    });

    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `Order_${o.clientName}.docx`);
    });
}

function generateExcel() {
    if (!AppState.currentOrder) return;
    const o = AppState.currentOrder;

    const data = [
        ["Lakshmi Caterings & Events"],
        ["Order Invoice"],
        [],
        ["Client Name", o.clientName],
        ["Phone", o.clientPhone || ''],
        ["Address", o.clientAddress || ''],
        ["Date", new Date().toLocaleDateString()],
        [],
        ["Menu Name", "Price per Plate", "Quantity", "Total Amount"],
        [o.menuName, o.menuPrice, o.quantity, o.totalAmount],
        [],
        ["Included Items"],
        ...o.items.map(i => [i]),
        [],
        ["Developed by Elango"]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, `Order_${o.clientName}.xlsx`);
}

// --- Utilities ---
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = msg;
    toast.style.backgroundColor = type === 'error' ? '#dc3545' : '#333';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function saveAs(blob, name) {
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        return window.navigator.msSaveOrOpenBlob(blob, name);
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function renderAll() {
    renderItems();
    renderMenus();
    populateMenuSelect();
    renderRevenueReport();
}
