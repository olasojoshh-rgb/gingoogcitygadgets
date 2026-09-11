// Login Form
const loginForm = document.getElementById("loginForm");
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylUq6E-7d4k1-JhWSG6b9EfjjuRLqcyp-3DpELRsdSTxmbd1Lq-eXdX2ZLHtANILqf/exec";

async function hashPassword(password) {

    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hash))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function loginWithDatabase(email, password) {

    if (!APPS_SCRIPT_URL) {
        return null;
    }

    const passwordHash = await hashPassword(password);
    const url = `${APPS_SCRIPT_URL}?action=login&email=${encodeURIComponent(email)}&passwordHash=${passwordHash}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Apps Script returned HTTP ${response.status}`);
    }

    return response.json();
}

loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    let isAuthenticated = false;
    let databaseUnavailable = false;

    try {
        const databaseResult = await loginWithDatabase(email, password);
        isAuthenticated = databaseResult ? databaseResult.success : false;
    } catch (error) {
        console.error("Database login failed", error);
        databaseUnavailable = true;
    }

    // Keep the demo account available until the Apps Script URL is configured.
    const demoAccount = email === "admin@gmail.com" && password === "admin123";

    if (databaseUnavailable && !demoAccount) {

        message.textContent = "Database unavailable. Check Apps Script deployment and Spreadsheet ID.";
        message.style.color = "red";
        return;
    }

    if (isAuthenticated || demoAccount) {

        message.textContent = "Login successful!";
        message.style.color = "green";

        // Save login session
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userEmail", email);

        // Go to dashboard
        setTimeout(function() {
            window.location.href = "dash.html";
        }, 1000);

    } else {

        message.textContent = "Invalid email or password.";
        message.style.color = "red";

    }

});


// Show / Hide Password

const showPassword = document.getElementById("showPassword");
const passwordInput = document.getElementById("password");

showPassword.addEventListener("click", function() {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";
        showPassword.textContent = "Hide";

    } else {

        passwordInput.type = "password";
        showPassword.textContent = "Show";

    }

});


// Forgot Password

function forgotPassword() {

    alert(
        "Please contact the system administrator to reset your password."
    );

}