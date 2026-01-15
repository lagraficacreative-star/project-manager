/**
 * Data Store - Handling State
 */
const TEAM_MEMBERS = [
    { id: 'neus', name: 'Neus', role: 'Diseño' },
    { id: 'alba', name: 'Alba', role: 'Social' },
    { id: 'ateixido', name: 'Ateixido', role: 'Web' },
    { id: 'omar', name: 'Omar', role: 'Web' },
    { id: 'montse', name: 'Montse', role: 'Admin' }
];

const INITIAL_PROJECTS = [
    {
        id: 1,
        title: "Rediseño Web Corporativa",
        scope: "web",
        status: "in-progress",
        tasks: 2,
        members: ["ateixido", "montse"]
    },
    {
        id: 2,
        title: "Campaña Navidad Instagram",
        scope: "social",
        status: "pending",
        tasks: 5,
        members: ["alba", "neus"]
    },
    {
        id: 3,
        title: "Brand Book 2026",
        scope: "design",
        status: "todo",
        tasks: 0,
        members: ["neus"]
    }
];

class Store {
    constructor() {
        this.projects = JSON.parse(localStorage.getItem('pm_projects')) || INITIAL_PROJECTS;
        this.tasks = JSON.parse(localStorage.getItem('pm_tasks')) || [];
        this.members = TEAM_MEMBERS;
    }

    save() {
        localStorage.setItem('pm_projects', JSON.stringify(this.projects));
        localStorage.setItem('pm_tasks', JSON.stringify(this.tasks));
    }

    addProject(project) {
        this.projects.push(project);
        this.save();
    }

    addTask(task) {
        this.tasks.push(task);
        this.save();
    }

    getMembers() {
        return this.members;
    }
}

}

const store = new Store();

/**
 * App Logic
 */
// import { store as appStore } from './app.js'; // Removed module import

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderTeamSidebar();
    renderDashboard();
    setupEventListeners();
    setupAnimations();
}

function renderTeamSidebar() {
    const list = document.querySelector('.team-list');
    list.innerHTML = store.getMembers().map(member => `
        <div class="nav-item">
            <div class="avatar" style="width:24px; height:24px; font-size:10px; background: rgba(255,255,255,0.1)">
                ${member.name[0]}
            </div>
            <span>${member.name}</span>
        </div>
    `).join('');

    // Also populate select in modal
    const select = document.getElementById('task-assignee');
    store.getMembers().forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.name;
        select.appendChild(option);
    });
}

function renderDashboard() {
    window.renderKanban = renderKanban; // Expose to window for onclick
    const container = document.getElementById('view-container');
    container.innerHTML = `
        <h2 style="margin-bottom: 2rem;">Panel de Control</h2>
        <div class="dashboard-grid">
            ${store.projects.map(p => `
                <div class="card glass" onclick="renderKanban(${p.id})">
                    <span class="tag tag-${p.scope}">${p.scope}</span>
                    <h3 style="margin-top: 10px;">${p.title}</h3>
                    <div class="card-meta">
                        <span><i class="fa-solid fa-list-check"></i> ${p.tasks} Tareas</span>
                        <div class="avatars" style="display:flex;">
                           ${p.members.map(m => `<div class="avatar" style="width:24px;height:24px;margin-left:-8px;border:2px solid var(--bg-dark)">${m[0].toUpperCase()}</div>`).join('')}
                        </div>
                    </div>
                </div>
            `).join('')}
            
            <div class="card glass" style="display:flex; align-items:center; justify-content:center; border-style:dashed; opacity:0.6" id="add-project-card">
                <div style="text-align:center">
                    <i class="fa-solid fa-plus" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Nuevo Proyecto</p>
                </div>
            </div>
        </div>
    `;

    // Add animation
    document.querySelectorAll('.card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            if (e.currentTarget.getAttribute('href') === '#') { // Simple check
                e.currentTarget.classList.add('active');
            }

            // Handle routing logic here (scaffolding)
            const scope = e.currentTarget.dataset.scope;
            if (scope) filterByScope(scope);

            const view = e.currentTarget.dataset.view;
            if (view === 'dashboard') renderDashboard();
            if (view === 'projects') renderKanban();
        });
    });

    // Modal
    const modal = document.getElementById('task-modal');
    document.getElementById('btn-new-task').addEventListener('click', () => {
        modal.classList.add('active');
        modal.classList.remove('hidden');
    });

    document.querySelectorAll('.btn-close, .btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.classList.add('hidden'), 300); // Wait for animation
        });
    });

    // Create Task Action (Automation Placeholder)
    document.getElementById('btn-save-task').addEventListener('click', () => {
        const title = document.getElementById('task-title').value;
        const assignee = document.getElementById('task-assignee').value;
        const scope = document.getElementById('task-scope').value;

        if (!title) return alert('¡Necesitas un título!');

        // Auto-assign magic if empty
        let finalAssignee = assignee;
        if (!finalAssignee) {
            // Simple rule: Assign based on scope
            if (scope === 'design') finalAssignee = 'neus';
            if (scope === 'web') finalAssignee = 'ateixido';
            if (scope === 'social') finalAssignee = 'alba';
            alert(`✨ Magia: Asignado automáticamente a ${finalAssignee} por ser tarea de ${scope}.`);
        }

        const newTask = {
            id: Date.now(),
            title,
            assignee: finalAssignee,
            scope,
            status: 'todo',
            date: document.getElementById('task-date').value || new Date().toISOString().split('T')[0]
        };

        store.addTask(newTask);

        // Reset and close
        document.getElementById('task-title').value = '';
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);

        // Refresh view (Simple reload for now or re-render)
        renderDashboard();
    });
}

function filterByScope(scope) {
    const container = document.getElementById('view-container');
    const filtered = store.projects.filter(p => p.scope === scope);

    container.innerHTML = `
        <h2 style="margin-bottom: 2rem; text-transform:capitalize;">Ámbito: ${scope}</h2>
        <div class="dashboard-grid">
            ${filtered.length ? filtered.map(p => `
                <div class="card glass">
                    <span class="tag tag-${p.scope}">${p.scope}</span>
                    <h3 style="margin-top: 10px;">${p.title}</h3>
                </div>
            `).join('') : '<p style="color:var(--text-muted)">No hay proyectos en este ámbito.</p>'}
        </div>
    `;
}

function setupAnimations() {
    // Basic interaction animations if needed
}

function renderKanban(projectId = null) {
    const container = document.getElementById('view-container');

    // Filter tasks if project selected (placeholder logic as we don't have project-task active linking yet)
    // For now, show all tasks
    const tasks = store.tasks;

    const columns = [
        { id: 'todo', title: 'Por hacer', color: '#f472b6' },
        { id: 'in-progress', title: 'En curso', color: '#818cf8' },
        { id: 'done', title: 'Listo', color: '#34d399' }
    ];

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
            <h2>Tablero de Tareas</h2>
            <div style="display:flex; gap:10px">
                <span class="tag">Todas las tareas</span>
            </div>
        </div>
        <div class="kanban-board">
            ${columns.map(col => `
                <div class="kanban-column">
                    <div class="kanban-header" style="border-color: ${col.color}40">
                        <span>${col.title}</span>
                        <span style="background:${col.color}20; color:${col.color}; padding: 2px 8px; border-radius:10px;">
                            ${tasks.filter(t => t.status === col.id).length}
                        </span>
                    </div>
                    <div class="kanban-tasks" data-status="${col.id}">
                        ${tasks.filter(t => t.status === col.id).map(t => `
                            <div class="task-card" draggable="true" data-id="${t.id}">
                                <div style="margin-bottom:8px">
                                    <span class="tag tag-${t.scope}" style="font-size:0.6rem; padding: 2px 6px">${t.scope}</span>
                                </div>
                                <h4>${t.title}</h4>
                                <div class="task-meta">
                                    <span><i class="fa-regular fa-clock"></i> ${new Date(t.date).toLocaleDateString()}</span>
                                    <div class="avatar" style="width:20px; height:20px; font-size:8px;">
                                        ${t.assignee ? t.assignee[0].toUpperCase() : '?'}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    setupDragAndDrop();
}

function setupDragAndDrop() {
    const cards = document.querySelectorAll('.task-card');
    const columns = document.querySelectorAll('.kanban-tasks');

    cards.forEach(card => {
        card.addEventListener('dragstart', () => {
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            // Update status in store
            const newStatus = card.closest('.kanban-tasks').dataset.status;
            const taskId = parseInt(card.dataset.id);
            store.updateTaskStatus(taskId, newStatus);
        });
    });

    columns.forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(col, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                col.appendChild(draggable);
            } else {
                col.insertBefore(draggable, afterElement);
            }
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Add update method to Store
Store.prototype.updateTaskStatus = function (taskId, status) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
        task.status = status;
        this.save();
    }
};
