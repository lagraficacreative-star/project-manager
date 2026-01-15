import { API } from './api.js';

export const UI = {
    // Render Calendar View
    renderCalendar(container, data) {
        container.innerHTML = `
            <div class="calendar-view">
                <div class="calendar-header">
                    <h1><i class="fa-solid fa-calendar-days"></i> Calendario de Proyectos</h1>
                    <div class="calendar-filters">
                        <select id="calendar-member-filter" onchange="App.filterCalendar()">
                            <option value="all">Todos los Miembros</option>
                            ${data.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                        </select>
                        <select id="calendar-project-filter" onchange="App.filterCalendar()">
                            <option value="all">Todos los Proyectos</option>
                            <option value="design">Diseño</option>
                            <option value="web">Web</option>
                            <option value="social">Redes</option>
                            <option value="kit">Kit Digital</option>
                            <option value="tenders">Licitaciones</option>
                        </select>
                    </div>
                </div>

                <div class="calendar-container glass-panel" style="padding: 2rem; background: white; border-radius: 1rem; min-height: 500px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;">
                    <i class="fa-brands fa-google" style="font-size: 3rem; color: #4285F4;"></i>
                    <div style="text-align: center;">
                        <h2 style="margin-bottom: 0.5rem;">Google Calendar Sync</h2>
                        <p style="color: var(--text-secondary);">Visualiza las entregas y licitaciones sincronizadas con Google Calendar.</p>
                    </div>
                    <div id="calendar-placeholder-list" style="width: 100%; max-width: 600px;">
                        <!-- Filtered events will appear here -->
                        ${this.renderCalendarEvents(data.tasks)}
                    </div>
                    <button class="btn-primary" onclick="window.open('https://calendar.google.com', '_blank')">
                        <i class="fa-solid fa-external-link"></i> Abrir Google Calendar
                    </button>
                </div>
            </div>
        `;
    },

    renderCalendarEvents(tasks, memberId = 'all', scopeId = 'all') {
        let filtered = tasks;
        if (memberId !== 'all') filtered = filtered.filter(t => t.assignee === memberId);
        if (scopeId !== 'all') filtered = filtered.filter(t => t.scope === scopeId);

        if (filtered.length === 0) return '<p style="text-align: center; color: #9ca3af;">No hay entregas programadas para estos filtros.</p>';

        return filtered.slice(0, 10).map(t => `
            <div class="calendar-event-item" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid #f1f5f9;">
                <div class="event-date" style="background: #f8fafc; padding: 0.5rem; border-radius: 0.5rem; text-align: center; min-width: 60px;">
                    <span style="display: block; font-size: 0.7rem; font-weight: bold; color: var(--primary-color);">ENE</span>
                    <span style="font-size: 1.2rem; font-weight: bold;">${t.date ? t.date.split('-')[2] : '07'}</span>
                </div>
                <div style="flex: 1;">
                    <strong style="display: block; font-size: 0.9rem;">${t.title}</strong>
                    <span style="font-size: 0.8rem; color: #64748b;">${t.client} • Responsable: ${t.assignee}</span>
                </div>
                <div class="dot ${t.scope}" style="width: 12px; height: 12px; border-radius: 50%;"></div>
            </div>
        `).join('');
    },

    // Render Mailbox View
    renderMailbox(container, data, memberId, currentFolder = 'INBOX') {
        const member = data.members.find(m => m.id === memberId) || data.members[0];
        // Clean folder name for display
        const isArchive = currentFolder.includes('Archivo');

        container.innerHTML = `
            <div class="mailbox-view">
                <div class="mailbox-header">
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <h1><i class="fa-solid ${isArchive ? 'fa-box-archive' : 'fa-inbox'}"></i> ${isArchive ? 'Archivados' : 'Bandeja de Entrada'}</h1>
                        <select onchange="App.navigate('mailbox', this.value)" style="font-size: 1rem; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; font-weight: 600;">
                            ${data.members.map(m => `<option value="${m.id}" ${m.id === memberId ? 'selected' : ''}>${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mailbox-actions">
                        <div class="folder-tabs" style="display:flex; background:#f1f5f9; padding:4px; border-radius:8px; margin-right: 1rem;">
                            <button class="btn-tab ${!isArchive ? 'active' : ''}" onclick="App.changeMailboxFolder('INBOX')" style="padding:6px 12px; border:none; background:${!isArchive ? 'white' : 'transparent'}; border-radius:6px; font-weight:600; cursor:pointer; box-shadow:${!isArchive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
                                Buzón
                            </button>
                            <button class="btn-tab ${isArchive ? 'active' : ''}" onclick="App.changeMailboxFolder('Archivo_Fichas/Correos_Procesados')" style="padding:6px 12px; border:none; background:${isArchive ? 'white' : 'transparent'}; border-radius:6px; font-weight:600; cursor:pointer; box-shadow:${isArchive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
                                Archivados
                            </button>
                        </div>
                        <small style="margin-right:0.5rem;">Servidor: <strong>Nominalia</strong></small>
                        <button class="btn-icon" onclick="App.render()" title="Refrescar"><i class="fa-solid fa-sync"></i></button>
                    </div>
                </div>

                <div class="mailbox-layout glass-panel">
                    <div class="mail-list-side" id="mail-list-container">
                        ${this.renderMailList(data.emails || [], memberId, data, currentFolder)}
                    </div>
                    <div class="mail-content-side" id="mail-detail-container">
                        <div class="mail-empty-state">
                            <i class="fa-solid fa-envelope-open-text"></i>
                            <p>Selecciona un mensaje para leerlo</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderMailList(emails, memberId, data, currentFolder = 'INBOX') {
        // Filter emails by member email
        const member = data.members.find(m => m.id === memberId);
        if (!member) return `<div class="mail-empty-list">Miembro no encontrado.</div>`;

        let filtered = emails.filter(e => e.to === member.email);

        // Filter by Folder (Inbox vs Archive)
        const processedIds = data.processed_emails || [];
        const isArchive = currentFolder.includes('Archivo');

        if (isArchive) {
            // Show only processed
            filtered = filtered.filter(e => processedIds.includes(e.id) || processedIds.includes(String(e.id)));
        } else {
            // Show only unprocessed (Inbox)
            filtered = filtered.filter(e => !processedIds.includes(e.id) && !processedIds.includes(String(e.id)));
        }

        if (filtered.length === 0) {
            return `<div class="mail-empty-list">No hay correos en ${isArchive ? 'Archivados' : 'la bandeja de entrada'}.</div>`;
        }

        return filtered.map(mail => {
            // Check if email ID is in the converted list (processed_emails often stores archives, but let's be explicit)
            // Or if the mail object specifically has the converted flag (which we will set in app.js)
            const isConverted = mail.converted === true || mail.status === 'converted';

            // Logic for 'Archivados' view to show converted items in green
            // If we are in the Archive folder view, and it's converted, show distinct green.
            const isArchiveView = (document.querySelector('.btn-tab.active') && document.querySelector('.btn-tab.active').textContent.includes('Archivados'));

            let baseBg, borderLeft;

            if (isConverted) {
                baseBg = '#dcfce7'; // Green-100
                borderLeft = '4px solid #22c55e'; // Green-500
            } else {
                baseBg = mail.read ? '#fff' : '#f0f9ff';
                borderLeft = mail.read ? '4px solid transparent' : '4px solid #3b82f6';
            }

            return `
            <div class="mail-item ${mail.read ? '' : 'unread'}" id="mail-item-${mail.id}" onclick="App.readEmail(${mail.id})" 
                 style="background: ${baseBg}; border-left: ${borderLeft}; position: relative;">
                <div class="mail-item-head" style="justify-content: space-between; display: flex;">
                     <div style="flex:1; overflow:hidden; text-overflow:ellipsis;">
                        <span class="mail-from" style="font-weight: 600;">${mail.from}</span>
                     </div>
                     <div style="text-align: right; min-width: 80px;">
                        ${isConverted
                    ? `<span style="background:#bbf7d0; color:#15803d; font-size:0.7rem; padding:2px 6px; border-radius:999px; font-weight:bold;">Convertido</span>`
                    : `<span class="mail-date">${mail.date}</span>`
                }
                     </div>
                </div>
                <div class="mail-subject" style="font-weight: ${mail.read ? 'bo' : 'bold'}; margin-top: 0.25rem;">${mail.subject}</div>
                <div class="mail-preview" style="color:#666; font-size:0.85rem; margin-top:0.25rem;">${mail.body ? mail.body.substring(0, 60) : ''}...</div>

                ${(!isConverted && !isArchiveView) ? `
                    <div class="mail-quick-actions" style="margin-top: 0.5rem; display: flex; justify-content: flex-end;">
                        <button onclick="event.stopPropagation(); App.createTaskFromEmail('${mail.id}')" 
                                style="background: #fb923c; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                            <i class="fa-solid fa-magic-wand-sparkles"></i> Crear Ficha
                        </button>
                    </div>
                ` : ''}
            </div>
            `;
        }).join('');
    },

    renderEmailDetail(container, mail) {
        container.innerHTML = `
            <div class="mail-detail">
                <div class="mail-detail-header">
                    <h2>${mail.subject}</h2>
                    <div class="mail-detail-meta">
                        <div class="detail-row">
                            <strong>De:</strong> <span>${mail.from}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Para:</strong> <span>${mail.to}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Fecha:</strong> <span>${mail.date}</span>
                        </div>
                    </div>
                </div>
                <div class="mail-detail-body">
                    ${(mail.body || '<i>(Sin contenido)</i>')}
                </div>
                ${mail.attachments && mail.attachments.length > 0 ? `
                    <div class="mail-attachments">
                        <p><i class="fa-solid fa-paperclip"></i> Adjuntos (${mail.attachments.length})</p>
                        <div class="attachment-chips">
                            ${mail.attachments.map(a => `<span class="attachment-chip"><i class="fa-solid fa-file"></i> ${a.filename}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="mail-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                    <button type="button" class="btn-danger" onclick="event.stopPropagation(); App.archiveEmail('${mail.id}')" title="Mover a Procesados (Eliminar de vista)" style="text-decoration: none; border: 1px solid #ef4444; color: #ef4444; background: white;">
                        <i class="fa-solid fa-trash"></i> Descartar
                    </button>
                    <button type="button" class="btn-secondary" onclick="event.stopPropagation(); App.replyToEmail('${mail.from}')" title="Responder (mailto)">
                        <i class="fa-solid fa-reply"></i> Responder
                    </button>
                    <button type="button" class="btn-secondary" onclick="event.stopPropagation(); App.addToTaskFromEmail('${mail.id}')">
                        <i class="fa-solid fa-plus"></i> Añadir a Ficha
                    </button>
                     <button type="button" class="btn-primary" onclick="event.stopPropagation(); App.createTaskFromEmail('${mail.id}')" style="margin-left: auto; padding: 0.6rem 1.2rem; font-size: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                        <i class="fa-solid fa-magic-wand-sparkles"></i> Crear Ficha
                    </button>
                </div>
            </div>
        `;
    },

    renderRelatedEmails(container, emails) {
        if (!emails || emails.length === 0) return;
        container.innerHTML = `
            <div style="margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px;">
                <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #64748b;">Historial Relacionado (Asunto)</h4>
                ${emails.map(e => `
                    <div style="padding: 0.5rem; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; cursor: pointer;" onclick="App.readEmail(${e.id})">
                        <span style="font-weight: 600;">${e.date}</span> - ${e.subject}
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Render Dashboard
    renderDashboard(container, data, userName = 'Montse') {
        const stats = {
            active: data.tasks.filter(t => t.status !== 'done').length,
            high: data.tasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
            clients: new Set(data.tasks.map(t => t.client)).size
        };

        container.innerHTML = `
            <div class="dashboard-head">
                <h1>Hola, ${userName} 👋</h1>
                <p>Aquí tienes el resumen de hoy.</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="icon-box blue"><i class="fa-solid fa-layer-group"></i></div>
                    <div class="stat-info">
                        <span class="value">${stats.active}</span>
                        <span class="label">Tareas Activas</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="icon-box red"><i class="fa-solid fa-fire"></i></div>
                    <div class="stat-info">
                        <span class="value">${stats.high}</span>
                        <span class="label">Prioridad Alta</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="icon-box purple"><i class="fa-solid fa-users"></i></div>
                    <div class="stat-info">
                        <span class="value">${stats.clients}</span>
                        <span class="label">Clientes Activos</span>
                    </div>
                </div>
            </div>

            <h3 class="section-title" style="margin-top: 2rem;"><i class="fa-brands fa-google-drive" style="color: #4285F4;"></i> LaGràfica Projects Drive</h3>
            <div class="drive-grid">
                <a href="https://drive.google.com/drive/search?q=LaGràfica%20Projects" target="_blank" class="drive-link-card">
                    <i class="fa-solid fa-folder-tree" style="color: #4b5563;"></i>
                    <span>Raíz Proyectos</span>
                </a>
                <a href="https://drive.google.com/drive/search?q=LaGràfica%20Projects%20Web" target="_blank" class="drive-link-card">
                    <i class="fa-solid fa-laptop-code" style="color: #3b82f6;"></i>
                    <span>Web</span>
                </a>
                <a href="https://drive.google.com/drive/search?q=LaGràfica%20Projects%20Diseño" target="_blank" class="drive-link-card">
                    <i class="fa-solid fa-pen-nib" style="color: #f06543;"></i>
                    <span>Diseño</span>
                </a>
                <a href="https://drive.google.com/drive/search?q=LaGràfica%20Projects%20Redes" target="_blank" class="drive-link-card">
                    <i class="fa-solid fa-hashtag" style="color: #fb923c;"></i>
                    <span>Redes</span>
                </a>
                <a href="https://drive.google.com/drive/search?q=LaGràfica%20Projects%20Gestión" target="_blank" class="drive-link-card">
                    <i class="fa-solid fa-folder-lock" style="color: #b45309;"></i>
                    <span>Gestión</span>
                </a>
                <a href="https://drive.google.com/drive/search?q=LaGràfica%20Projects%20Kit%20Digital" target="_blank" class="drive-link-card">
                    <i class="fa-solid fa-bolt" style="color: #eab308;"></i>
                    <span>Kit Digital</span>
                </a>
                <a href="https://drive.google.com/drive/search?q=LaGràfica%20Projects%20Licitaciones" target="_blank" class="drive-link-card">
                    <i class="fa-solid fa-clipboard-list" style="color: #0891b2;"></i>
                    <span>Licitaciones</span>
                </a>
            </div>

            <div class="dashboard-secondary-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-top: 2rem;">
                <!-- Activity Column -->
                <div class="activity-section">
                    <h3 class="section-title" style="margin-top: 0;"><i class="fa-solid fa-clock-rotate-left"></i> Actividad Reciente</h3>
                    <div class="activity-list">
                        ${data.tasks.slice(0, 5).map(t => `
                            <div class="activity-item">
                                <div class="dot ${t.scope || 'default'}"></div>
                                <div class="content">
                                    <strong>${t.title}</strong>
                                    <span>${t.client} • ${t.status}</span>
                                </div>
                                <span class="time">${t.date || 'Hoy'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Quick Notes Column -->
                <div class="quick-notes-section">
                    <h3 class="section-title" style="margin-top: 0;"><i class="fa-solid fa-note-sticky" style="color: #eab308;"></i> Notas Rápidas</h3>
                    <div class="quick-notes-card glass-panel" style="padding: 1.25rem; border-radius: 1rem; background: white; height: 100%;">
                        <div class="quick-notes-input-group" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                            <input type="text" id="input-quick-note" placeholder="Escribe una nota rápida..." 
                                style="flex: 1; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.5rem; font-size: 0.85rem;"
                                onkeypress="if(event.key === 'Enter') App.addQuickNote()">
                            <button onclick="App.addQuickNote()" class="btn-primary" style="padding: 0.5rem 0.75rem; border-radius: 0.5rem;">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                        <div id="quick-notes-list" class="quick-notes-list">
                            <!-- Injected by app.js -->
                            <div class="loading-spinner" style="font-size: 0.8rem;">Cargando notas...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Render Locked Screen for Restricted Sections
    renderLockedScreen(container, scope) {
        const scopeNames = { budgets: 'Presupuestos', billing: 'Facturación' };
        container.innerHTML = `
            <div class="locked-view-container">
                <div class="locked-card">
                    <i class="fa-solid fa-shield-halved"></i>
                    <h2>Área de Gestión Protegida</h2>
                    <p>Introduce el PIN para acceder a <strong>${scopeNames[scope]}</strong></p>
                    <div class="pin-entry">
                        <input type="password" id="global-pin-input" maxlength="4" placeholder="••••">
                        <button onclick="App.verifyGlobalPIN('${scope}')">Acceder</button>
                    </div>
                    <p id="global-pin-error" class="error-msg" style="display:none;">PIN Incorrecto</p>
                </div>
            </div>
        `;
    },

    // Render Team & Filters at Top
    renderTeamTop(container, members, clients, filters) {
        // Defensive check
        if (!filters) filters = { member: 'all', client: 'all', search: '' };

        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem;">
                <div class="team-avatars" style="display:flex; gap:-5px;">
                    ${members.map(m => `
                        <div class="avatar-top ${filters.member === m.id ? 'active-filter' : ''}" 
                             onclick="App.state.boardFilters.member = App.state.boardFilters.member === '${m.id}' ? 'all' : '${m.id}'; App.render();" 
                             style="cursor:pointer; border: 2px solid ${filters.member === m.id ? 'var(--primary-color)' : 'white'};"
                             title="Filtrar por ${m.name}">
                            ${m.avatar}
                        </div>
                    `).join('')}
                </div>
                
                <div class="header-filters" style="display:flex; gap:0.5rem;">
                    <!-- Member Filter Dropdown -->
                    <select onchange="App.state.boardFilters.member = this.value; App.render();" 
                            style="padding: 0.3rem 0.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; font-size: 0.85rem; background: rgba(255,255,255,0.8);">
                        <option value="all">Todos los Miembros</option>
                        ${members.map(m => `<option value="${m.id}" ${filters.member === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>

                    <!-- Client Filter Dropdown -->
                    <select onchange="App.state.boardFilters.client = this.value; App.render();" 
                            style="padding: 0.3rem 0.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; font-size: 0.85rem; background: rgba(255,255,255,0.8);">
                        <option value="all">Todos los Clientes</option>
                        ${clients.map(c => `<option value="${c.name}" ${filters.client === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
    },

    // Populate Selects
    populateSelect(selectId, options, valueKey = 'id', labelKey = 'name') {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">Seleccionar...</option>';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt[valueKey];
            option.textContent = opt[labelKey];
            select.appendChild(option);
        });
    },

    renderClientsView(container, clients) {
        container.innerHTML = `
            <div class="view-header">
                <h2><i class="fa-solid fa-tags"></i> Gestión de Clientes</h2>
                <button class="btn-primary" onclick="App.createNewClient()">
                    <i class="fa-solid fa-plus"></i> Añadir Cliente
                </button>
            </div>
            
            <div class="clients-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-top: 2rem;">
                ${clients.map(client => `
                    <div class="card client-card" style="border-left: 4px solid ${client.color || '#ccc'}; display: flex; justify-content: space-between; align-items: center; padding: 1.5rem;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem;">${client.name}</h3>
                            <span style="font-size: 0.85rem; color: #666;">ID: ${client.id}</span>
                        </div>
                        <button onclick="App.deleteClient('${client.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderBoard(container, data, scope = 'all', filters = { member: 'all', client: 'all', search: '' }) {
        // Defensive Update: Ensure filters is an object
        if (!filters) filters = { member: 'all', client: 'all', search: '' };

        // 1. Filter Tasks
        let tasks = data.tasks;

        // Scope Filter
        if (scope !== 'all') {
            tasks = tasks.filter(t => t.scope === scope);
        }

        // Member Filter
        if (filters.member && filters.member !== 'all') {
            tasks = tasks.filter(t => t.assignee === filters.member);
        }

        // Client Filter
        if (filters.client && filters.client !== 'all') {
            tasks = tasks.filter(t => t.client === filters.client);
        }

        // Search Filter
        if (filters.search) {
            const q = filters.search.toLowerCase();
            tasks = tasks.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.client && t.client.toLowerCase().includes(q)) ||
                (t.description && t.description.toLowerCase().includes(q))
            );
        }

        // Use dynamic columns or defaults
        const defaultColumns = [
            { id: 'pending', title: 'Pendiente' },
            { id: 'todo', title: 'Para hacer' },
            { id: 'in_progress', title: 'En proceso' },
            { id: 'done', title: 'Acabado' }
        ];
        const columns = data.columns && data.columns.length > 0 ? data.columns : defaultColumns;

        container.innerHTML = `
            <div class="board-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center;">
                 <button class="btn-secondary" id="btn-add-col" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                    <i class="fa-solid fa-plus"></i> Nueva Columna
                </button>
                <div class="results-count" style="margin-left: auto; font-size: 0.85rem; color: #666;">
                    ${tasks.length} proyectos encontrados
                </div>
            </div>

            <div class="kanban-board" style="overflow-x: auto; padding-bottom: 1rem;">
                ${columns.map(col => `
                    <div class="column" data-status="${col.id}" 
                         ondragover="event.preventDefault();" 
                         ondrop="App.handleDrop(event, '${col.id}')"
                         style="min-width: 280px;">
                        <div class="column-header" style="justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
                                <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${col.title}</span>
                                <span class="count">${tasks.filter(t => t.status === col.id).length}</span>
                            </div>
                            <div class="col-actions">
                                <button class="edit-col-btn" data-id="${col.id}" style="background:none; border:none; color:#9ca3af; cursor:pointer; font-size:0.8rem; padding:2px; margin-right: 4px;" title="Editar nombre">
                                    <i class="fa-solid fa-pencil"></i>
                                </button>
                                <button class="delete-col-btn" data-id="${col.id}" style="background:none; border:none; color:#9ca3af; cursor:pointer; font-size:0.8rem; padding:2px;" title="Eliminar columna">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-list" id="col-${col.id}">
                            ${tasks.filter(t => t.status === col.id).map(t => this.createCardHTML(t)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    createCardHTML(task) {
        const originIcon = task.origin === 'email' ? '<i class="fa-solid fa-envelope" style="color:#ef4444; margin-right:5px;" title="Origen: Email"></i>' :
            task.origin === 'whatsapp' ? '<i class="fa-brands fa-whatsapp" style="color:#22c55e; margin-right:5px;" title="Origen: WhatsApp"></i>' : '';

        const hasAttachments = task.attachments && task.attachments.length > 0;
        const descriptionSnippet = task.description ? `<div class="card-snippet">${task.description.substring(0, 60)}...</div>` : '';

        return `
            <div class="card priority-${task.priority || 'medium'}" draggable="true" ondragstart="App.handleDragStart(event, '${task.id}')" onclick="App.openModal('create-task', '${task.id}')">
                <div class="card-tags">
                    <span class="tag">${task.client || 'General'}</span>
                    ${task.origin ? `<span class="tag-origin">${originIcon}</span>` : ''}
                    ${hasAttachments ? `<span class="tag-attachment"><i class="fa-solid fa-paperclip"></i></span>` : ''}
                </div>
                <div class="card-title">${task.title}</div>
                ${descriptionSnippet}
                <div class="card-meta">
                    <span><i class="fa-regular fa-clock"></i> ${task.date || 'Hoy'}</span>
                    <div class="avatar" style="width:24px; height:24px; font-size: 0.7rem;">${(task.assignee || 'M').charAt(0).toUpperCase()}</div>
                </div>
            </div>
        `;
    },

    showNotification(title, msg) {
        const toast = document.getElementById('notification-toast');
        const tTitle = document.getElementById('notif-title');
        const tMsg = document.getElementById('notif-msg');

        if (!toast || !tTitle || !tMsg) return;

        tTitle.textContent = title;
        tMsg.textContent = msg;
        toast.classList.remove('hidden');

        // Auto hide after 5 seconds
        if (window.notifTimeout) clearTimeout(window.notifTimeout);
        window.notifTimeout = setTimeout(() => this.hideNotification(), 5000);
    },

    hideNotification() {
        const toast = document.getElementById('notification-toast');
        if (toast) toast.classList.add('hidden');
    }
};
