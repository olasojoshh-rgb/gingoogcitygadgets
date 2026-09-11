let products = [];
let editingProductIndex = -1;
const LOW_STOCK_LIMIT = 6;
let stockInTotal = 0;
let stockOutTotal = 0;
let stockInRecords = [];
let stockOutRecords = [];
let activityLogs = [];
let dataLoaded = false;
const STORAGE_KEY = "gingoogs_gadgets_inventory";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylUq6E-7d4k1-JhWSG6b9EfjjuRLqcyp-3DpELRsdSTxmbd1Lq-eXdX2ZLHtANILqf/exec";

function toggleSidebar() {

    const sidebar = document.querySelector(".sidebar");
    const backdrop = document.getElementById("menuBackdrop");
    const menuToggle = document.getElementById("menuToggle");
    const isOpen = sidebar.classList.toggle("open");

    backdrop.classList.toggle("visible", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function loadSavedData() {

    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
        return;
    }

    try {
        const data = JSON.parse(savedData);
        products = Array.isArray(data.products) ? data.products : [];
        stockInTotal = Number(data.stockInTotal) || 0;
        stockOutTotal = Number(data.stockOutTotal) || 0;
        stockInRecords = Array.isArray(data.stockInRecords) ? data.stockInRecords : [];
        stockOutRecords = Array.isArray(data.stockOutRecords) ? data.stockOutRecords : [];
        activityLogs = Array.isArray(data.activityLogs) ? data.activityLogs : [];
    } catch (error) {
        console.error("Could not load saved inventory data", error);
    }
}

function saveData() {

    const data = {
        products,
        stockInTotal,
        stockOutTotal,
        stockInRecords,
        stockOutRecords,
        activityLogs
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (APPS_SCRIPT_URL) {
        fetch(APPS_SCRIPT_URL, {
            body: JSON.stringify(data),
            method: "POST",
            mode: "no-cors"
        }).catch(error => console.error("Could not sync with Apps Script", error));
    }
}

async function loadFromAppsScript() {

    if (!APPS_SCRIPT_URL) {
        return;
    }

    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();
        products = Array.isArray(data.products) ? data.products : products;
        stockInTotal = Number(data.stockInTotal) || stockInTotal;
        stockOutTotal = Number(data.stockOutTotal) || stockOutTotal;
        stockInRecords = Array.isArray(data.stockInRecords) ? data.stockInRecords : stockInRecords;
        stockOutRecords = Array.isArray(data.stockOutRecords) ? data.stockOutRecords : stockOutRecords;
        activityLogs = Array.isArray(data.activityLogs) ? data.activityLogs : activityLogs;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            products,
            stockInTotal,
            stockOutTotal,
            stockInRecords,
            stockOutRecords,
            activityLogs
        }));
        loadDashboard();
    } catch (error) {
        console.error("Could not load data from Apps Script", error);
    }
}

function navigateTo(section) {

    const sectionTargets = {
        dashboard: "dashboardPage",
        products: "productsPage",
        "stock-in": "stockInPage",
        "stock-out": "stockOutPage",
        "low-stock": "lowStockPage",
        reports: "reportsPage",
        "activity-logs": "activityLogsPage"
    };

    const sectionTitles = {
        dashboard: "Inventory Dashboard",
        products: "Product Management",
        "stock-in": "Stock In",
        "stock-out": "Stock Out",
        "low-stock": "Low Stock Products",
        reports: "Reports",
        "activity-logs": "Activity Logs"
    };

    document.querySelectorAll(".sidebar li").forEach(menuItem => {
        menuItem.classList.remove("active");
    });

    document.querySelector(`.sidebar li[onclick="navigateTo('${section}')"]`)
        .classList.add("active");

    const targetId = sectionTargets[section];

    if (targetId) {
        document.querySelectorAll(".page-section").forEach(page => {
            page.classList.remove("active");
        });

        document.getElementById(targetId).classList.add("active");
        document.getElementById("pageTitle").innerText = sectionTitles[section];
        populateStockProductOptions();

        if (document.querySelector(".sidebar").classList.contains("open")) {
            toggleSidebar();
        }

        return;
    }

    alert("This section is not available yet.");
}

function loadDashboard() {

    if (!dataLoaded) {
        loadSavedData();
        dataLoaded = true;
        loadFromAppsScript();
    }

    document.getElementById("totalProducts").innerText =
        products.length;

    document.getElementById("totalStockIn").innerText =
        stockInTotal;

    document.getElementById("totalStockOut").innerText =
        stockOutTotal;

    document.getElementById("lowStock").innerText =
        products.filter(p => p.quantity <= LOW_STOCK_LIMIT).length;

    displayDashboardTables();
    displayLowStockPage();
    displayReports();
    displayActivityLogs();
    populateStockProductOptions();
    displayStockRecords();
}

function displayReports() {

    const totalItems = products.reduce((total, product) => total + product.quantity, 0);
    const lowStockProducts = products.filter(product => product.quantity <= LOW_STOCK_LIMIT);
    const inventoryTable = document.getElementById("reportInventoryTable");
    const movementTable = document.getElementById("reportMovementTable");

    document.getElementById("reportTotalProducts").innerText = products.length;
    document.getElementById("reportTotalItems").innerText = totalItems;
    document.getElementById("reportLowStock").innerText = lowStockProducts.length;

    inventoryTable.innerHTML = products.length === 0 ?
        `<tr><td colspan="4" class="empty-table">No products available</td></tr>` :
        products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.quantity}</td>
                <td>${product.quantity <= LOW_STOCK_LIMIT ? "Low Stock" : "In Stock"}</td>
            </tr>
        `).join("");

    const movements = [
        ...stockInRecords.map(record => ({...record, type: "Stock In" })),
        ...stockOutRecords.map(record => ({...record, type: "Stock Out" }))
    ];

    movementTable.innerHTML = movements.length === 0 ?
        `<tr><td colspan="4" class="empty-table">No stock movements yet</td></tr>` :
        movements.map(record => `
            <tr>
                <td>${record.type}</td>
                <td>${record.product}</td>
                <td>${record.quantity}</td>
                <td>${record.date}</td>
            </tr>
        `).join("");
}

function printReport() {
    window.print();
}

function logActivity(action, product, details) {

    activityLogs.unshift({
        action,
        product,
        details,
        date: new Date().toLocaleString()
    });

    displayActivityLogs();
}

function displayActivityLogs() {

    const table = document.getElementById("activityLogTable");

    if (!table) {
        return;
    }

    table.innerHTML = activityLogs.length === 0 ?
        `<tr><td colspan="4" class="empty-table">No activity logs yet</td></tr>` :
        activityLogs.map(log => `
            <tr>
                <td>${log.action}</td>
                <td>${log.product}</td>
                <td>${log.details}</td>
                <td>${log.date}</td>
            </tr>
        `).join("");
}

function clearActivityLogs() {

    if (!activityLogs.length) {
        return;
    }

    if (confirm("Clear all activity logs?")) {
        activityLogs = [];
        saveData();
        displayActivityLogs();
    }
}

function displayLowStockPage() {

    const table = document.getElementById("lowStockPageTable");

    if (!table) {
        return;
    }

    const lowStockProducts = products
        .map((product, index) => ({ product, index }))
        .filter(item => item.product.quantity <= LOW_STOCK_LIMIT);

    table.innerHTML = lowStockProducts.length === 0 ?
        `<tr><td colspan="4" class="empty-table">No low stock products</td></tr>` :
        lowStockProducts.map(item => `
            <tr>
                <td>${item.product.name}</td>
                <td>${item.product.category}</td>
                <td>${item.product.quantity}</td>
                <td>
                    <button class="restock-button" onclick="openStockIn(${item.index})">Stock In</button>
                </td>
            </tr>
        `).join("");
}

function openStockIn(productIndex) {

    navigateTo("stock-in");
    document.getElementById("stockInProduct").value = productIndex;
}

function populateStockProductOptions() {

    ["stockInProduct", "stockOutProduct"].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) {
            return;
        }

        select.innerHTML = products.length === 0 ?
            `<option value="">No products available</option>` :
            `<option value="">Select a product</option>` + products.map((product, index) =>
                `<option value="${index}">${product.name} (Stock: ${product.quantity})</option>`
            ).join("");
    });
}

function recordStockIn() {

    const productIndex = parseInt(document.getElementById("stockInProduct").value);
    const quantity = parseInt(document.getElementById("stockInQuantity").value);

    if (isNaN(productIndex) || isNaN(quantity) || quantity <= 0) {
        alert("Select a product and enter a valid quantity");
        return;
    }

    const product = products[productIndex];
    product.quantity += quantity;
    stockInTotal += quantity;
    logActivity("Stock In", product.name, `Added quantity: ${quantity}`);
    stockInRecords.unshift({
        product: product.name,
        quantity,
        date: new Date().toLocaleString()
    });

    document.getElementById("stockInQuantity").value = "";
    saveData();
    displayProducts();
    displayStockRecords();
    loadDashboard();
}

function recordStockOut() {

    const productIndex = parseInt(document.getElementById("stockOutProduct").value);
    const quantity = parseInt(document.getElementById("stockOutQuantity").value);

    if (isNaN(productIndex) || isNaN(quantity) || quantity <= 0) {
        alert("Select a product and enter a valid quantity");
        return;
    }

    const product = products[productIndex];

    if (quantity > product.quantity) {
        alert("Stock out quantity cannot exceed available stock");
        return;
    }

    product.quantity -= quantity;
    stockOutTotal += quantity;
    logActivity("Stock Out", product.name, `Removed quantity: ${quantity}`);
    stockOutRecords.unshift({
        product: product.name,
        quantity,
        date: new Date().toLocaleString()
    });

    document.getElementById("stockOutQuantity").value = "";
    saveData();
    displayProducts();
    displayStockRecords();
    loadDashboard();
}

function displayStockRecords() {

    document.getElementById("stockInTable").innerHTML = renderStockRecords(stockInRecords);
    document.getElementById("stockOutTable").innerHTML = renderStockRecords(stockOutRecords);
}

function renderStockRecords(records) {

    if (records.length === 0) {
        return `<tr><td colspan="3" class="empty-table">No records yet</td></tr>`;
    }

    return records.map(record => `
        <tr>
            <td>${record.product}</td>
            <td>${record.quantity}</td>
            <td>${record.date}</td>
        </tr>
    `).join("");
}

function displayDashboardTables() {

    const dashboardTable = document.getElementById("dashboardProductTable");
    const lowStockTable = document.getElementById("lowStockTable");
    const lowStockProducts = products.filter(product => product.quantity <= LOW_STOCK_LIMIT);

    dashboardTable.innerHTML = products.length === 0 ?
        `<tr><td colspan="3" class="empty-table">No products available</td></tr>` :
        products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.quantity}</td>
            </tr>
        `).join("");

    lowStockTable.innerHTML = lowStockProducts.length === 0 ?
        `<tr><td colspan="2" class="empty-table">No low stock products</td></tr>` :
        lowStockProducts.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
            </tr>
        `).join("");
}

function saveProduct() {

    let name =
        document.getElementById("productName").value;

    let category =
        document.getElementById("category").value;

    let quantity =
        parseInt(
            document.getElementById("quantity").value
        );

    if (name === "" || category === "" || isNaN(quantity)) {

        alert("Complete all fields");

        return;
    }

    const product = { name, category, quantity };

    if (editingProductIndex === -1) {
        products.push(product);
        logActivity("Add Product", name, `Added quantity: ${quantity}`);
    } else {
        const previousProduct = products[editingProductIndex];
        products[editingProductIndex] = product;
        logActivity("Edit Product", name, `Quantity changed from ${previousProduct.quantity} to ${quantity}`);
    }

    displayProducts();

    saveData();
    loadDashboard();

    resetProductForm();
}

function displayProducts() {

    let table =
        document.getElementById("productTable");

    table.innerHTML = "";

    products.forEach((product, index) => {

        table.innerHTML += `
        <tr>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.quantity}</td>
            <td class="action-buttons">
                <button class="edit-button" onclick="editProduct(${index})">Edit</button>
                <button class="delete-button" onclick="deleteProduct(${index})">Delete</button>
            </td>
        </tr>
        `;
    });
}

function editProduct(index) {

    const product = products[index];

    document.getElementById("productName").value = product.name;
    document.getElementById("category").value = product.category;
    document.getElementById("quantity").value = product.quantity;
    document.getElementById("formTitle").innerText = "Edit Product";
    document.getElementById("productSubmitButton").innerText = "Update Product";
    document.getElementById("cancelEditButton").hidden = false;
    editingProductIndex = index;
}

function deleteProduct(index) {

    const product = products[index];

    if (!confirm(`Delete ${product.name}?`)) {
        return;
    }

    logActivity("Delete Product", product.name, `Deleted quantity: ${product.quantity}`);
    products.splice(index, 1);
    saveData();
    displayProducts();
    loadDashboard();

    if (editingProductIndex === index) {
        resetProductForm();
    } else if (editingProductIndex > index) {
        editingProductIndex--;
    }
}

function cancelEdit() {
    resetProductForm();
}

function resetProductForm() {

    document.getElementById("productName").value = "";
    document.getElementById("category").value = "";
    document.getElementById("quantity").value = "";
    document.getElementById("formTitle").innerText = "Add Product";
    document.getElementById("productSubmitButton").innerText = "Add Product";
    document.getElementById("cancelEditButton").hidden = true;
    editingProductIndex = -1;
}

function logout() {

    const confirmLogout = confirm("Are you sure you want to logout?");

    if (confirmLogout) {

        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userEmail");
        window.location.href = "index.html";
    }
}