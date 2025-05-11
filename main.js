// DOM Elements
const syllabusForm = document.getElementById('syllabus-form');
const syllabusItems = document.getElementById('syllabus-items');
const filterStatus = document.getElementById('filter-status');
const filterPriority = document.getElementById('filter-priority');
const totalItemsEl = document.getElementById('total-items');
const completedItemsEl = document.getElementById('completed-items');
const pendingItemsEl = document.getElementById('pending-items');
const progressBarEl = document.getElementById('overall-progress');
const progressPercentageEl = document.getElementById('progress-percentage');
const timelineEl = document.getElementById('timeline');
const itemModal = document.getElementById('item-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const closeModal = document.querySelector('.close-modal');
const themeToggle = document.querySelector('.theme-toggle');

// State
let syllabusData = [];
let currentFilters = {
    status: 'all',
    priority: 'all'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchSyllabusItems();
    setupEventListeners();
    initTheme();
});

// Fetch Syllabus Data from API
function fetchSyllabusItems() {
    fetch('/api/syllabus')
        .then(response => response.json())
        .then(data => {
            syllabusData = data;
            renderSyllabusItems();
            updateStats();
            renderTimeline();
        })
        .catch(error => {
            console.error('Error fetching syllabus items:', error);
            showNotification('Error loading data. Please try again.', 'error');
        });
}

// Setup Event Listeners
function setupEventListeners() {
    // Form submission
    syllabusForm.addEventListener('submit', handleFormSubmit);
    
    // Filter changes
    filterStatus.addEventListener('change', handleFilterChange);
    filterPriority.addEventListener('change', handleFilterChange);
    
    // Modal close
    closeModal.addEventListener('click', () => {
        itemModal.style.display = 'none';
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === itemModal) {
            itemModal.style.display = 'none';
        }
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
}

// Handle Form Submit
function handleFormSubmit(e) {
    e.preventDefault();
    
    const courseName = document.getElementById('course-name').value;
    const topicName = document.getElementById('topic-name').value;
    const deadline = document.getElementById('deadline').value;
    const priority = document.getElementById('priority').value;
    const description = document.getElementById('description').value;
    
    const newItem = {
        course: courseName,
        topic: topicName,
        deadline: deadline || null,
        priority: priority,
        completed: false,
        description: description,
        createdAt: new Date().toISOString()
    };
    
    // Send to API
    fetch('/api/syllabus', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newItem)
    })
    .then(response => response.json())
    .then(data => {
        syllabusData.push(data);
        renderSyllabusItems();
        updateStats();
        renderTimeline();
        syllabusForm.reset();
        showNotification('Syllabus item added successfully!', 'success');
    })
    .catch(error => {
        console.error('Error adding syllabus item:', error);
        showNotification('Error adding item. Please try again.', 'error');
    });
}

// Render Syllabus Items
function renderSyllabusItems() {
    // Filter the data
    const filteredItems = syllabusData.filter(item => {
        const statusMatch = currentFilters.status === 'all' || 
                           (currentFilters.status === 'completed' && item.completed) ||
                           (currentFilters.status === 'pending' && !item.completed);
        
        const priorityMatch = currentFilters.priority === 'all' || 
                             item.priority === currentFilters.priority;
        
        return statusMatch && priorityMatch;
    });
    
    // Clear the container
    syllabusItems.innerHTML = '';
    
    if (filteredItems.length === 0) {
        syllabusItems.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-list-alt"></i>
                <p>No syllabus items match your filters. Try changing the filters or add a new item.</p>
            </div>
        `;
        return;
    }
    
    // Sort items by completion status and then by priority
    filteredItems.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    // Render each item
    filteredItems.forEach(item => {
        const deadlineText = item.deadline 
            ? formatDate(item.deadline)
            : 'No deadline';
        
        const itemElement = document.createElement('div');
        itemElement.className = `syllabus-item ${item.completed ? 'completed' : ''}`;
        itemElement.innerHTML = `
            <div class="item-checkbox">
                <input type="checkbox" ${item.completed ? 'checked' : ''} data-id="${item.id}">
            </div>
            <div class="item-content">
                <h3 class="item-title">${item.topic}</h3>
                <p class="item-subtitle">${item.course}</p>
                <div class="item-meta">
                    <span class="priority-${item.priority}">
                        <i class="fas fa-flag"></i> ${capitalizeFirst(item.priority)}
                    </span>
                    <span>
                        <i class="fas fa-calendar"></i> ${deadlineText}
                    </span>
                </div>
            </div>
            <div class="item-actions">
                <button class="view-btn" data-id="${item.id}" aria-label="View details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="delete-btn" data-id="${item.id}" aria-label="Delete item">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        syllabusItems.appendChild(itemElement);
    });
    
    // Add event listeners to the newly created elements
    document.querySelectorAll('.item-checkbox input').forEach(checkbox => {
        checkbox.addEventListener('change', handleItemCompletion);
    });
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', handleViewItem);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteItem);
    });
}

// Handle Item Completion Toggle
function handleItemCompletion(e) {
    const id = parseInt(e.target.dataset.id);
    const completed = e.target.checked;
    
    // Find the item
    const item = syllabusData.find(item => item.id === id);
    if (!item) return;
    
    // Update local state
    item.completed = completed;
    
    // Send to API
    fetch(`/api/syllabus/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed })
    })
    .then(response => {
        if (response.ok) {
            updateStats();
            renderTimeline();
            renderSyllabusItems(); // Re-render to handle filtering changes
            showNotification(
                completed ? 'Item marked as completed!' : 'Item marked as pending!', 
                'success'
            );
        }
    })
    .catch(error => {
        console.error('Error updating item:', error);
        // Revert the change if failed
        item.completed = !completed;
        renderSyllabusItems();
        showNotification('Error updating item. Please try again.', 'error');
    });
}

// Handle View Item Details
function handleViewItem(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const item = syllabusData.find(item => item.id === id);
    if (!item) return;
    
    modalTitle.textContent = item.topic;
    
    const deadlineText = item.deadline 
        ? formatDate(item.deadline)
        : 'No deadline set';
    
    const createdAtText = formatDate(item.createdAt);
    
    modalContent.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">Course</div>
            <div class="detail-value">${item.course}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Status</div>
            <div class="detail-value">
                <span class="${item.completed ? 'priority-low' : 'priority-high'}">
                    ${item.completed ? 'Completed' : 'Pending'}
                </span>
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Priority</div>
            <div class="detail-value">
                <span class="priority-${item.priority}">
                    ${capitalizeFirst(item.priority)}
                </span>
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Deadline</div>
            <div class="detail-value">${deadlineText}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Created</div>
            <div class="detail-value">${createdAtText}</div>
        </div>
        ${item.description ? `
        <div class="detail-row">
            <div class="detail-label">Description</div>
            <div class="detail-value">${formatDescription(item.description)}</div>
        </div>
        ` : ''}
        <div class="modal-actions">
            <button class="btn ${item.completed ? 'btn-warning' : 'btn-success'}" id="toggle-status">
                ${item.completed ? 'Mark as Pending' : 'Mark as Completed'}
            </button>
        </div>
    `;
    
    // Show the modal
    itemModal.style.display = 'flex';
    
    // Add event listener to toggle button
    document.getElementById('toggle-status').addEventListener('click', () => {
        // Update the item
        item.completed = !item.completed;
        
        // Send to API
        fetch(`/api/syllabus/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed: item.completed })
        })
        .then(response => {
            if (response.ok) {
                itemModal.style.display = 'none';
                renderSyllabusItems();
                updateStats();
                renderTimeline();
                showNotification(
                    item.completed ? 'Item marked as completed!' : 'Item marked as pending!', 
                    'success'
                );
            }
        })
        .catch(error => {
            console.error('Error updating item:', error);
            // Revert the change if failed
            item.completed = !item.completed;
            showNotification('Error updating item. Please try again.', 'error');
        });
    });
}

// Handle Delete Item
function handleDeleteItem(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    
    // Confirm before deletion
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            // Send delete request to API
            fetch(`/api/syllabus/${id}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (response.ok) {
                    // Remove from local data
                    syllabusData = syllabusData.filter(item => item.id !== id);
                    renderSyllabusItems();
                    updateStats();
                    renderTimeline();
                    showNotification('Item deleted successfully!', 'success');
                }
            })
            .catch(error => {
                console.error('Error deleting item:', error);
                showNotification('Error deleting item. Please try again.', 'error');
            });
        }
    });
}

// Handle Filter Changes
function handleFilterChange() {
    currentFilters.status = filterStatus.value;
    currentFilters.priority = filterPriority.value;
    renderSyllabusItems();
}

// Update Statistics
function updateStats() {
    const total = syllabusData.length;
    const completed = syllabusData.filter(item => item.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Update stats
    totalItemsEl.textContent = total;
    completedItemsEl.textContent = completed;
    pendingItemsEl.textContent = pending;
    
    // Update progress bar
    progressBarEl.style.width = `${percentage}%`;
    progressPercentageEl.textContent = `${percentage}%`;
}

// Render Timeline
function renderTimeline() {
    if (syllabusData.length === 0) {
        timelineEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <p>No items to display on the timeline yet.</p>
            </div>
        `;
        return;
    }
    
    // Filter items with deadlines
    const itemsWithDeadlines = syllabusData
        .filter(item => item.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    if (itemsWithDeadlines.length === 0) {
        timelineEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <p>No items with deadlines to display.</p>
            </div>
        `;
        return;
    }
    
    timelineEl.innerHTML = '';
    itemsWithDeadlines.forEach(item => {
        const deadline = new Date(item.deadline);
        const isPast = deadline < new Date();
        
        const timelineItem = document.createElement('div');
        timelineItem.className = `timeline-item ${item.completed ? 'completed' : ''} ${isPast && !item.completed ? 'overdue' : ''}`;
        timelineItem.innerHTML = `
            <div class="timeline-date">${formatDate(item.deadline)}</div>
            <div class="timeline-content">
                <h3>${item.topic}</h3>
                <p>${item.course}</p>
                <span class="priority-${item.priority}">
                    <i class="fas fa-flag"></i> ${capitalizeFirst(item.priority)}
                </span>
                <span>
                    <i class="fas fa-${item.completed ? 'check-circle' : isPast ? 'exclamation-circle' : 'clock'}"></i>
                    ${item.completed ? 'Completed' : isPast ? 'Overdue' : 'Pending'}
                </span>
            </div>
        `;
        
        timelineEl.appendChild(timelineItem);
    });
}

// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    
    // Update toggle icon
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    }
}

// Initialize Theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    }
}

// Show Notification
function showNotification(message, type) {
    Swal.fire({
        title: type === 'success' ? 'Success!' : 'Error!',
        text: message,
        icon: type,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

// Utility Functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatDescription(text) {
    // Replace newlines with <br> tags
    return text.replace(/\n/g, '<br>');
} 