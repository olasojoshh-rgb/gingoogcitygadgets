const SHEET_NAMES = {
  products: "Products",
  stockIn: "Stock In",
  stockOut: "Stock Out",
  logs: "Activity Logs",
  users: "Users"
};

const SPREADSHEET_ID = "1CMK5xdPy4_xXpJyVXEiNqJiBK1PvodZ_UFblgzLX224";

function getDatabaseSpreadsheet() {
  if (SPREADSHEET_ID === "1CMK5xdPy4_xXpJyVXEiNqJiBK1PvodZ_UFblgzLX224") {
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function doGet(event) {
  if (event && event.parameter && event.parameter.action === "login") {
    return jsonResponse(authenticateUser(event.parameter.email, event.parameter.passwordHash));
  }

  return ContentService
    .createTextOutput(JSON.stringify(readInventory()))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const data = JSON.parse(event.postData.contents || "{}");
  writeInventory(data);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readInventory() {
  const spreadsheet = getDatabaseSpreadsheet();

  return {
    products: readRows(spreadsheet, SHEET_NAMES.products),
    stockInRecords: readRows(spreadsheet, SHEET_NAMES.stockIn),
    stockOutRecords: readRows(spreadsheet, SHEET_NAMES.stockOut),
    activityLogs: readRows(spreadsheet, SHEET_NAMES.logs),
    stockInTotal: Number(PropertiesService.getScriptProperties().getProperty("stockInTotal")) || 0,
    stockOutTotal: Number(PropertiesService.getScriptProperties().getProperty("stockOutTotal")) || 0
  };
}

function writeInventory(data) {
  const spreadsheet = getDatabaseSpreadsheet();

  writeRows(spreadsheet, SHEET_NAMES.products, data.products || [], ["name", "category", "quantity"]);
  writeRows(spreadsheet, SHEET_NAMES.stockIn, data.stockInRecords || [], ["product", "quantity", "date"]);
  writeRows(spreadsheet, SHEET_NAMES.stockOut, data.stockOutRecords || [], ["product", "quantity", "date"]);
  writeRows(spreadsheet, SHEET_NAMES.logs, data.activityLogs || [], ["action", "product", "details", "date"]);

  PropertiesService.getScriptProperties().setProperties({
    stockInTotal: String(data.stockInTotal || 0),
    stockOutTotal: String(data.stockOutTotal || 0)
  });
}

function authenticateUser(email, passwordHash) {
  const spreadsheet = getDatabaseSpreadsheet();
  const users = readRows(spreadsheet, SHEET_NAMES.users);
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedHash = String(passwordHash || "").trim().toLowerCase();
  const user = users.find(item =>
    String(item.email || "").trim().toLowerCase() === normalizedEmail &&
    String(item.passwordHash || "").trim().toLowerCase() === normalizedHash
  );

  return {
    success: Boolean(user),
    email: user ? user.email : ""
  };
}

function setupUsers() {
  const spreadsheet = getDatabaseSpreadsheet();
  const sheet = getSheet(spreadsheet, SHEET_NAMES.users);
  const headers = ["email", "passwordHash", "createdAt"];

  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.appendRow([
    "admin@gmail.com",
    hashPassword("admin123"),
    new Date()
  ]);
}

function setupDatabase() {
  const spreadsheet = getDatabaseSpreadsheet();

  writeRows(spreadsheet, SHEET_NAMES.products, [], ["name", "category", "quantity"]);
  writeRows(spreadsheet, SHEET_NAMES.stockIn, [], ["product", "quantity", "date"]);
  writeRows(spreadsheet, SHEET_NAMES.stockOut, [], ["product", "quantity", "date"]);
  writeRows(spreadsheet, SHEET_NAMES.logs, [], ["action", "product", "details", "date"]);
  setupUsers();
}

function hashPassword(password) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );

  return bytes.map(byte => {
    const value = byte < 0 ? byte + 256 : byte;
    return (value < 16 ? "0" : "") + value.toString(16);
  }).join("");
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function readRows(spreadsheet, sheetName) {
  const sheet = getSheet(spreadsheet, sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];
  return values.slice(1).map(row => headers.reduce((item, header, index) => {
    item[header] = row[index];
    return item;
  }, {}));
}

function writeRows(spreadsheet, sheetName, rows, headers) {
  const sheet = getSheet(spreadsheet, sheetName);
  sheet.clearContents();
  sheet.appendRow(headers);

  rows.forEach(row => {
    sheet.appendRow(headers.map(header => row[header] ?? ""));
  });
}

function getSheet(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}
