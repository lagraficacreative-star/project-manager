import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, User, Calendar as CalIcon } from 'lucide-react';


const Calendar = ({ selectedUsers }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);

    // Alerts State
    const [alerts, setAlerts] = useState([]);

    // New Event State
    const [newEvent, setNewEvent] = useState({
        title: '',
        userIds: ['montse'],
        time: '10:00',
        duration: 60,
        description: '',
        meetingLink: ''
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
        setNewEvent({ title: '', userIds: ['montse'], time: '10:00', duration: 60, description: '', meetingLink: '' });
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
            const dayEvents = events.filter(e => {
                const isSameDate = e.start.startsWith(dateStr);
                const userIds = e.userIds || [e.userId || 'montse'];
                const isVisible = selectedUsers.length === 0 || userIds.some(uid => selectedUsers.includes(uid));
                return isSameDate && isVisible;
            }).sort((a, b) => a.time.localeCompare(b.time));

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
                            const eventUserIds = evt.userIds || [evt.userId || 'montse'];
                            const primaryUserId = eventUserIds[0];

                            const getUserColor = (uid) => {
                                if (uid === 'montse') return 'bg-brand-orange text-white border-brand-orange';
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

                            const styleClass = getUserColor(primaryUserId);

                            return (
                                <div
                                    key={evt.id}
                                    className={`text-[10px] p-1.5 rounded-lg border truncate flex flex-col gap-1 shadow-sm hover:scale-105 transition-transform group/evt ${styleClass}`}
                                    title={`${evt.title}\n${evt.description || ''}${evt.meetingLink ? '\nURL: ' + evt.meetingLink : ''}`}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold shrink-0">{evt.time}</span>
                                        <span className="truncate font-medium">{evt.title}</span>
                                        <button onClick={(e) => deleteEvent(evt.id, e)} className="ml-auto hidden group-hover/evt:block opacity-60 hover:opacity-100"><X size={10} /></button>
                                    </div>
                                    <div className="flex -space-x-1.5 overflow-hidden">
                                        {eventUserIds.map(uid => {
                                            const u = users.find(user => user.id === uid);
                                            return (
                                                <div key={uid} className={`w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center text-[7px] font-bold text-white shadow-sm ${uid === 'montse' ? 'bg-brand-orange' : 'bg-gray-400'}`}>
                                                    {u?.avatar || uid.charAt(0)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {evt.meetingLink && (
                                        <a
                                            href={evt.meetingLink.startsWith('http') ? evt.meetingLink : `https://${evt.meetingLink}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[8px] underline opacity-80 hover:opacity-100 flex items-center gap-0.5"
                                        >
                                            <CalIcon size={8} /> Link Reunió
                                        </a>
                                    )}
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

        <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                    <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto overflow-hidden">
                        <div className="flex items-center gap-1 md:gap-2 bg-gray-100 rounded-lg p-1 shrink-0">
                            <button onClick={() => changeMonth(-1)} className="p-1 md:p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600"><ChevronLeft size={16} md={20} /></button>
                            <span className="w-32 md:w-48 text-center font-bold text-gray-800 uppercase text-[10px] md:text-sm truncate">
                                {currentDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                            </span>
                            <button onClick={() => changeMonth(1)} className="p-1 md:p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600"><ChevronRight size={16} md={20} /></button>
                        </div>
                        <button onClick={() => setCurrentDate(new Date())} className="px-2 md:px-4 py-1.5 md:py-2 border border-gray-200 rounded-lg text-[10px] md:text-xs font-bold text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                            Hoy
                        </button>
                    </div>


                    <button
                        onClick={() => { setSelectedDate(new Date()); setShowEventModal(true); }}
                        className="bg-brand-orange text-white px-3 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-bold shadow-lg hover:bg-orange-600 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={16} md={18} /> <span className="hidden xs:inline">Nou Esdeveniment</span><span className="xs:hidden">Nou</span>
                    </button>
                </div>
            </div>

            {/* Calendar Body (AGENDA ONLY for vertical preference) */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30">
                {/* Mobile/Desktop Vertical Agenda View */}
                <div className="p-4 md:p-8 lg:p-12 space-y-8 max-w-4xl mx-auto">
                    {(() => {
                        const today = new Date();
                        const monthEvents = events.filter(e => {
                            const evtDate = new Date(e.start);
                            return evtDate.getMonth() === currentDate.getMonth() && evtDate.getFullYear() === currentDate.getFullYear();
                        }).sort((a, b) => new Date(a.start) - new Date(b.start));

                        if (monthEvents.length === 0) {
                            return <div className="text-center py-20 text-gray-400 italic text-sm">No hi ha esdeveniments per aquest mes.</div>
                        }

                        // Group by day
                        const groups = monthEvents.reduce((acc, evt) => {
                            const d = new Date(evt.start).toLocaleDateString();
                            if (!acc[d]) acc[d] = [];
                            acc[d].push(evt);
                            return acc;
                        }, {});

                        return Object.entries(groups).map(([date, evts]) => (
                            <div key={date} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-px bg-gray-200 flex-1"></div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{date}</span>
                                    <div className="h-px bg-gray-200 flex-1"></div>
                                </div>
                                <div className="space-y-2">
                                    {evts.map(evt => (
                                        <div key={evt.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                                            <div className="flex flex-col items-center justify-center min-w-[50px] border-r border-gray-100 pr-4">
                                                <span className="text-sm font-black text-brand-black">{evt.time}</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">{evt.duration}m</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 mb-1 truncate">{evt.title}</h4>
                                                <p className="text-xs text-gray-500 line-clamp-1">{evt.description}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex -space-x-2">
                                                        {(evt.userIds || [evt.userId]).map(uid => (
                                                            <div key={uid} className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm ${uid === 'montse' ? 'bg-brand-orange' : 'bg-gray-400'}`}>
                                                                {users.find(u => u.id === uid)?.avatar || uid[0]}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {evt.meetingLink && (
                                                        <a href={evt.meetingLink} target="_blank" rel="noreferrer" className="text-[10px] text-brand-orange font-bold hover:underline">Link Reunió</a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ));
                    })()}
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
                            <div className="max-h-[60vh] overflow-y-auto space-y-4 px-1 pb-2">
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
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Enlace Reunión (Opcional)</label>
                                    <input
                                        type="text"
                                        value={newEvent.meetingLink}
                                        onChange={e => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 text-xs font-medium"
                                        placeholder="https://meet.google.com/..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción</label>
                                    <textarea
                                        value={newEvent.description}
                                        onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 text-xs font-medium resize-none h-20"
                                        placeholder="Detalles de la reunión..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Miembros Invitados</label>
                                    <div className="flex flex-wrap gap-2">
                                        {users.map(u => {
                                            const isSelected = newEvent.userIds.includes(u.id);
                                            return (
                                                <button
                                                    key={u.id}
                                                    onClick={() => {
                                                        const userIds = isSelected
                                                            ? newEvent.userIds.filter(id => id !== u.id)
                                                            : [...newEvent.userIds, u.id];
                                                        setNewEvent({ ...newEvent, userIds });
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-2
                                                        ${isSelected
                                                            ? 'bg-brand-orange text-white border-brand-orange'
                                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-300'}`}></div>
                                                    {u.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={createEvent}
                                className="w-full bg-brand-black text-white font-bold py-4 rounded-xl hover:bg-brand-orange transition-colors shadow-lg"
                            >
                                Crear Evento
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default Calendar;
