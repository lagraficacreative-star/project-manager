const API_URL = '/api';

export const api = {
    // Boards
    getBoards: async () => {
        const res = await fetch(`${API_URL}/boards`);
        return res.json();
    },
    createBoard: async (title) => {
        const res = await fetch(`${API_URL}/boards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        return res.json();
    },
    updateBoard: async (id, data) => {
        const res = await fetch(`${API_URL}/boards/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    deleteBoard: async (id) => {
        const res = await fetch(`${API_URL}/boards/${id}`, { method: 'DELETE' });
        return res.json();
    },

    // Cards
    createCard: async (cardData) => {
        const res = await fetch(`${API_URL}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardData)
        });
        return res.json();
    },
    updateCard: async (id, data) => {
        const res = await fetch(`${API_URL}/cards/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    deleteCard: async (id) => {
        const res = await fetch(`${API_URL}/cards/${id}`, { method: 'DELETE' });
        return res.json();
    },

    // Users
    getUsers: async () => {
        const res = await fetch(`${API_URL}/users`);
        return res.json();
    },
    updateUser: async (id, data) => {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    // Time Tracking
    getTimeEntries: async (userId) => {
        let url = `${API_URL}/time_entries`;
        if (userId) url += `?userId=${userId}`;
        const res = await fetch(url);
        return res.json();
    },
    createTimeEntry: async (data) => {
        const res = await fetch(`${API_URL}/time_entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    updateTimeEntry: async (id, data) => {
        const res = await fetch(`${API_URL}/time_entries/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    // Emails
    getEmails: async (userId, folder = 'INBOX') => {
        const res = await fetch(`${API_URL}/emails/${userId}?folder=${encodeURIComponent(folder)}`);
        return res.json();
    },
    archiveEmail: async (userId, uid) => {
        const res = await fetch(`${API_URL}/emails/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, uid })
        });
        return res.json();
    },
    archiveNotice: async (text, date) => {
        const res = await fetch(`${API_URL}/archive-notice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, date })
        });
        return res.json();
    },

    // Full Data (for initial load if needed)
    getData: async () => {
        const res = await fetch(`${API_URL}/data`);
        return res.json();
    },

    // Reset
    resetDB: async () => {
        const res = await fetch(`${API_URL}/reset`, { method: 'POST' });
        return res.json();
    },

    // File Upload
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    }
};
