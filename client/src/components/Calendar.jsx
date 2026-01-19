import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, User, Calendar as CalIcon } from 'lucide-react';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);

    // Calendar Visibility State
    const [visibleUserIds, setVisibleUserIds] = useState([]);

    // Alerts State
    const [alerts, setAlerts] = useState([]);

    // New Event State
    const [newEvent, setNewEvent] = useState({
        title: '',
        userId: 'montse',
        time: '10:00',
        duration: 60,
        description: ''
    });

    useEffect(() => {
        loadData();
        // Check for alerts every minute
        const alertInterval = setInterval(checkAlerts, 60000);
        return () => clearInterval(alertInterval);
    }, [events]); // Re-create interval if events change to capture latest data

    const loadData = async () => {
        const [evts, usrs] = await Promise.all([
            api.getEvents(),
            api.getUsers()
        ]);
        setEvents(evts);
        setUsers(usrs);
        // Default to showing all users
        if (usrs.length > 0) {
            setVisibleUserIds(usrs.map(u => u.id));
        }
    };

    const checkAlerts = () => {
        const now = new Date();
        const upcoming = events.filter(evt => {
            const evtTime = new Date(evt.start);
            const diff = evtTime - now;
            // Alert if event is in the next 15 minutes and hasn't started yet
            return diff > 0 && diff <= 15 * 60 * 1000;
        });

        if (upcoming.length > 0) {
            const newAlerts = upcoming.map(evt => ({
                id: Date.now() + Math.random(),
                message: `Evento "${evt.title}" comienza en ${Math.ceil((new Date(evt.start) - now) / 60000)} min`,
                type: 'warning'
            }));
            setAlerts(prev => [...prev, ...newAlerts]);

            // Auto dismiss after 5s
            setTimeout(() => {
                setAlerts(prev => prev.filter(a => !newAlerts.find(na => na.id === a.id)));
            }, 8000);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        return { days, firstDay };
    };

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const handleDateClick = (day) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(date);
        setShowEventModal(true);
    };

    const createEvent = async () => {
        if (!newEvent.title || !selectedDate) return;

        const start = new Date(selectedDate);
        const [hours, mins] = newEvent.time.split(':');
        start.setHours(parseInt(hours), parseInt(mins));

        const end = new Date(start.getTime() + newEvent.duration * 60000);

        await api.createEvent({
            ...newEvent,
            start: start.toISOString(),
            end: end.toISOString()
        });

        setShowEventModal(false);
        setNewEvent({ title: '', userId: 'montse', time: '10:00', duration: 60, description: '' });
        loadData();
    };

    const deleteEvent = async (id, e) => {
        e.stopPropagation();
        if (!confirm("¿Eliminar evento?")) return;
        await api.deleteEvent(id);
        loadData();
    };

    const toggleUserVisibility = (userId) => {
        setVisibleUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const toggleAllUsers = () => {
        if (visibleUserIds.length === users.length) {
            setVisibleUserIds([]);
        } else {
            setVisibleUserIds(users.map(u => u.id));
        }
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    // Adjust firstDay to start Monday (0 = Mon, 6 = Sun)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const renderCalendarGrid = () => {
        const grid = [];
        // Empty cells
        for (let i = 0; i < startOffset; i++) {
            grid.push(<div key={`empty-${i}`} className="bg-gray-50/50 border-b border-r border-gray-100 min-h-[120px]"></div>);
        }

        // Days
        for (let day = 1; day <= days; day++) {
            const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
            const dayEvents = events.filter(e =>
                e.start.startsWith(dateStr) && visibleUserIds.includes(e.userId)
            ).sort((a, b) => a.time.localeCompare(b.time));

            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            grid.push(
                <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`border-b border-r border-gray-100 min-h-[120px] p-2 hover:bg-orange-50/30 transition-colors cursor-pointer group relative ${isToday ? 'bg-orange-50' : 'bg-white'}`}
                >
                    <span className={`text-sm font-bold block mb-2 ${isToday ? 'text-brand-orange bg-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm' : 'text-gray-700'}`}>
                        {day}
                    </span>

                    <div className="space-y-1">
                        {dayEvents.map(evt => {
                            const user = users.find(u => u.id === evt.userId);
                            const colors = {
                                'montse': 'bg-brand-orange text-white border-brand-orange',
                                'default': 'bg-blue-100 text-blue-700 border-blue-200'
                            };
                            // Generate consistent color based on user ID char code if not montse
                            const getUserColor = (uid) => {
                                if (uid === 'montse') return colors.montse;
                                const colorsList = [
                                    'bg-blue-100 text-blue-700 border-blue-200',
                                    'bg-green-100 text-green-700 border-green-200',
                                    'bg-purple-100 text-purple-700 border-purple-200',
                                    'bg-pink-100 text-pink-700 border-pink-200',
                                    'bg-yellow-100 text-yellow-700 border-yellow-200'
                                ];
                                const index = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                return colorsList[index % colorsList.length];
                            };

                            const styleClass = getUserColor(evt.userId);

                            return (
                                <div key={evt.id} className={`text-[10px] p-1.5 rounded-lg border truncate flex items-center gap-1 shadow-sm hover:scale-105 transition-transform ${styleClass}`}>
                                    <span className="font-bold shrink-0">{evt.time}</span>
                                    <span className="truncate font-medium">{evt.title}</span>
                                    <button onClick={(e) => deleteEvent(evt.id, e)} className="ml-auto hidden group-hover:block opacity-60 hover:opacity-100"><X size={10} /></button>
                                </div>
                            );
                        })}
                    </div>

                    <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-brand-orange bg-white rounded-full p-1 shadow-sm border border-orange-100 hover:bg-brand-orange hover:text-white transition-colors">
                        <Plus size={14} />
                    </button>
                </div>
            );
        }

        return grid;
    };

    return (
        <div className="flex h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">

            {/* ALERTS OVERLAY */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                {alerts.map(alert => (
                    <div key={alert.id} className="bg-white border-l-4 border-brand-orange p-4 rounded-r-lg shadow-xl animate-in slide-in-from-right-10 flex items-start gap-3 max-w-sm">
                        <div className="bg-brand-orange/10 p-2 rounded-full text-brand-orange">
                            <Clock size={16} />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-800">Recordatorio</h4>
                            <p className="text-xs text-gray-600">{alert.message}</p>
                        </div>
                        <button onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                ))}
            </div>

            {/* SIDEBAR: CALENDARS */}
            <div className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col p-6 overflow-y-auto">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <CalIcon size={16} className="text-brand-orange" /> Calendarios
                </h2>

                <div className="mb-6">
                    <button
                        onClick={() => { setSelectedDate(new Date()); setShowEventModal(true); }}
                        className="w-full bg-brand-black text-white px-4 py-3 rounded-xl text-xs font-bold shadow-lg hover:bg-brand-orange transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> <span>Crear Evento</span>
                    </button>
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-gray-500">MIEMBROS</h3>
                        <button onClick={toggleAllUsers} className="text-[10px] text-brand-orange font-bold hover:underline">
                            {visibleUserIds.length === users.length ? 'Ocultar Todos' : 'Ver Todos'}
                        </button>
                    </div>

                    <div className="space-y-3">
                        {users.map(u => {
                            const isVisible = visibleUserIds.includes(u.id);
                            return (
                                <div
                                    key={u.id}
                                    onClick={() => toggleUserVisibility(u.id)}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${isVisible ? 'bg-white shadow-sm border border-gray-100' : 'opacity-60 hover:opacity-100'}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isVisible ? 'bg-brand-orange border-brand-orange' : 'border-gray-300'}`}>
                                        {isVisible && <User size={10} className="text-white" />}
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${u.id === 'montse' ? 'bg-brand-orange' : 'bg-gray-400'}`}>
                                            {u.avatar || u.name.charAt(0)}
                                        </div>
                                        <span className={`text-xs font-medium ${isVisible ? 'text-gray-800' : 'text-gray-500'}`}>{u.name}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* MAIN CALENDAR AREA */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600"><ChevronLeft size={20} /></button>
                        <span className="w-48 text-center font-bold text-gray-800 uppercase text-sm">
                            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600"><ChevronRight size={20} /></button>
                    </div>

                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50">
                        Hoy
                    </button>
                </div>

                {/* Grid Header */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100 text-center py-3 shrink-0">
                    {['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'].map(d => (
                        <div key={d} className="text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>
                    ))}
                </div>

                {/* Calendar Body */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                    <div className="grid grid-cols-7 auto-rows-fr min-h-0 h-full">
                        {renderCalendarGrid()}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-brand-black text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                <Plus size={18} className="text-green-400" /> Nuevo Evento
                            </h3>
                            <button onClick={() => setShowEventModal(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                                <input
                                    type="text"
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-medium"
                                    placeholder="Reunión con cliente..."
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora Inicio</label>
                                    <input
                                        type="time"
                                        value={newEvent.time}
                                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duración (min)</label>
                                    <input
                                        type="number"
                                        value={newEvent.duration}
                                        onChange={e => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asignado a</label>
                                <div className="flex flex-wrap gap-2">
                                    {users.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => setNewEvent({ ...newEvent, userId: u.id })}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-2
                                                ${newEvent.userId === u.id
                                                    ? 'bg-brand-orange text-white border-brand-orange'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${newEvent.userId === u.id ? 'bg-white' : 'bg-gray-300'}`}></div>
                                            {u.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={createEvent}
                                className="w-full bg-brand-black text-white font-bold py-4 rounded-xl hover:bg-brand-orange transition-colors shadow-lg mt-2"
                            >
                                Guardar Evento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
