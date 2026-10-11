import { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    updateProfile,
    doc, 
    setDoc,
    serverTimestamp 
} from "./firebase.js";
import { showToast } from "./auth.js";

const registerForm = document.getElementById("registerForm");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const roleInput = document.getElementById("role");
const submitBtn = document.getElementById("submitBtn");

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleInput.value;

    if (!fullName || !email || !password) {
        showToast("Please fill in all fields", "error");
        return;
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `Creating Account...`;

    try {
        // 1. Create Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update display name
        await updateProfile(user, { displayName: fullName });

        // 3. Save to Firestore 'users' collection
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            fullName: fullName,
            email: email,
            role: role,
            createdAt: serverTimestamp()
        });

        showToast("Account created successfully! Redirecting...", "success");

        setTimeout(() => {
            if (role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "student.html";
            }
        }, 1200);

    } catch (error) {
        console.error("Registration Error:", error);
        let errorMsg = "Registration failed. Try again.";
        if (error.code === "auth/email-already-in-use") {
            errorMsg = "Email is already registered. Please log in.";
        } else if (error.code === "auth/invalid-email") {
            errorMsg = "Invalid email format.";
        } else if (error.code === "auth/weak-password") {
            errorMsg = "Password is too weak.";
        }
        showToast(errorMsg, "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Create Account`;
    }
});
