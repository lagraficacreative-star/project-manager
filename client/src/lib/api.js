import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
});

export const getTasks = async () => {
    const response = await api.get('/data');
    return response.data;
};

export const createTask = async (task) => {
    const response = await api.post('/tasks', task);
    return response.data;
};

export const updateTaskStatus = async (id, status) => {
    const response = await api.put(`/tasks/${id}`, { status });
    return response.data;
};

export const syncMailbox = async (memberId) => {
    const response = await api.get(`/mailbox/${memberId}`);
    return response.data;
};
