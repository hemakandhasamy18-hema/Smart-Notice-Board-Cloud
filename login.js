import { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    doc, 
    getDoc 
} from "./firebase.js";
import { showToast } from "./auth.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

// Handle User Login
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showToast("Please enter email and password", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `Signing in...`;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch role from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        let role = "student";
        if (userDoc.exists()) {
            role = userDoc.data().role || "student";
        }

        showToast("Login successful! Redirecting...", "success");

        setTimeout(() => {
            if (role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "student.html";
            }
        }, 1000);

    } catch (error) {
        console.error("Login Error:", error);
        let errorMsg = "Login failed. Check your credentials.";
        if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
            errorMsg = "Invalid email or password.";
        } else if (error.code === "auth/invalid-email") {
            errorMsg = "Invalid email format.";
        }
        showToast(errorMsg, "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Sign In`;
    }
});

// Handle Password Reset
forgotPasswordBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    if (!email) {
        showToast("Enter your email address above to reset password", "info");
        emailInput.focus();
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showToast("Password reset email sent! Check your inbox.", "success");
    } catch (error) {
        showToast("Failed to send reset email: " + error.message, "error");
    }
});
