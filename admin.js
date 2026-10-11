import { 
    db, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDocs,
    serverTimestamp 
} from "./firebase.js";
import { protectRoute, showToast } from "./auth.js";

// DOM Elements
const noticesTableBody = document.getElementById("noticesTableBody");
const usersTableBody = document.getElementById("usersTableBody");
const noticeFormModal = document.getElementById("noticeFormModal");
const noticeForm = document.getElementById("noticeForm");
const createNoticeBtn = document.getElementById("createNoticeBtn");
const closeFormModalBtn = document.getElementById("closeFormModalBtn");
const formModalTitle = document.getElementById("formModalTitle");
const saveNoticeBtn = document.getElementById("saveNoticeBtn");

// Stats Elements
const statTotalNotices = document.getElementById("statTotalNotices");
const statActiveNotices = document.getElementById("statActiveNotices");
const statPinnedNotices = document.getElementById("statPinnedNotices");
const statTotalUsers = document.getElementById("statTotalUsers");

// Image Handling
const imageInput = document.getElementById("image");
const imagePreview = document.getElementById("imagePreview");
let currentBase64Image = "";

// State
let noticesList = [];
let usersList = [];
let categoryChartInstance = null;
let viewsChartInstance = null;

// Protect route (Only admin allowed)
protectRoute("admin", () => {
    initAdminData();
});

function initAdminData() {
    // 1. Listen to Notices
    const noticesRef = collection(db, "notices");
    onSnapshot(noticesRef, (snapshot) => {
        noticesList = [];
        snapshot.forEach((docSnap) => {
            noticesList.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderNoticesTable();
        updateStats();
        updateCharts();
    }, (err) => {
        console.error("Notices listener error:", err);
    });

    // 2. Listen to Users
    const usersRef = collection(db, "users");
    onSnapshot(usersRef, (snapshot) => {
        usersList = [];
        snapshot.forEach((docSnap) => {
            usersList.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderUsersTable();
        updateStats();
    }, (err) => {
        console.error("Users listener error:", err);
    });
}

// Render Notices Table
function renderNoticesTable() {
    if (noticesList.length === 0) {
        noticesTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No notices posted yet. Click "Create Notice" to add one!</td></tr>`;
        return;
    }

    noticesTableBody.innerHTML = "";
    noticesList.forEach((n) => {
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td>
                <strong>${n.title}</strong>
                ${n.isPinned ? '📌' : ''}
            </td>
            <td><span class="badge badge-dept">${n.department || 'General'}</span></td>
            <td><span class="badge badge-priority-${n.priority || 'Medium'}">${n.priority || 'Medium'}</span></td>
            <td>${n.expiryDate || 'Unlimited'}</td>
            <td>
                <span class="badge" style="background:${n.active !== false ? '#d1fae5' : '#fee2e2'}; color:${n.active !== false ? '#059669' : '#dc2626'};">
                    ${n.active !== false ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${n.isPinned ? 'Yes' : 'No'}</td>
            <td>
                <div style="display:flex; gap:0.4rem;">
                    <button class="btn btn-secondary btn-sm toggle-pin-btn" data-id="${n.id}">
                        ${n.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button class="btn btn-secondary btn-sm toggle-active-btn" data-id="${n.id}">
                        ${n.active !== false ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-secondary btn-sm edit-btn" data-id="${n.id}">✏️ Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${n.id}">🗑️ Delete</button>
                </div>
            </td>
        `;

        // Action Handlers
        tr.querySelector(".toggle-pin-btn").addEventListener("click", () => togglePin(n.id, n.isPinned));
        tr.querySelector(".toggle-active-btn").addEventListener("click", () => toggleActive(n.id, n.active !== false));
        tr.querySelector(".edit-btn").addEventListener("click", () => openEditModal(n));
        tr.querySelector(".delete-btn").addEventListener("click", () => handleDelete(n.id));

        noticesTableBody.appendChild(tr);
    });
}

// Render Users Table
function renderUsersTable() {
    if (usersList.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No users registered yet.</td></tr>`;
        return;
    }

    usersTableBody.innerHTML = "";
    usersList.forEach((u) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${u.fullName || 'User'}</strong></td>
            <td>${u.email}</td>
            <td><span class="role-pill ${u.role === 'admin' ? 'admin' : ''}">${u.role || 'student'}</span></td>
            <td><code style="font-size:0.8rem; background:#f1f5f9; padding:0.2rem 0.4rem; border-radius:4px;">${u.uid || u.id}</code></td>
        `;
        usersTableBody.appendChild(tr);
    });
}

// Update Stats Cards
function updateStats() {
    statTotalNotices.textContent = noticesList.length;
    statActiveNotices.textContent = noticesList.filter(n => n.active !== false).length;
    statPinnedNotices.textContent = noticesList.filter(n => n.isPinned).length;
    statTotalUsers.textContent = usersList.length;
}

// Toggle Pin Status
async function togglePin(id, currentPinned) {
    try {
        await updateDoc(doc(db, "notices", id), {
            isPinned: !currentPinned
        });
        showToast(`Notice ${!currentPinned ? 'pinned' : 'unpinned'} successfully!`, "success");
    } catch (err) {
        showToast("Error updating pin status: " + err.message, "error");
    }
}

// Toggle Active Status
async function toggleActive(id, currentActive) {
    try {
        await updateDoc(doc(db, "notices", id), {
            active: !currentActive
        });
        showToast(`Notice ${!currentActive ? 'activated' : 'deactivated'}!`, "success");
    } catch (err) {
        showToast("Error updating active status: " + err.message, "error");
    }
}

// Delete Notice
async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
        await deleteDoc(doc(db, "notices", id));
        showToast("Notice deleted successfully!", "success");
    } catch (err) {
        showToast("Delete failed: " + err.message, "error");
    }
}

// Handle Image Input & Base64 conversion
imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
        showToast("Please select an image smaller than 800 KB", "error");
        imageInput.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentBase64Image = e.target.result;
        imagePreview.src = currentBase64Image;
        imagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
});

// Create & Edit Notice Modal Handlers
createNoticeBtn.addEventListener("click", () => {
    noticeForm.reset();
    document.getElementById("noticeId").value = "";
    currentBase64Image = "";
    imagePreview.style.display = "none";
    formModalTitle.textContent = "Create New Notice";
    noticeFormModal.classList.add("active");
});

closeFormModalBtn.addEventListener("click", () => {
    noticeFormModal.classList.remove("active");
});

function openEditModal(notice) {
    document.getElementById("noticeId").value = notice.id;
    document.getElementById("title").value = notice.title || "";
    document.getElementById("description").value = notice.description || "";
    document.getElementById("department").value = notice.department || "General";
    document.getElementById("priority").value = notice.priority || "Medium";
    document.getElementById("expiryDate").value = notice.expiryDate || "";
    document.getElementById("isPinned").checked = !!notice.isPinned;
    document.getElementById("isActive").checked = notice.active !== false;

    if (notice.image) {
        currentBase64Image = notice.image;
        imagePreview.src = notice.image;
        imagePreview.style.display = "block";
    } else {
        currentBase64Image = "";
        imagePreview.style.display = "none";
    }

    formModalTitle.textContent = "Edit Notice";
    noticeFormModal.classList.add("active");
}

// Save Form (Create or Update)
noticeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const noticeId = document.getElementById("noticeId").value;
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const department = document.getElementById("department").value;
    const priority = document.getElementById("priority").value;
    const expiryDate = document.getElementById("expiryDate").value;
    const isPinned = document.getElementById("isPinned").checked;
    const active = document.getElementById("isActive").checked;

    if (!title || !description) {
        showToast("Please fill all required fields", "error");
        return;
    }

    saveNoticeBtn.disabled = true;
    saveNoticeBtn.textContent = "Saving...";

    const payload = {
        title,
        description,
        department,
        priority,
        expiryDate: expiryDate || null,
        isPinned,
        active,
        image: currentBase64Image || null,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        updatedAt: serverTimestamp()
    };

    try {
        if (noticeId) {
            // Update
            await updateDoc(doc(db, "notices", noticeId), payload);
            showToast("Notice updated successfully!", "success");
        } else {
            // Create
            payload.createdAt = serverTimestamp();
            payload.views = 0;
            payload.likes = 0;
            await addDoc(collection(db, "notices"), payload);
            showToast("Notice created successfully!", "success");
        }

        noticeFormModal.classList.remove("active");
    } catch (err) {
        console.error("Save error:", err);
        showToast("Failed to save notice: " + err.message, "error");
    } finally {
        saveNoticeBtn.disabled = false;
        saveNoticeBtn.textContent = "Save Notice";
    }
});

// Admin Navigation Tabs
document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");

        btn.classList.add("active");
        const tabId = btn.dataset.tab;
        document.getElementById(tabId).style.display = "block";
    });
});

// Chart.js Analytics
function updateCharts() {
    const categoryCounts = {};
    let totalLikes = 0;
    let totalViews = 0;

    noticesList.forEach(n => {
        const cat = n.department || "General";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        totalLikes += (n.likes || 0);
        totalViews += (n.views || 0);
    });

    // 1. Category Chart
    const ctxCat = document.getElementById("categoryChart")?.getContext("2d");
    if (ctxCat) {
        if (categoryChartInstance) categoryChartInstance.destroy();
        categoryChartInstance = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    data: Object.values(categoryCounts),
                    backgroundColor: ['#4f46e5', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Views/Likes Chart
    const ctxViews = document.getElementById("viewsChart")?.getContext("2d");
    if (ctxViews) {
        if (viewsChartInstance) viewsChartInstance.destroy();
        viewsChartInstance = new Chart(ctxViews, {
            type: 'bar',
            data: {
                labels: ['Total Views', 'Total Likes'],
                datasets: [{
                    label: 'Interactions',
                    data: [totalViews, totalLikes],
                    backgroundColor: ['#4f46e5', '#ef4444']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}