import { 
    db, 
    collection, 
    onSnapshot, 
    doc, 
    updateDoc, 
    increment 
} from "./firebase.js";
import { protectRoute, showToast } from "./auth.js";

const noticeGrid = document.getElementById("noticeGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const priorityFilter = document.getElementById("priorityFilter");
const noticeModal = document.getElementById("noticeModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");

let allNotices = [];
let userLikedNotices = new Set();

// Initialize & Protect Route
protectRoute(null, () => {
    initRealtimeNotices();
});

function initRealtimeNotices() {
    const noticesRef = collection(db, "notices");

    // Real-time listener for notices
    onSnapshot(noticesRef, (snapshot) => {
        allNotices = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            allNotices.push({
                id: docSnap.id,
                ...data
            });
        });

        renderNotices();
    }, (error) => {
        console.error("Error listening to notices:", error);
        noticeGrid.innerHTML = `<p style="text-align:center; width:100%; color:var(--danger);">Failed to load notices: ${error.message}</p>`;
    });
}

function renderNotices() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;
    const selectedPriority = priorityFilter.value;

    const filtered = allNotices.filter((notice) => {
        // Filter inactive or expired
        if (notice.active === false) return false;

        if (notice.expiryDate) {
            const exp = new Date(notice.expiryDate);
            if (exp < new Date()) return false;
        }

        // Search match
        const matchesSearch = notice.title?.toLowerCase().includes(searchTerm) || 
                              notice.description?.toLowerCase().includes(searchTerm);

        // Category match
        const matchesCategory = selectedCategory === "All" || notice.department === selectedCategory;

        // Priority match
        const matchesPriority = selectedPriority === "All" || notice.priority === selectedPriority;

        return matchesSearch && matchesCategory && matchesPriority;
    });

    // Sort pinned first, then by date descending
    filtered.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    if (filtered.length === 0) {
        noticeGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 3rem 1rem; color: var(--text-muted);">
                <div style="font-size:3rem; margin-bottom:1rem;">📭</div>
                <h3>No notices found</h3>
                <p>Try adjusting your search query or filters.</p>
            </div>
        `;
        return;
    }

    noticeGrid.innerHTML = "";

    filtered.forEach((notice) => {
        const card = document.createElement("div");
        card.className = `notice-card ${notice.isPinned ? 'pinned' : ''}`;

        const isLiked = userLikedNotices.has(notice.id);
        const isStar = notice.priority === "High" || notice.isImportant;

        card.innerHTML = `
            ${notice.isPinned ? '<div class="pin-badge">📌 Pinned</div>' : ''}
            ${notice.image ? `<img src="${notice.image}" class="notice-img" alt="Notice Header">` : ''}
            
            <div class="notice-body">
                <div class="notice-meta">
                    <span class="badge badge-dept">${notice.department || 'General'}</span>
                    <span class="badge badge-priority-${notice.priority || 'Medium'}">${notice.priority || 'Medium'}</span>
                </div>

                <h3 class="notice-title">
                    ${isStar ? '⭐ ' : ''}${notice.title}
                </h3>
                
                <p class="notice-desc">${notice.description}</p>
                
                <div class="notice-footer">
                    <span>🗓️ ${notice.date || 'Recent'}</span>
                    
                    <div class="action-buttons">
                        <button class="icon-btn view-btn" data-id="${notice.id}">
                            👁️ ${notice.views || 0}
                        </button>
                        <button class="icon-btn like-btn ${isLiked ? 'liked' : ''}" data-id="${notice.id}">
                            ❤️ ${notice.likes || 0}
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Card Click opens Modal
        card.addEventListener("click", (e) => {
            if (e.target.closest(".like-btn")) {
                handleLike(notice.id);
                return;
            }
            openNoticeModal(notice);
        });

        noticeGrid.appendChild(card);
    });
}

// Event Listeners for Filters
searchInput.addEventListener("input", renderNotices);
categoryFilter.addEventListener("change", renderNotices);
priorityFilter.addEventListener("change", renderNotices);

// Handle Like Button
async function handleLike(noticeId) {
    try {
        const noticeRef = doc(db, "notices", noticeId);
        await updateDoc(noticeRef, {
            likes: increment(1)
        });
        userLikedNotices.add(noticeId);
        showToast("Liked notice!", "success");
    } catch (err) {
        console.error("Error liking notice:", err);
        showToast("Could not register like", "error");
    }
}

// Open Details View Modal & Increment View Counter
async function openNoticeModal(notice) {
    // Increment view count in Firestore
    try {
        const noticeRef = doc(db, "notices", notice.id);
        await updateDoc(noticeRef, {
            views: increment(1)
        });
    } catch (err) {
        console.error("Error incrementing views:", err);
    }

    modalTitle.textContent = notice.title;
    modalBody.innerHTML = `
        ${notice.image ? `<img src="${notice.image}" style="width:100%; max-height:300px; object-fit:cover; border-radius:8px; margin-bottom:1rem;">` : ''}
        
        <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
            <span class="badge badge-dept">${notice.department || 'General'}</span>
            <span class="badge badge-priority-${notice.priority || 'Medium'}">${notice.priority || 'Medium'} Priority</span>
            ${notice.isPinned ? '<span class="badge" style="background:#fef3c7; color:#d97706;">📌 Pinned</span>' : ''}
        </div>

        <p style="font-size:1rem; line-height:1.6; color:#334155; margin-bottom:1.5rem; whitespace-pre-wrap;">${notice.description}</p>
        
        <div style="background:#f8fafc; padding:1rem; border-radius:8px; display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted);">
            <div>📅 Posted: ${notice.date || 'N/A'}</div>
            <div>⏳ Expires: ${notice.expiryDate || 'No Expiry'}</div>
            <div>👁️ Views: ${(notice.views || 0) + 1} | ❤️ Likes: ${notice.likes || 0}</div>
        </div>
    `;

    noticeModal.classList.add("active");
}

closeModalBtn.addEventListener("click", () => {
    noticeModal.classList.remove("active");
});

noticeModal.addEventListener("click", (e) => {
    if (e.target === noticeModal) {
        noticeModal.classList.remove("active");
    }
});