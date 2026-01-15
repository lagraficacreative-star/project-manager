console.log("📜 App module loaded");

import { API } from './api.js';
import { UI } from './ui.js';

const App = {
    state: {
        view: 'dashboard',
        scope: null,
        data: null,
        draggedTaskId: null,
        currentUser: 'montse', // Default User
        currentUser: 'montse', // Default User
        isUnlocked: false, // PIN status for navigation
        boardFilters: { member: 'all', client: 'all', search: '' }, // New Filters State
        mailboxFolder: 'INBOX' // 'INBOX' or 'Archivo_Fichas/Correos_Procesados'
    },

    async init() {
        this.bindEvents();
        await this.loadData();

        // Initial Renders
        try {
            this.renderSidebar();
            this.populateForms();
            this.renderUserProfile();
        } catch (e) {
            console.error("Render Init Error", e);
        }

        this.navigate('dashboard');
    },

    async loadData() {
        try {
            console.log("📡 Fetching projects...");
            this.state.data = await API.getProjects();
            console.log("📥 Data received:", this.state.data);
        } catch (e) {
            console.error("Error loading data", e);
            // Mock data fallback
            this.state.data = {
                projects: [],
                tasks: [
                    { id: 1, title: 'Rediseño Logo', scope: 'design', status: 'in_progress', priority: 'high', client: 'LaGràfica', assignee: 'neus', date: '2024-01-10' },
                    { id: 2, title: 'Landing Page Evento', scope: 'web', status: 'todo', priority: 'medium', client: 'Ayto. BCN', assignee: 'montse', date: '2024-01-15' },
                    { id: 3, title: 'Reels Enero', scope: 'social', status: 'review', priority: 'low', client: 'Café 365', assignee: 'alba', date: '2024-01-12' },
                    { id: 4, title: 'Presupuesto Campaña Verano', scope: 'budgets', status: 'todo', priority: 'high', client: 'Turisme LLeida', assignee: 'montse', date: '2024-01-08' },
                    { id: 5, title: 'Factura #2024-001 - Web', scope: 'billing', status: 'done', priority: 'medium', client: 'Ayto. BCN', assignee: 'ateixido', date: '2023-12-20' },
                    { id: 6, title: 'Mantenimiento SEO', scope: 'web', status: 'in_progress', priority: 'low', client: 'Farmacia Soler', assignee: 'ateixido', date: '2024-01-09' }
                ],
                members: [
                    { id: 'montse', name: 'Montse', role: 'Director', avatar: 'M' },
                    { id: 'neus', name: 'Neus', role: 'Design', avatar: 'N' },
                    { id: 'alba', name: 'Alba', role: 'Social', avatar: 'A' },
                    { id: 'ateixido', name: 'A. Teixidó', role: 'Web', avatar: 'T' },
                    { id: 'omar', name: 'Omar', role: 'Dev', avatar: 'O' }
                ],
                clients: [
                    { id: 1, name: 'LaGràfica', email: 'info@lagrafica.com' },
                    { id: 2, name: 'Ayto. BCN', email: 'comunicacio@bcn.cat' }
                ]
            };
        }
    },

    renderSidebar() {
        if (this.state.data.members) {
            const teamContainer = document.getElementById('team-top-container');
            if (teamContainer) {
                // Fix: Pass clients and filters to avoid "undefined" errors in UI
                UI.renderTeamTop(
                    teamContainer,
                    this.state.data.members,
                    this.state.data.clients || [],
                    this.state.boardFilters || { member: 'all', client: 'all', search: '' }
                );
            }
        }
    },

    populateForms() {
        if (this.state.data.members) {
            UI.populateSelect('input-assignee', this.state.data.members, 'id', 'name');
        }
        if (this.state.data.clients) {
            // Using ID as value, but maybe name is better if backend expects name? 
            // Existing tasks use name string. Let's use name as value to be compatible with old tasks.
            UI.populateSelect('input-client', this.state.data.clients, 'name', 'name');
        }
    },

    bindEvents() {
        // Global Delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btn-add-col')) {
                this.addColumn();
            }
            // Edit Column
            const editBtn = e.target.closest('.edit-col-btn');
            if (editBtn) {
                const id = editBtn.dataset.id;
                this.editColumn(id);
            }
            // Delete Column
            const delBtn = e.target.closest('.delete-col-btn');
            if (delBtn) {
                const id = delBtn.dataset.id;
                this.deleteColumn(id);
            }
        });

        // Search handling
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.boardFilters.search = e.target.value.toLowerCase();
                this.render(); // Re-render current view with filter
            });
        }

        // Form handling
        const form = document.getElementById('form-create-task');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const extraDescriptions = formData.getAll('extra_description[]');

                const convertingEmailId = form.dataset.convertingEmailId;

                if (convertingEmailId) {
                    // CONVERSION FLOW
                    const mail = this.state.data.emails.find(e => e.id == convertingEmailId);
                    if (mail) {
                        const payload = {
                            email: mail,
                            title: formData.get('title'),
                            description: formData.get('description'),
                            scope: formData.get('scope'),
                            priority: formData.get('priority'),
                            client_name: formData.get('client'),
                            assignee: formData.get('assignee'),
                            status: 'pending',
                            mailbox_owner: this.state.scope // 'mailbox' passes memberId as scope? No. 'mailbox' view uses scope as memberId.
                        };
                        try {
                            await API.convertEmail(payload);

                            // Auto-archive the email
                            await API.archiveEmail(mail.id, this.state.scope || this.state.currentUser);

                            // Optimistic UI Update: 
                            // 1. Mark as converted for styling
                            mail.converted = true;

                            // 2. Add to processed list so it moves to Archive view (Simulation Mode logic)
                            if (!this.state.data.processed_emails) this.state.data.processed_emails = [];
                            if (!this.state.data.processed_emails.includes(mail.id)) {
                                this.state.data.processed_emails.push(mail.id);
                            }

                            UI.showNotification('✅ Correo Convertido', 'Se ha creado la ficha y archivado el correo.');
                            this.closeModal('create-task');

                            // Refresh data in background but render immediately
                            if (this.state.view === 'mailbox') {
                                // Re-fetch logic or just re-render will rely on the updated state
                                // We manually trigger a filter refresh by reloading the view
                                this.render();
                            } else {
                                this.render();
                            }
                        } catch (e) {
                            console.error(e);
                            alert("Error al convertir correo.");
                        }
                    }
                    delete form.dataset.convertingEmailId;
                } else {
                    // STANDARD TASK FLOW

                    // Determine default status
                    let defaultStatus = 'pending';
                    if (this.state.data.columns && this.state.data.columns.length > 0) {
                        const hasPending = this.state.data.columns.find(c => c.id === 'pending');
                        if (!hasPending) {
                            defaultStatus = this.state.data.columns[0].id;
                        }
                    }

                    const task = {
                        title: formData.get('title'),
                        scope: formData.get('scope'),
                        priority: formData.get('priority'),
                        client: formData.get('client'),
                        description: formData.get('description'),
                        extra_notes: extraDescriptions,
                        drive_link: formData.get('drive_link'),
                        dropbox_link: formData.get('dropbox_link'),
                        time_spent: this.state.timerSeconds || 0, // Save accumulated seconds
                        budget: {
                            client_info: formData.get('budget_client_info'),
                            date: formData.get('budget_date'),
                            budget_link: formData.get('budget_link'),
                            client_amount: formData.get('budget_client'),
                            suppliers_amount: formData.get('budget_suppliers'),
                            notes: formData.get('budget_notes'),
                            extra_financial_notes: formData.getAll('extra_financial_note[]')
                        },
                        status: defaultStatus, // Default to first col if pending missing
                        assignee: formData.get('assignee') || 'montse'
                    };

                    // Handle Attachments
                    const attachStr = formData.get('attachments');
                    if (attachStr) {
                        try {
                            task.attachments = JSON.parse(attachStr);
                        } catch (e) { console.error("Error parsing attachments", e); }
                    }

                    const editingId = form.getAttribute('data-editing-id');
                    if (editingId) {
                        // Update existing
                        await API.updateTask(editingId, task);
                        UI.showNotification('✅ Tarea Actualizada', `Cambios guardados correctamente.`);
                    } else {
                        // Create new
                        await API.createTask(task);
                        UI.showNotification('✅ Tarea Creada', `Se ha generado la carpeta en Drive para "${task.title}"`);
                    }
                }

                this.closeModal();
                await this.loadData();
                this.render();
            });
        }
    },

    navigate(view, scope = null) {
        // Permission Check
        const restrictedScopes = ['budgets', 'billing'];
        const allowedUsers = ['montse', 'alba'];

        this.state.view = view;
        this.state.scope = scope;

        // Reset sidebar active state
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        const container = document.getElementById('view-container');

        // Check if we need to show the locked screen
        if (view === 'board' && restrictedScopes.includes(scope) && !this.state.isUnlocked) {
            // User Role check still applies
            if (!allowedUsers.includes(this.state.currentUser)) {
                alert(`⛔️ ACCESO DENEGADO\nSolo Montse y Alba tienen permisos.`);
                this.navigate('dashboard');
                return;
            }
            UI.renderLockedScreen(container, scope);
            return;
        }

        if (view === 'clients') {
            document.title = 'Clientes - LaGràfica Projects';
            if (title) title.textContent = 'Gestión de Clientes';
            UI.renderClientsView(container, this.state.data.clients || []);
            return;
        }

        this.render();
    },

    changeMailboxFolder(folder) {
        this.state.mailboxFolder = folder;
        this.render(); // Re-fetch and render
    },

    verifyGlobalPIN(scope) {
        const pinInput = document.getElementById('global-pin-input');
        const errorMsg = document.getElementById('global-pin-error');
        if (pinInput.value === '00') {
            this.state.isUnlocked = true;
            this.navigate('board', scope);
        } else {
            errorMsg.style.display = 'block';
            pinInput.value = '';
            pinInput.focus();
        }
    },

    renderUserProfile() {
        const userContainer = document.querySelector('.user-profile') || document.querySelector('.user-pill'); // Selector fix
        if (userContainer) {
            // Update UI based on current user
            const user = this.state.data.members.find(m => m.id === this.state.currentUser) || { name: 'Montse', role: 'Director', avatar: 'M' };

            userContainer.querySelector('.avatar').textContent = user.avatar;
            userContainer.querySelector('strong').textContent = user.name;
            userContainer.querySelector('span').textContent = user.role;

            // Click to switch
            userContainer.style.cursor = 'pointer';
            userContainer.title = `Usuario actual: ${user.name}. Click para cambiar (Demo).`;

            // Remove old listener to avoid duplicates if re-rendered (though this function is called once in init usually, but good practice)
            userContainer.onclick = () => {
                const map = { 'montse': 'neus', 'neus': 'alba', 'alba': 'ateixido', 'ateixido': 'omar', 'omar': 'montse' };
                this.state.currentUser = map[this.state.currentUser] || 'montse';

                // Alert with context
                const newUser = this.state.data.members.find(m => m.id === this.state.currentUser);
                alert(`� Cambio de Usuario\nAhora eres: ${newUser.name} (${newUser.role})\nPermisos de gestión: ${['montse', 'alba'].includes(this.state.currentUser) ? '✅ SÍ' : '❌ NO'}`);

                this.renderUserProfile(); // Update the pill immediately
                this.render(); // Update dashboard greeting

                // If we are in a restricted view and switch to a restricted user, kick them out
                if (['budgets', 'billing'].includes(this.state.scope) && !['montse', 'alba'].includes(this.state.currentUser)) {
                    this.navigate('dashboard');
                }
            };
        }
    },

    render() {
        const container = document.getElementById('view-container');
        const title = document.getElementById('page-title');
        this.updateTopActions();

        try {
            if (this.state.view === 'dashboard') {
                const userName = this.state.currentUser.charAt(0).toUpperCase() + this.state.currentUser.slice(1);
                title.textContent = `Hola, ${userName} 👋`;
                // Update Dashboard internal title too if needed, or pass user to UI.renderDashboard
                UI.renderDashboard(container, this.state.data, userName);
                this.loadQuickNotes();
            } else if (this.state.view === 'board') {
                const scopeMap = {
                    design: 'Diseño Gráfico',
                    web: 'Desarrollo Web',
                    social: 'Redes Sociales',
                    budgets: 'Presupuestos',
                    billing: 'Facturación'
                };
                title.textContent = scopeMap[this.state.scope] || 'Tablero';
                title.textContent = scopeMap[this.state.scope] || 'Tablero';
                // Fix: Pass full data and filters
                UI.renderBoard(container, this.state.data, this.state.scope, this.state.boardFilters);
            } else if (this.state.view === 'member') {
                const memberId = this.state.scope;
                const member = this.state.data.members.find(m => m.id === memberId);
                title.textContent = member ? `Proyectos de ${member.name}` : 'Proyectos de Miembro';

                // Define restricted scopes
                const restrictedScopes = ['budgets', 'billing'];
                const allowedUsers = ['montse', 'alba'];
                const canSeeRestricted = allowedUsers.includes(this.state.currentUser);

                // Filter tasks for this member AND check permissions
                const filteredData = {
                    ...this.state.data,
                    tasks: this.state.data.tasks.filter(t => {
                        const isAssigned = t.assignee === memberId;
                        const isRestricted = restrictedScopes.includes(t.scope);

                        if (!isAssigned) return false;

                        // If it's a restricted task, only show if user has permission
                        if (isRestricted && !canSeeRestricted) {
                            return false;
                        }
                        return true;
                    })
                };

                // Use 'all' scope so renderBoard displays everything in the filtered list
                // Use 'all' scope so renderBoard displays everything in the filtered list
                // Fix: Pass filtered data. We can pass member filter as 'all' effectively or just reuse logic.
                UI.renderBoard(container, filteredData, 'all', this.state.boardFilters);
            } else if (this.state.view === 'calendar') {
                title.textContent = 'Planificación y Entregas';
                UI.renderCalendar(container, this.state.data);
            } else if (this.state.view === 'mailbox') {
                title.textContent = 'Buzón Nominalia';
                const memberId = this.state.scope || this.state.currentUser;

                // Show loading state
                container.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-secondary);">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size:3rem; margin-bottom:1rem; color:var(--primary-color);"></i>
                    <p>Sincronizando con Nominalia...</p>
                </div>
            `;

                // Fetch real emails
                // Use API instead of fetch
                API.getEmails(memberId, this.state.mailboxFolder || 'INBOX')
                    .then(emails => {
                        this.state.data.emails = emails;
                        UI.renderMailbox(container, this.state.data, memberId, this.state.mailboxFolder || 'INBOX');
                    })
                    .catch(err => {
                        console.error("Mailbox fetch error:", err);
                        UI.renderMailbox(container, this.state.data, memberId, this.state.mailboxFolder || 'INBOX');
                    });
            }
        } catch (e) {
            console.error("Render Error:", e);
            if (document.getElementById('view-container')) document.getElementById('view-container').innerHTML = `<div style="color:red; padding:2rem;">ERROR: ${e.message}</div>`;
        }
    },

    async readEmail(mailId) {
        const mail = this.state.data.emails.find(e => e.id === mailId);
        if (!mail) return;

        // Mark as read (mock)
        mail.read = true;

        // Update UI
        const detailContainer = document.getElementById('mail-detail-container');
        if (detailContainer) {
            UI.renderEmailDetail(detailContainer, mail);
        }

        // Highlight selected in list
        document.querySelectorAll('.mail-item').forEach(el => el.classList.remove('active'));
        const item = document.getElementById(`mail-item-${mailId}`);
        if (item) {
            item.classList.add('active');
            item.classList.remove('unread');
        }
    },

    createTaskFromEmail(mailId) {
        const mail = this.state.data.emails.find(e => e.id == mailId);
        if (mail) {
            this.openModal('create-task', mail);
        }
    },


    filterCalendar() {
        const memberId = document.getElementById('calendar-member-filter').value;
        const scopeId = document.getElementById('calendar-project-filter').value;
        const placeholder = document.getElementById('calendar-placeholder-list');
        if (placeholder) {
            placeholder.innerHTML = UI.renderCalendarEvents(this.state.data.tasks, memberId, scopeId);
        }
    },

    updateTopActions() {
        // Render Team & Filters in Header
        const teamContainer = document.getElementById('team-top-container');
        if (teamContainer && this.state.data) {
            UI.renderTeamTop(teamContainer, this.state.data.members, this.state.data.clients, this.state.boardFilters);
        }

        const actions = document.getElementById('top-actions');
        if (!actions) return;
        // Reset to default (Search + Bell + New)
        // Ideally we would manage this cleaner, but for now we append context buttons

        // Remove old dynamic buttons
        const oldBtns = actions.querySelectorAll('.dynamic-btn');
        oldBtns.forEach(b => b.remove());

        // Export Button (Billing/Budgets)
        if (['billing', 'budgets'].includes(this.state.scope)) {
            const btn = document.createElement('button');
            btn.className = 'btn-primary dynamic-btn'; // Re-use primary style or add secondary
            btn.style.background = '#10b981'; // Green for export
            btn.innerHTML = '<i class="fa-solid fa-file-export"></i> Exportar Brouter';
            btn.onclick = () => alert(`Exportando ${this.state.scope} a Brouter... (Simulación)`);
            actions.insertBefore(btn, actions.firstChild);
        }

        // Simulation Button (Always visible for Demo)
        const simBtn = document.createElement('button');
        simBtn.className = 'btn-icon dynamic-btn';
        simBtn.title = 'Simular Entrada (Dev)';
        simBtn.innerHTML = '<i class="fa-solid fa-bolt"></i>';
        simBtn.onclick = () => this.simulateIncoming();
        actions.insertBefore(simBtn, actions.firstChild);
    },

    async simulateIncoming() {
        const type = prompt("Simular entrada:\n1. Email (Nuevo Cliente)\n2. Email (Urgente)\n3. WhatsApp (Diseño)");
        let endpoint = '/webhook/email';
        let payload = {};

        if (type === '1') {
            payload = {
                from: 'nuevo@cliente.com',
                subject: 'Solicitud Presupuesto Web',
                body: 'Hola, quiero una web nueva para mi restaurante.'
            };
        } else if (type === '2') {
            payload = {
                from: 'info@lagrafica.com',
                subject: 'URGENTE: Cambio color logo',
                body: 'Necesitamos cambiar el logo a rojo ya.'
            };
        } else if (type === '3') {
            endpoint = '/webhook/whatsapp';
            payload = {
                from: '666555444',
                message: 'Hola, necesito banners para instagram de la campaña de verano.'
            };
        } else {
            return;
        }

        try {
            // Use mock simulation
            if (type === '1' || type === '2') {
                // Email
                const email = { ...payload, date: new Date().toISOString().split('T')[0], read: false, to: 'info@lagrafica.com' };
                await API.simulateEmail(email);
                alert(`Simulación enviada. Ve al Buzón.`);
            } else {
                // WhatsApp (Task)
                const newTask = {
                    id: Date.now(),
                    title: `WA: ${payload.message.substring(0, 20)}`,
                    description: payload.message,
                    scope: 'social',
                    status: 'pending',
                    priority: 'medium',
                    client: payload.from,
                    assignee: 'alba',
                    date: new Date().toISOString().split('T')[0],
                    origin: 'whatsapp'
                };
                await API.createTask(newTask);
                alert(`Simulación WhatsApp enviada. Creada tarea en Redes.`);
            }
        } catch (e) {
            console.warn("Backend offline. Simulating locally.");
            // Offline Simulation Logic
            const mockScope = type === '3' ? 'social' : (type === '1' ? 'web' : 'design');
            const newTask = {
                id: Date.now(),
                title: payload.subject || `WA: ${payload.message?.substring(0, 20)}`,
                description: payload.body || payload.message,
                scope: mockScope,
                status: 'pending',
                priority: type === '2' ? 'high' : 'medium',
                assignee: mockScope === 'web' ? 'montse' : (mockScope === 'design' ? 'neus' : 'alba'),
                client: payload.from,
                date: new Date().toISOString().split('T')[0]
            };
            this.state.data.tasks.push(newTask);
            alert(`[Modo Demo] Tarea simulada creada en: ${mockScope}`);
        }

        await this.loadData(); // This might reload defaults if we aren't careful, but loadData fallback resets. 
        // Better to just re-render:
        this.render();
    },

    // Drag & Drop Handlers
    handleDragStart(e, taskId) {
        this.state.draggedTaskId = taskId;
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.5';
    },

    async handleDrop(e, status) {
        e.preventDefault();
        const taskId = this.state.draggedTaskId;
        if (!taskId) return;

        // Optimistic Update
        const task = this.state.data.tasks.find(t => t.id == taskId);
        if (task) {
            task.status = status;
            this.render(); // Re-render immediately

            // API Call
            await API.updateTaskStatus(taskId, status);

            // Check for Billing Trigger
            if (status === 'done') {
                console.log("Task Finished! Triggering Billing Logic (Mock)...");
            }
        }
    },

    async deleteTask() {
        // Try getting ID from attribute safely
        const form = document.getElementById('form-create-task');
        const id = form ? form.getAttribute('data-editing-id') : null;

        if (!id) {
            alert("No se puede eliminar: No hay una ficha seleccionada.");
            return;
        }

        if (confirm("¿Seguro que quieres eliminar esta ficha para siempre?")) {
            try {
                const res = await API.deleteTask(id);
                // Also remove processed email ref? Logic usually server side but we can just UI update.
                this.closeModal();
                UI.showNotification('🗑️ Ficha Eliminada', 'La tarea ha sido borrada.');
                await this.loadData();

                // Refresh current view if it's a board
                const currentView = document.querySelector('.nav-item.active');
                if (currentView && currentView.getAttribute('onclick')) {
                    // Hacky refresh: re-click or just re-render last view
                    // Ideally: this.navigate(this.currentRoute, this.currentParam)
                    // For now, loadData triggers render? No, manual render needed
                    // this.render uses stored state which we just updated via loadData? No loadData updates state.
                }

                // Simple re-render of whatever is mostly correct
                if (this.state.currentView === 'board') {
                    this.renderBoard(this.state.currentScope);
                } else {
                    this.navigate('dashboard');
                }

            } catch (e) {
                console.error("Error deleting task:", e);
                alert("Error al eliminar la tarea: " + e.message);
            }
        }
    },

    async createNewClient() {
        const name = prompt("Nombre del nuevo cliente:");
        if (!name) return;

        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const color = prompt("Color (hex, ej: #ff0000) o dejar en blanco para aleatorio:", "#" + Math.floor(Math.random() * 16777215).toString(16));

        const client = { id, name, color: color || '#ccc' };

        try {
            await API.createClient(client);
            UI.showNotification('Cliente Creado', `Se ha añadido: ${name}`);
            await this.loadData();
            this.navigate('clients'); // Refresh view
        } catch (e) {
            console.error(e);
            alert("Error al crear cliente");
        }
    },

    async deleteClient(id) {
        if (!confirm("¿Eliminar este cliente?")) return;
        try {
            await API.deleteClient(id);
            UI.showNotification('Cliente Eliminado', 'Se ha borrado correctamente.');
            await this.loadData();
            this.navigate('clients');
        } catch (e) {
            console.error(e);
            alert("Error al eliminar cliente");
        }
    },

    editColumn(id) {
        const col = this.state.data.columns.find(c => c.id === id);
        if (!col) return;
        this.openModal('create-column', { isColumn: true, ...col });
    },

    addColumn() {
        this.openModal('create-column');
        // Clear previous input
        const input = document.getElementById('input-column-title');
        const form = document.getElementById('form-create-column');
        if (input) {
            input.value = '';
            input.focus();
        }
        if (form) delete form.dataset.editingId;
    },

    async submitNewColumn() {
        const input = document.getElementById('input-column-title');
        const form = document.getElementById('form-create-column');
        const title = input.value.trim();
        if (!title) return;

        const editingId = form.dataset.editingId;

        if (editingId) {
            // UPDATE
            try {
                await API.updateColumn(editingId, { title });
                UI.showNotification('Columna Actualizada', `Nombre cambiado a: ${title}`);
                this.closeModal('create-column');
                delete form.dataset.editingId;
                await this.loadData();
                this.render();
            } catch (e) {
                console.error(e);
                alert("Error al actualizar columna");
            }
        } else {
            // CREATE
            // Generate ID from title (simplified)
            const id = title.toLowerCase().replace(/[^a-z0-9]/g, '_');

            // Prevent duplicates
            if (this.state.data.columns && this.state.data.columns.find(c => c.id === id)) {
                alert("Ya existe una columna con una ID similar.");
                return;
            }

            const newCol = { id, title };

            try {
                await API.createColumn(newCol);
                UI.showNotification('Columna Creada', `Se ha añadido: ${title}`);
                this.closeModal(); // Close specific or all
                await this.loadData();
                this.render();
            } catch (e) {
                console.error(e);
                alert("Error al crear columna");
            }
        }
    },

    async deleteColumn(id) {
        // Prevent deleting if tasks exist (optional, but safer)
        const tasksInCol = this.state.data.tasks.filter(t => t.status === id);
        if (tasksInCol.length > 0) {
            if (!confirm(`Hay ${tasksInCol.length} fichas en esta columna. Se ocultarán si la borras (no se borran las fichas, solo la columna). ¿Continuar?`)) {
                return;
            }
        } else {
            if (!confirm("¿Eliminar esta columna?")) return;
        }

        try {
            await API.deleteColumn(id);
            UI.showNotification('Columna Eliminada', 'Se ha borrado correctamente.');
            await this.loadData();
            this.render();
        } catch (e) {
            console.error(e);
            alert("Error al eliminar columna");
        }
    },

    createTaskFromEmail(mailId) {
        const mail = this.state.data.emails.find(e => e.id == mailId);
        if (!mail) {
            console.error("Could not find mail with ID", mailId);
            return;
        }

        // Use the new signature to pass data directly, avoiding race conditions
        this.openModal('create-task', mail);
        UI.showNotification('✨ Email preparado', 'Completa los datos y guarda la ficha.');
    },

    async archiveEmail(mailId) {
        if (!confirm("¿Archivar este correo? Se moverá a 'Procesados'.")) return;

        try {
            await API.archiveEmail(mailId, this.state.scope || this.state.currentUser); // scope holds current mailbox member

            // Remove locally
            this.state.data.emails = this.state.data.emails.filter(e => e.id != mailId);
            UI.renderMailbox(document.getElementById('view-container'), this.state.data, this.state.scope || this.state.currentUser);
            UI.showNotification('✅ Correo Archivado', 'Se ha movido a Procesados correctamente.');

            // Clear detail
            const detailContainer = document.getElementById('mail-detail-container');
            if (detailContainer) {
                detailContainer.innerHTML = `
                    <div class="mail-empty-state">
                        <i class="fa-solid fa-envelope-open-text"></i>
                        <p>Selecciona un mensaje para leerlo</p>
                    </div>
                `;
            }
        } catch (e) {
            console.error(e);
            alert("Error al archivar en el servidor, pero lo ocultaremos de la vista.");
            // Fallback UI removal
            this.state.data.emails = this.state.data.emails.filter(e => e.id != mailId);
            UI.renderMailbox(document.getElementById('view-container'), this.state.data, this.state.scope || this.state.currentUser);
        }
    },

    replyToEmail(toAddress) {
        // Use window.open to avoid unloading app if mail client behavior varies
        // window.open(`mailto:${toAddress}`, '_blank');
        // Actually mailto on _self is better for UX usually, but if it fails, _blank is safer.
        // User reported "closes", so maybe _blank helps keep app alive if browser is quirky.
        const mailto = `mailto:${toAddress}`;
        const link = document.createElement('a');
        link.href = mailto;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
    },

    async addToTaskFromEmail(mailId) {
        // Ensure ID types match (API uses int/string loosely)
        const mail = this.state.data.emails.find(e => e.id == mailId);
        if (!mail) {
            console.error("Mail not found", mailId);
            return;
        }

        const searchTerm = prompt("🔍 Buscar Ficha existente:\nIntroduce el ID o parte del Título:");
        if (!searchTerm) return; // User cancelled

        const candidates = this.state.data.tasks.filter(t =>
            t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(t.id).includes(searchTerm)
        );

        let targetTask;
        if (candidates.length === 0) {
            alert("❌ No se encontraron fichas que coincidan.");
            return;
        } else if (candidates.length === 1) {
            targetTask = candidates[0];
        } else {
            // Multiple found
            const list = candidates.map(t => `• ${t.id}: ${t.title}`).join('\n');
            const chosenId = prompt(`Múltiples coincidencias encontrados:\n${list}\n\nIntroduce el ID exacto de la ficha deseada:`);
            if (!chosenId) return;
            targetTask = candidates.find(t => String(t.id) === chosenId);
        }

        if (!targetTask) {
            alert("❌ Ficha no seleccionada o no válida.");
            return;
        }

        if (!confirm(`⚠️ ¿Seguro que quieres adjuntar este correo a:\n"${targetTask.title}"?`)) return;

        // Append Logic
        const newContent = `\n\n--- 📧 Email añadido (${new Date().toLocaleDateString()}) ---\nAsunto: ${mail.subject}\nDe: ${mail.from}\n${mail.body}`;
        targetTask.description = (targetTask.description || '') + newContent;

        if (mail.attachments && mail.attachments.length > 0) {
            // Ensure attachments is array
            if (!targetTask.attachments) targetTask.attachments = [];
            targetTask.attachments = targetTask.attachments.concat(mail.attachments);
        }

        try {
            await API.updateTask(targetTask.id, targetTask);
            UI.showNotification('✅ Ficha Actualizada', `Información añadida a: ${targetTask.title}`);
        } catch (e) {
            console.error("Error updating task:", e);
            alert("Hubo un error al guardar los cambios.");
        }
    },

    // Checklist Logic
    addCheckItem(text) {
        if (!text.trim()) return;
        const container = document.getElementById('checklist-items');
        const div = document.createElement('div');
        div.className = 'check-item';
        div.innerHTML = `
            <input type="checkbox">
            <span>${text}</span>
            <button type="button" onclick="this.parentElement.remove()" style="margin-left:auto; border:none; background:none; cursor:pointer; color:#ef4444;"><i class="fa-solid fa-times"></i></button>
        `;
        container.appendChild(div);
    },

    // Timer Logic
    // Timer Logic
    // Timer Logic
    toggleTimer() {
        const btn = document.getElementById('btn-timer');
        const display = document.getElementById('timer-display');
        const form = document.getElementById('form-create-task');

        // Ensure state exists and is integer
        if (!this.state.timerSeconds || isNaN(this.state.timerSeconds)) {
            this.state.timerSeconds = 0;
        }

        if (this.state.timerRunning) {
            // STOP TIMER
            this.state.timerRunning = false;
            if (btn) {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
            clearInterval(this.timerInterval);

            // AUTO-SAVE TIME ONLY (Partial Update)
            const taskId = form.getAttribute('data-editing-id');
            console.log("⏱️ STOP TIMER. Saving for TaskID:", taskId, "Seconds:", this.state.timerSeconds);

            if (taskId) {
                // We use a partial update payload
                API.updateTask(taskId, { time_spent: this.state.timerSeconds })
                    .then(async () => {
                        console.log("✅ Timer Saved to DB.");
                        UI.showNotification('⏱️ Tiempo Guardado', 'El contador se ha actualizado.');
                        // Update Local State immediately
                        const localTask = this.state.data.tasks.find(t => t.id == taskId);
                        if (localTask) {
                            localTask.time_spent = this.state.timerSeconds;
                            console.log("✅ Local Task Updated:", localTask);
                        } else {
                            console.warn("⚠️ Local task not found for ID:", taskId);
                        }

                        // Force sync with server to ensure persistence
                        await this.loadData();
                        this.render();
                    })
                    .catch(err => console.error("Auto-save timer failed", err));
            } else {
                console.warn("⚠️ No Task ID found for auto-save.");
            }

        } else {
            // START TIMER
            this.state.timerRunning = true;
            if (btn) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            }
            console.log("⏱️ START TIMER");

            // Clear any existing to be safe
            clearInterval(this.timerInterval);
            this.timerInterval = setInterval(() => {
                this.state.timerSeconds = parseInt(this.state.timerSeconds || 0, 10) + 1;

                // Format
                const totalSeconds = this.state.timerSeconds;
                const h = Math.floor(totalSeconds / 3600);
                const m = Math.floor((totalSeconds % 3600) / 60);
                const s = totalSeconds % 60;

                if (display) {
                    display.textContent =
                        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                }
            }, 1000);
        }
    },

    // Google Calendar Logic
    addToGoogleCalendar() {
        // Get values from form
        const title = document.querySelector('input[name="title"]').value;
        const note = document.querySelector('textarea[name="calendar_notes"]').value;
        const date = document.querySelector('input[name="due_date"]').value;

        if (!title || !date) {
            alert("Por favor, pon un título y una fecha.");
            return;
        }

        // Format dates YYYYMMDD
        const start = date.replace(/-/g, '');
        const end = start; // All day event usually

        const details = encodeURIComponent(note || "Entrega proyecto: " + title);
        const text = encodeURIComponent("Entrega: " + title);

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
        window.open(url, '_blank');
    },

    // Modals
    openModal(modalId, taskIdOrData = null) {
        const modal = document.getElementById(`modal-${modalId}`);
        if (!modal) return;

        console.log(`Open Modal: ${modalId}`, taskIdOrData);

        // Overlay
        document.getElementById('modal-overlay').classList.remove('hidden');
        modal.classList.remove('hidden');

        // Reset Form
        if (modalId === 'create-task') {
            this.populateForms(); // Ensure dropdowns are populated

            const modalTitle = document.querySelector('#modal-create-task .modal-header h3');
            const form = document.getElementById('form-create-task');

            // Default State
            if (modalTitle) modalTitle.textContent = 'Nuevo Proyecto';
            form.reset();
            form.removeAttribute('data-editing-id');
            const btnDelete = document.getElementById('btn-delete-task');
            if (btnDelete) btnDelete.classList.add('hidden');

            // Clean dynamic areas
            document.getElementById('checklist-items').innerHTML = '';
            const extraDesc = document.getElementById('extra-descriptions-container');
            if (extraDesc) extraDesc.innerHTML = '';
            const extraFinancial = document.getElementById('extra-financial-notes-container');
            if (extraFinancial) extraFinancial.innerHTML = '';
            this.resetBudgetSection();

            // Reset Timer state
            const timerDisplay = document.getElementById('timer-display');
            if (timerDisplay) timerDisplay.textContent = '00:00:00';
            clearInterval(this.timerInterval);
            let btnTimerBase = document.getElementById('btn-timer');
            if (btnTimerBase) {
                btnTimerBase.classList.remove('active');
                btnTimerBase.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
            this.state.timerSeconds = 0;

            // Determine Intent: Edit Task (ID) or Create from Mail (Object)
            if (taskIdOrData && typeof taskIdOrData === 'object') {
                // PRE-FILL FROM EMAIL (OR OTHER OBJECT)
                console.log("Pre-filling modal with data:", taskIdOrData);
                const mail = taskIdOrData;

                if (modalTitle) modalTitle.textContent = 'Convertir Correo a Tarea';
                form.dataset.convertingEmailId = mail.id;

                // Title & Desc
                const titleInput = form.querySelector('[name="title"]');
                const descInput = form.querySelector('[name="description"]');

                if (titleInput) titleInput.value = mail.subject || '(Sin Asunto)';
                if (descInput) descInput.value = mail.body || '';

                // Client Match/Create
                const clientSelect = form.querySelector('[name="client"]');
                if (clientSelect && mail.from) {
                    let clientOption = Array.from(clientSelect.options).find(opt => opt.text === mail.from || opt.value === mail.from);
                    if (clientOption) {
                        clientSelect.value = clientOption.value;
                    } else {
                        const newOpt = document.createElement('option');
                        newOpt.value = mail.from;
                        newOpt.text = mail.from;
                        newOpt.selected = true;
                        clientSelect.add(newOpt);
                        clientSelect.value = mail.from;
                    }
                }

                // Attachments
                const attachContainer = document.getElementById('attachments-container');
                const attachList = document.getElementById('task-attachments-list');
                const hiddenInput = document.getElementById('input-attachments');

                if (mail.attachments && mail.attachments.length > 0) {
                    attachContainer.classList.remove('hidden');
                    attachList.innerHTML = mail.attachments.map(a => `
                        <span class="attachment-chip" title="${a.filename || a}">
                            <i class="fa-solid fa-file"></i> ${a.filename || a}
                        </span>
                    `).join('');
                    hiddenInput.value = JSON.stringify(mail.attachments);
                } else {
                    attachContainer.classList.add('hidden');
                    attachList.innerHTML = '';
                    hiddenInput.value = '[]';
                }

            } else if (taskIdOrData) {
                // EDIT EXISTING TASK
                const taskId = taskIdOrData;
                // Show Delete Button
                const btnDelete = document.getElementById('btn-delete-task');
                if (btnDelete) btnDelete.classList.remove('hidden');

                // Set editing ID
                form.setAttribute('data-editing-id', taskId);

                const task = this.state.data.tasks.find(t => t.id == taskId);
                if (task) {
                    // Populate fields
                    form.elements['title'].value = task.title;
                    form.elements['scope'].value = task.scope;
                    form.elements['priority'].value = task.priority || 'medium';
                    form.elements['client'].value = task.client || '';
                    if (task.assignee) form.elements['assignee'].value = task.assignee;

                    form.elements['description'].value = task.description || '';
                    form.elements['drive_link'].value = task.drive_link || '';
                    if (task.date && form.elements['due_date']) form.elements['due_date'].value = task.date;

                    // Budget Data (Hypothetically stored in task)
                    if (task.budget) {
                        form.elements['budget_client'].value = task.budget.client || '';
                        form.elements['budget_cost'].value = task.budget.cost || '';
                        form.elements['budget_suppliers'].value = task.budget.suppliers || '';
                        form.elements['budget_notes'].value = task.budget.notes || '';
                        form.elements['budget_client_info'].value = task.budget.client_info || '';
                        if (task.budget.date) form.elements['budget_date'].value = task.budget.date;

                        this.calcProfit();
                    } else {
                        // Clear if no budget data
                        document.getElementById('budget-profit').value = '-';
                        document.getElementById('budget-profit').style.background = '#ecfdf5';
                    }

                    // Render Checklist
                    if (task.checklist) {
                        task.checklist.forEach(item => this.addCheckItem(item));
                    }

                    // Render Attachments
                    const attachContainer = document.getElementById('attachments-container');
                    const attachList = document.getElementById('task-attachments-list');
                    if (task.attachments && task.attachments.length > 0) {
                        attachContainer.classList.remove('hidden');
                        attachList.innerHTML = task.attachments.map(a => `
                            <span class="attachment-chip">
                                <i class="fa-solid fa-file"></i> ${a.filename || a}
                            </span>
                        `).join('');
                        const hInput = document.getElementById('input-attachments');
                        if (hInput) hInput.value = JSON.stringify(task.attachments);
                    } else {
                        attachContainer.classList.add('hidden');
                        attachList.innerHTML = '';
                        const hInput = document.getElementById('input-attachments');
                        if (hInput) hInput.value = '';
                    }

                    // RELATED EMAILS LOGIC (History)
                    // Simple heuristic: If email subject contains task title or vice-versa
                    if (this.state.data.emails) {
                        // Filter emails
                        // We can also match by client email if we want strictly client history
                        const related = this.state.data.emails.filter(e =>
                            e.subject && task.title && (
                                e.subject.toLowerCase().includes(task.title.toLowerCase()) ||
                                task.title.toLowerCase().includes(e.subject.toLowerCase())
                            )
                        );

                        // We need a place to show them. Let's use the timeline container for now, as "Related Activity"
                        // Or create a new div. Let's use timeline container with a special header.
                        const timelineContainer = document.getElementById('task-timeline');
                        if (related.length > 0) {
                            const relatedHTML = `
                                <div class="related-emails-section" style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px dashed #ccc;">
                                    <h4 style="color: #666; font-size: 0.85rem; margin-bottom: 0.5rem;">📧 Correos Relacionados (Buzón)</h4>
                                    ${related.map(e => `
                                        <div class="timeline-item related-email" style="opacity: 0.8;" onclick="App.readEmail(${e.id}); App.closeModal('create-task');">
                                            <div class="timeline-icon client"><i class="fa-solid fa-envelope"></i></div>
                                            <div class="timeline-content">
                                                <div class="timeline-header">
                                                    <span class="timeline-author">${e.from}</span>
                                                    <span class="timeline-date">${e.date}</span>
                                                </div>
                                                <div class="timeline-body">${e.subject}</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                              `;
                            // Prepend to timeline content (which we are about to set below)
                            // Actually, we set it below, so let's store it.
                            timelineContainer.innerHTML = relatedHTML;
                        } else {
                            timelineContainer.innerHTML = '';
                        }
                    }

                    // Render Timeline (Existing Comments)
                    const timelineContainer = document.getElementById('task-timeline');
                    // We append to existing if we added related emails
                    if (task.comments && task.comments.length > 0) {
                        task.comments.forEach(c => {
                            const iconMap = { 'client': 'fa-user', 'internal': 'fa-building', 'system': 'fa-robot' };
                            const div = document.createElement('div');
                            div.className = 'timeline-item';
                            div.innerHTML = `
                                <div class="timeline-icon ${c.type}">
                                    <i class="fa-solid ${iconMap[c.type] || 'fa-comment'}"></i>
                                </div>
                                <div class="timeline-content">
                                    <div class="timeline-header">
                                        <span class="timeline-author">${c.author}</span>
                                        <span class="timeline-date">${c.date}</span>
                                    </div>
                                    <div class="timeline-body">${c.text}</div>
                                </div>
                            `;
                            timelineContainer.appendChild(div);
                        });
                    } else if (!timelineContainer.innerHTML) {
                        timelineContainer.innerHTML += '<div class="empty-state">No hay actividad reciente.</div>';
                    }


                    // Restore Timer
                    this.state.timerSeconds = parseInt(task.time_spent, 10) || 0;
                    console.log("⏱️ OPEN MODAL. Restored Timer:", this.state.timerSeconds, "From Task Data:", task.time_spent);

                    this.state.timerRunning = false;
                    // Stop any existing timer from another session just in case, though modal close should handle it.
                    clearInterval(this.timerInterval);
                    const btnTimer = document.getElementById('btn-timer');
                    if (btnTimer) {
                        btnTimer.classList.remove('active');
                        btnTimer.innerHTML = '<i class="fa-solid fa-play"></i>';
                    }

                    const display = document.getElementById('timer-display');
                    if (display) {
                        const totalSeconds = this.state.timerSeconds;
                        const h = Math.floor(totalSeconds / 3600);
                        const m = Math.floor((totalSeconds % 3600) / 60);
                        const s = totalSeconds % 60;
                        display.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    }
                }

                // Toggle Delete Button
                const deleteBtn = document.getElementById('btn-delete-task');
                // form is already defined in this scope
                if (taskId) {
                    if (deleteBtn) deleteBtn.classList.remove('hidden');
                    if (form) form.setAttribute('data-editing-id', taskId);
                } else {
                    if (deleteBtn) deleteBtn.classList.add('hidden');
                    if (form) form.removeAttribute('data-editing-id');
                }
            }
        }
    },

    calcProfit() {
        const income = Number(document.querySelector('input[name="budget_client"]').value) || 0;
        const internal = Number(document.querySelector('input[name="budget_cost"]').value) || 0;
        const suppliers = Number(document.querySelector('input[name="budget_suppliers"]').value) || 0;

        const profit = income - (internal + suppliers);
        const profitInput = document.getElementById('budget-profit');
        profitInput.value = profit.toFixed(2) + ' €';

        // Visual indicator
        if (profit < 0) {
            profitInput.style.color = '#ef4444';
            profitInput.style.backgroundColor = '#fef2f2';
        } else {
            profitInput.style.color = '#047857';
            profitInput.style.backgroundColor = '#ecfdf5';
        }
    },

    // Budget Logic
    resetBudgetSection() {
        const section = document.getElementById('budget-section');
        const locked = document.getElementById('budget-locked');
        const unlocked = document.getElementById('budget-unlocked');
        const badge = document.getElementById('budget-status-badge');

        if (!section) return;

        // Hide by default
        section.style.display = 'none';
        locked.classList.remove('hidden');
        unlocked.classList.add('hidden');
        badge.style.display = 'none';

        // Only show if user is allowed (Montse/Alba)
        const allowedUsers = ['montse', 'alba'];
        if (allowedUsers.includes(this.state.currentUser)) {
            section.style.display = 'block';
        }
    },

    unlockBudget() {
        const pinInput = document.getElementById('budget-pin-input');
        const errorMsg = document.getElementById('budget-pin-error');
        const pin = pinInput ? pinInput.value : '';

        console.log("Validando PIN...");
        const allowedUsers = ['montse', 'alba'];
        if (!this.state || !allowedUsers.includes(this.state.currentUser)) {
            alert("Error: No tienes permisos.");
            return;
        }

        if (pin === '00') {
            document.getElementById('budget-locked').classList.add('hidden');
            document.getElementById('budget-unlocked').classList.remove('hidden');
            document.getElementById('budget-status-badge').style.display = 'block';
            if (errorMsg) errorMsg.style.display = 'none';
        } else {
            if (errorMsg) errorMsg.style.display = 'block';
            pinInput.value = '';
        }
    },

    addExtraDescription() {
        const container = document.getElementById('extra-descriptions-container');
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';

        const textarea = document.createElement('textarea');
        textarea.name = 'extra_description[]';
        textarea.rows = '2';
        // Auto-add date
        const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        textarea.value = `[${dateStr}] `;
        textarea.placeholder = 'Nota adicional / Observación...';
        textarea.style.width = '100%';
        textarea.style.padding = '0.75rem';
        textarea.style.borderRadius = '0.5rem';
        textarea.style.border = '1px solid #e5e7eb';
        textarea.style.paddingRight = '30px';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        removeBtn.style.position = 'absolute';
        removeBtn.style.right = '10px';
        removeBtn.style.top = '10px';
        removeBtn.style.border = 'none';
        removeBtn.style.background = 'none';
        removeBtn.style.color = '#ef4444';
        removeBtn.style.cursor = 'pointer';
        removeBtn.onclick = () => wrapper.remove();

        wrapper.appendChild(textarea);
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    },

    openGoogleContacts() {
        const url = 'https://contacts.google.com/';
        window.open(url, '_blank');
    },

    addExtraFinancialNote() {
        const container = document.getElementById('extra-financial-notes-container');
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';

        const textarea = document.createElement('textarea');
        textarea.name = 'extra_financial_note[]';
        textarea.rows = '2';
        textarea.placeholder = 'Nota financiera extra...';
        textarea.style.width = '100%';
        textarea.style.padding = '0.75rem';
        textarea.style.borderRadius = '0.5rem';
        textarea.style.border = '1px solid #ffedd5'; /* Light orange border */
        textarea.style.paddingRight = '30px';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        removeBtn.style.position = 'absolute';
        removeBtn.style.right = '10px';
        removeBtn.style.top = '10px';
        removeBtn.style.border = 'none';
        removeBtn.style.background = 'none';
        removeBtn.style.color = '#ef4444';
        removeBtn.style.cursor = 'pointer';
        removeBtn.onclick = () => wrapper.remove();

        wrapper.appendChild(textarea);
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    },

    async simulateEmail() {
        const from = prompt("Remitente (Email):", "admin@lagrafica.com");
        if (!from) return;
        const subject = prompt("Asunto del Mail:", "Licitación Proyecto Verano 2026");
        const body = prompt("Cuerpo del mensaje:", "Adjunto los pliegos para la nueva licitación.");

        try {
            const response = await fetch('/api/webhook/gmail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, subject, body, attachments: [{ filename: 'pliego.pdf' }] })
            });

            if (!response.ok) throw new Error("Backend offline");

            const result = await response.json();
            UI.showNotification('📧 Email Recibido', `Clasificado en: ${result.classification.scope.toUpperCase()}`);
            await this.loadData();
            this.render();
        } catch (err) {
            console.warn('Backend unavailable (Simulation Mode). Adding email to local state.');
            // Fallback for demo
            const newEmail = {
                id: Date.now(),
                from: from,
                to: 'montse@lagrafica.com', // Default to current user for demo
                subject: subject,
                body: body,
                date: new Date().toISOString().split('T')[0],
                read: false,
                attachments: [{ filename: 'simulacion.pdf' }]
            };

            if (!this.state.data.emails) this.state.data.emails = [];
            this.state.data.emails.unshift(newEmail);

            UI.showNotification('📧 Email Simulado', 'Añadido al buzón (Local)');
            this.render();
        }
    },

    // Quick Notes Logic
    async loadQuickNotes() {
        const list = document.getElementById('quick-notes-list');
        if (!list) return;

        try {
            // Use API instead of fetch
            const notes = (await API.getNotes(this.state.currentUser)) || [];
            this.renderQuickNotes(notes);
        } catch (err) {
            console.error("Error loading notes:", err);
            list.innerHTML = '<div class="empty-state" style="font-size: 0.8rem; color: #ef4444;">Error al cargar notas.</div>';
        }
    },

    renderQuickNotes(notes) {
        const list = document.getElementById('quick-notes-list');
        if (!list) return;

        if (!notes || notes.length === 0) {
            list.innerHTML = '<div class="empty-state" style="font-size: 0.8rem; opacity: 0.5; padding: 1rem; text-align: center;">No hay notas pendientes.</div>';
            return;
        }

        list.innerHTML = notes.map(note => `
            <div class="quick-note-item ${note.done ? 'done' : ''}">
                <input type="checkbox" ${note.done ? 'checked' : ''} onchange="App.toggleQuickNote(${note.id})">
                <span>${note.text}</span>
                <i class="fa-solid fa-trash btn-delete-note" onclick="App.deleteQuickNote(${note.id})"></i>
            </div>
        `).join('');
    },

    async addQuickNote() {
        const input = document.getElementById('input-quick-note');
        if (!input || !input.value.trim()) return;

        const newNote = {
            id: Date.now().toString(),
            text: input.value.trim(),
            done: false,
            memberId: this.state.currentUser
        };

        try {
            const notes = (await API.getNotes(this.state.currentUser)) || [];
            notes.push(newNote);
            await API.saveNotes(this.state.currentUser, notes);

            input.value = '';
            this.renderQuickNotes(notes);
        } catch (err) {
            console.error("Error adding note:", err);
        }
    },

    async toggleQuickNote(noteId) {
        try {
            const notes = await API.getNotes(this.state.currentUser);
            const note = notes.find(n => n.id == noteId); // loose equality for string/int differences
            if (note) {
                note.done = !note.done;
                await API.saveNotes(this.state.currentUser, notes);
                this.renderQuickNotes(notes);
            }
        } catch (err) {
            console.error("Error toggling note:", err);
        }
    },

    async deleteQuickNote(noteId) {
        if (!confirm('¿Eliminar esta nota?')) return;

        try {
            let notes = await API.getNotes(this.state.currentUser);
            notes = notes.filter(n => n.id != noteId); // loose equality

            await API.saveNotes(this.state.currentUser, notes);
            this.renderQuickNotes(notes);
        } catch (err) {
            console.error("Error deleting note:", err);
        }
    },

    closeModal() {
        // Auto-save timer if running
        if (this.state.timerRunning) {
            this.toggleTimer(); // This stops causing auto-save
        }
        document.getElementById('modal-overlay').classList.add('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }
};

// Expose to window for HTML event handlers
window.App = App;

// Init
document.addEventListener('DOMContentLoaded', () => App.init());
