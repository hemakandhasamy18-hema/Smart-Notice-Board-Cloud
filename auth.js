import { 
    auth, 
    db, 
    onAuthStateChanged, 
    signOut, 
    doc, 
    getDoc 
} from "./firebase.js";

// Global Toast notification utility
export function showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Current User State
export let currentUser = null;
export let userRole = "student";

export function protectRoute(requiredRole = null, callback = null) {
    onAuthStateChanged(auth, async (user) => {
        const currentPath = window.location.pathname;

        if (!user) {
            // Unauthenticated user attempting to access protected routes
            if (currentPath.includes("admin.html") || currentPath.includes("student.html")) {
                showToast("Please log in to continue", "error");
                window.location.href = "login.html";
                return;
            }
            if (callback) callback(null, null);
            return;
        }

        currentUser = user;

        // Fetch User role from Firestore 'users' collection
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);
            
            if (userSnap.exists()) {
                userRole = userSnap.data().role || "student";
            } else {
                userRole = "student";
            }
        } catch (err) {
            console.error("Error fetching user role:", err);
            userRole = "student";
        }

        // Check page permissions
        if (requiredRole === "admin" && userRole !== "admin") {
            showToast("Access denied! Admins only.", "error");
            window.location.href = "student.html";
            return;
        }

        // Update UI Nav elements if present
        renderUserHeader(user, userRole);

        if (callback) callback(user, userRole);
    });
}

function renderUserHeader(user, role) {
    const navLinks = document.getElementById("navLinks");
    if (navLinks) {
        navLinks.innerHTML = `
            <div class="user-badge">
                👤 <span>${user.displayName || user.email}</span>
                <span class="role-pill ${role === 'admin' ? 'admin' : ''}">${role}</span>
            </div>
            ${role === 'admin' ? '<a href="admin.html" class="btn btn-secondary btn-sm">Admin Panel</a>' : ''}
            <a href="student.html" class="btn btn-secondary btn-sm">Notices</a>
            <button id="logoutBtn" class="btn btn-danger btn-sm">Logout</button>
        `;

        document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);
    }
}

export async function handleLogout() {
    try {
        await signOut(auth);
        showToast("Logged out successfully", "success");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 800);
    } catch (err) {
        showToast("Logout failed: " + err.message, "error");
    }
}
