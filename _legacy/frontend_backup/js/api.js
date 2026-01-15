const API_URL = '/api';

export const API = {
    async getProjects() {
        try {
            const response = await fetch(`${API_URL}/data`);
            if (!response.ok) throw new Error('Backend offline');
            return await response.json();
        } catch (e) {
            console.warn("Backend offline. Loading static data.");
            const response = await fetch('/data/db.json');
            return await response.json();
        }
    },

    async createTask(task) {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        if (!response.ok) throw new Error('Failed to create task');
        return await response.json();
    },

    async updateTaskStatus(id, status) {
        return this.updateTask(id, { status });
    },

    async updateTask(id, updates) {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update task');
        return await response.json();
    },

    async deleteTask(id) {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete task');
        return true;
    },

    // Clients
    async getClients() {
        const response = await fetch(`${API_URL}/clients`);
        if (!response.ok) throw new Error('Failed to fetch clients');
        return await response.json();
    },

    async createClient(client) {
        const response = await fetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client)
        });
        if (!response.ok) throw new Error('Failed to create client');
        return await response.json();
    },

    async deleteClient(id) {
        const response = await fetch(`${API_URL}/clients/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete client');
        return true;
    },

    // Columns
    async createColumn(column) {
        const response = await fetch(`${API_URL}/columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(column)
        });
        if (!response.ok) throw new Error('Failed to create column');
        return await response.json();
    },

    async deleteColumn(id) {
        const response = await fetch(`${API_URL}/columns/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete column');
        return true;
    },

    async updateColumn(id, updates) {
        const response = await fetch(`${API_URL}/columns/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update column');
        return await response.json();
    },

    // Notes
    async getNotes(memberId) {
        const response = await fetch(`${API_URL}/notes/${memberId}`);
        // If 404 or empty, return empty array
        if (!response.ok) return [];
        return await response.json();
    },

    async saveNotes(memberId, notes) {
        const response = await fetch(`${API_URL}/notes/${memberId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notes)
        });
        if (!response.ok) throw new Error('Failed to save notes');
        return true;
    },

    // Emails - Fetch from Logic (Real Server) with Static Fallback
    async getEmails(memberId, folder = 'INBOX') {
        try {
            const response = await fetch(`${API_URL}/mailbox/${memberId}?folder=${encodeURIComponent(folder)}`);
            if (!response.ok) throw new Error('Backend offline');
            const data = await response.json();
            return data.emails || [];
        } catch (e) {
            console.warn("Backend unavailable. Using static DB fallback for emails.");
            // Fallback to static file for demo
            const dbResponse = await fetch('/data/db.json');
            const db = await dbResponse.json();

            const member = db.members.find(m => m.id === memberId);
            if (!member) return [];

            // Simple filter for mock data
            // In static mode, we don't really have "folders" persisted, so we just show all non-archived or all archived based on param
            const allEmails = db.emails || [];

            // Filter by recipient
            let userEmails = allEmails.filter(email => email.to === member.email);

            // Filter "Archived" vs "Inbox" based on converted/processed lists in DB
            const processedIds = db.processed_emails || [];
            if (folder.includes('Archivo')) {
                // Return only processed
                return userEmails.filter(email => processedIds.includes(email.id) || typeof email.id === 'string' && processedIds.includes(email.id.toString()));
            } else {
                // Return only active (not processed)
                return userEmails.filter(email => !processedIds.includes(email.id) && !(typeof email.id === 'string' && processedIds.includes(email.id.toString())));
            }
        }
    },

    async convertEmail(payload) {
        try {
            const response = await fetch(`${API_URL}/convert-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Backend offline');
            return await response.json();
        } catch (e) {
            console.warn("Backend offline. Simulating conversion.");
            return { success: true, mock: true };
        }
    },

    async archiveEmail(emailId, memberId) {
        try {
            const response = await fetch(`${API_URL}/archive-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId, memberId })
            });
            if (!response.ok) throw new Error('Backend offline');
            return await response.json();
        } catch (e) {
            console.warn("Backend offline. Simulating archive.");
            return { success: true, mock: true };
        }
    },

    // Local Simulation (Deprecated but kept for manual trigger fallback if needed)
    async simulateEmail(email) {
        // This won't work perfectly with backend sync unless we post it as a webhook or task
        // For now, let's treat it as a direct task creation or ignore if strictly backend.
        // But since we want "Real" emails, this mock function is less relevant. 
        // We could POST to /api/webhook/gmail ideally.
        console.warn("Using simulation in Backend mode.");
        return email;
    }
};
