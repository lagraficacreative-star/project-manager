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
    archiveEmail: async (memberId, emailId) => {
        const res = await fetch(`${API_URL}/emails/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId, emailId })
        });
        return res.json();
    },
    moveEmail: async (userId, uid, source, target) => {
        const res = await fetch(`${API_URL}/emails/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, uid, source, target })
        });
        return res.json();
    },
    sendEmail: async (memberId, to, subject, body, replyToId, attachments = []) => {
        const res = await fetch(`${API_URL}/emails/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId, to, subject, body, replyToId, attachments })
        });
        return res.json();
    },
    getRepliedEmails: async () => {
        const res = await fetch(`${API_URL}/emails/replied`);
        return res.json();
    },
    logEmailToSheet: async (data) => {
        const res = await fetch(`${API_URL}/emails/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
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
    getProcessedEmails: async () => {
        const res = await fetch(`${API_URL}/emails/processed`);
        return res.json();
    },
    markEmailAsProcessed: async (uid, subject, user, persistentId) => {
        const res = await fetch(`${API_URL}/emails/mark-processed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, subject, user, persistentId })
        });
        return res.json();
    },
    markEmailProcessed: async (uid, subject, user, persistentId) => {
        return api.markEmailAsProcessed(uid, subject, user, persistentId);
    },
    unmarkEmailProcessed: async (memberId, uid, persistentId) => {
        const res = await fetch(`${API_URL}/emails/unmark-processed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId, uid, persistentId })
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
    },

    deleteEmailLocal: async (uid) => {
        const res = await fetch(`${API_URL}/emails/delete-local`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid })
        });
        return res.json();
    },
    emptyTrash: async (userId, folder) => {
        const res = await fetch(`${API_URL}/emails/empty-trash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, folder })
        });
        return res.json();
    },
    getDeletedEmails: async () => {
        const res = await fetch(`${API_URL}/emails/deleted`);
        return res.json();
    },
    getSpamEmails: async () => {
        const res = await fetch(`${API_URL}/emails/spam`);
        return res.json();
    },
    saveData: async (data) => {
        const res = await fetch(`${API_URL}/save-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    addCommentToCard: async (cardId, text, author) => {
        const res = await fetch(`${API_URL}/cards/${cardId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, author })
        });
        return res.json();
    },
    saveAttachmentsToDrive: async (memberId, attachments) => {
        const res = await fetch(`${API_URL}/emails/save-attachments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId, attachments })
        });
        return res.json();
    },

    // --- NEW FEATURES ---

    // Chat
    getMessages: async () => {
        const res = await fetch(`${API_URL}/messages`);
        return res.json();
    },
    sendMessage: async (text, author) => {
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, author })
        });
        return res.json();
    },

    // Documents
    getDocuments: async () => {
        const res = await fetch(`${API_URL}/documents`);
        return res.json();
    },
    createDocument: async (docData) => { // { name, type, parentId, content, url }
        const res = await fetch(`${API_URL}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docData)
        });
        return res.json();
    },
    updateDocument: async (id, data) => {
        const res = await fetch(`${API_URL}/documents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    deleteDocument: async (id) => {
        const res = await fetch(`${API_URL}/documents/${id}`, { method: 'DELETE' });
        return res.json();
    },

    // Events
    getEvents: async () => {
        const res = await fetch(`${API_URL}/events`);
        return res.json();
    },
    createEvent: async (eventData) => {
        const res = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        return res.json();
    },
    deleteEvent: async (id) => {
        const res = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
        return res.json();
    },
    getActivity: async () => {
        const res = await fetch(`${API_URL}/activity`);
        return res.json();
    },
    importTrello: async (boardId, trelloData) => {
        const res = await fetch(`${API_URL}/import/trello`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boardId, trelloData })
        });
        return res.json();
    },
    getContacts: async () => {
        const res = await fetch(`${API_URL}/contacts`);
        return res.json();
    },
    createContact: async (contactData) => {
        const res = await fetch(`${API_URL}/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData)
        });
        return res.json();
    },
    importContacts: async (contacts) => {
        const res = await fetch(`${API_URL}/contacts/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contacts })
        });
        return res.json();
    },
    deleteContact: async (id) => {
        const res = await fetch(`${API_URL}/contacts/${id}`, { method: 'DELETE' });
        return res.json();
    },
    updateContact: async (id, data) => {
        const res = await fetch(`${API_URL}/contacts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    // Tenders
    getTenders: async () => {
        const res = await fetch(`${API_URL}/tenders`);
        return res.json();
    },
    createTender: async (data) => {
        const res = await fetch(`${API_URL}/tenders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    updateTender: async (id, data) => {
        const res = await fetch(`${API_URL}/tenders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    deleteTender: async (id) => {
        const res = await fetch(`${API_URL}/tenders/${id}`, { method: 'DELETE' });
        return res.json();
    },
    // Alerts
    getAlerts: async () => {
        const res = await fetch(`${API_URL}/alerts`);
        return res.json();
    },
    createAlert: async (data) => {
        const res = await fetch(`${API_URL}/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    deleteAlert: async (id) => {
        const res = await fetch(`${API_URL}/alerts/${id}`, { method: 'DELETE' });
        return res.json();
    },
    syncGoogle: async () => {
        const res = await fetch(`${API_URL}/sync-google`);
        return res.json();
    },
    exportToSheets: async () => {
        const res = await fetch(`${API_URL}/export-sheets`, { method: 'POST' });
        return res.json();
    }
};
