import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, User, Calendar as CalIcon } from 'lucide-react';


const Calendar = ({ selectedUsers, currentUser }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);

    const [alerts, setAlerts] = useState([]);

    const [newEvent, setNewEvent] = useState({
        title: '',
        userIds: [currentUser?.id || 'montse'],
        time: '10:00',
        duration: 60,
        description: '',
        meetingLink: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const alertInterval = setInterval(checkAlerts, 60000);
        return () => clearInterval(alertInterval);
    }, [events]);

    const loadData = async () => {
        try {
            const [evts, usrs] = await Promise.all([
                api.getEvents(),
                api.getUsers()
            ]);
            setEvents(evts || []);
            setUsers(usrs || []);
        } catch (err) {
            console.error("Failed to load calendar data", err);
        }
    };

    const checkAlerts = () => {
        const now = new Date();
        const upcoming = events.filter(evt => {
            const evtTime = new Date(evt.start);
            const diff = evtTime - now;
            return diff > 0 && diff <= 15 * 60 * 1000;
        });

        if (upcoming.length > 0) {
            const newAlerts = upcoming.map(evt => ({
                id: Date.now() + Math.random(),
                message: `Evento "${evt.title}" comienza en ${Math.ceil((new Date(evt.start) - now) / 60000)} min`,
                type: 'warning'
            }));
            setAlerts(prev => [...prev, ...newAlerts]);
            setTimeout(() => {
                setAlerts(prev => prev.filter(a => !newAlerts.find(na => na.id === a.id)));
            }, 8000);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
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

        try {
            await api.createEvent({
                ...newEvent,
                start: start.toISOString(),
                end: end.toISOString()
            });
            setShowEventModal(false);
            setNewEvent({ title: '', userIds: [currentUser?.id || 'montse'], time: '10:00', duration: 60, description: '', meetingLink: '' });
            loadData();
        } catch (err) {
            alert("Error al crear el evento");
        }
    };

    const deleteEvent = async (id, e) => {
        e.stopPropagation();
        if (!confirm("¿Eliminar evento?")) return;
        try {
            await api.deleteEvent(id);
            loadData();
        } catch (err) {
            alert("Error al eliminar el evento");
        }
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="flex-1 flex flex-col">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                    <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto overflow-hidden">
                        <div className="flex items-center gap-1 md:gap-2 bg-gray-100 rounded-lg p-1 shrink-0">
                            <button onClick={() => changeMonth(-1)} className="p-1 md:p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600"><ChevronLeft size={16} /></button>
                            <span className="w-32 md:w-48 text-center font-bold text-gray-800 uppercase text-[10px] md:text-sm truncate">
                                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => changeMonth(1)} className="p-1 md:p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600"><ChevronRight size={16} /></button>
                        </div>
                        <button onClick={() => setCurrentDate(new Date())} className="px-2 md:px-4 py-1.5 md:py-2 border border-gray-200 rounded-lg text-[10px] md:text-xs font-bold text-gray-600 hover:bg-gray-50 whitespace-nowrap uppercase tracking-widest">
                            Hoy
                        </button>
                    </div>

                    <button
                        onClick={() => { setSelectedDate(new Date()); setShowEventModal(true); }}
                        className="bg-brand-orange text-white px-3 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-bold shadow-lg hover:bg-orange-600 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest"
                    >
                        <Plus size={16} /> <span className="hidden xs:inline">Nuevo Evento</span><span className="xs:hidden">Nuevo</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                    <div className="p-4 md:p-8 lg:p-12 space-y-8 max-w-4xl mx-auto">
                        {(() => {
                            const monthEvents = events.filter(e => {
                                const evtDate = new Date(e.start);
                                return evtDate.getMonth() === currentDate.getMonth() && evtDate.getFullYear() === currentDate.getFullYear();
                            }).sort((a, b) => new Date(a.start) - new Date(b.start));

                            if (monthEvents.length === 0) {
                                return <div className="text-center py-20 text-gray-400 italic text-sm">No hay eventos para este mes.</div>
                            }

                            const groups = monthEvents.reduce((acc, evt) => {
                                const d = new Date(evt.start).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                                if (!acc[d]) acc[d] = [];
                                acc[d].push(evt);
                                return acc;
                            }, {});

                            return Object.entries(groups).map(([date, evts]) => (
                                <div key={date} className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] whitespace-nowrap">{date}</span>
                                        <div className="h-px bg-orange-100 flex-1"></div>
                                    </div>
                                    <div className="space-y-3">
                                        {evts.map(evt => (
                                            <div key={evt.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:justify-center sm:min-w-[70px] sm:border-r sm:border-gray-50 sm:pr-4">
                                                    <span className="text-sm font-black text-brand-black">{new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="text-[9px] font-bold text-gray-300 uppercase">{evt.duration} min</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-bold text-gray-800 truncate">{evt.title}</h4>
                                                        <button onClick={(e) => deleteEvent(evt.id, e)} className="p-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><X size={14} /></button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">{evt.description}</p>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex -space-x-2">
                                                            {(evt.userIds || [evt.userId]).map(uid => (
                                                                <div key={uid} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${uid === 'montse' ? 'bg-brand-orange' : 'bg-gray-400'}`}>
                                                                    {users.find(u => u.id === uid)?.avatar || uid[0]}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {evt.meetingLink && (
                                                            <a href={evt.meetingLink.startsWith('http') ? evt.meetingLink : `https://${evt.meetingLink}`} target="_blank" rel="noreferrer" className="text-[10px] text-brand-orange font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                                                                <CalIcon size={12} /> Link Reunión
                                                            </a>
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
            </div>

            {showEventModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-brand-black text-white">
                            <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                <Plus size={18} className="text-brand-orange" /> Nuevo Evento
                            </h3>
                            <button onClick={() => setShowEventModal(false)} className="text-white/60 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="max-h-[60vh] overflow-y-auto space-y-5 px-1 pb-2 custom-scrollbar">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Título</label>
                                    <input
                                        type="text"
                                        value={newEvent.title}
                                        onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-bold text-sm"
                                        placeholder="Título del evento..."
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Hora Inicio</label>
                                        <input
                                            type="time"
                                            value={newEvent.time}
                                            onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-bold text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Duración (min)</label>
                                        <input
                                            type="number"
                                            value={newEvent.duration}
                                            onChange={e => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Enlace Reunión</label>
                                    <input
                                        type="text"
                                        value={newEvent.meetingLink}
                                        onChange={e => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 text-xs font-bold"
                                        placeholder="https://..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Miembros Invitados</label>
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
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                                                        ${isSelected
                                                            ? 'bg-brand-orange text-white border-brand-orange shadow-lg shadow-orange-500/20'
                                                            : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                                                >
                                                    {u.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={createEvent}
                                className="w-full bg-brand-black text-white font-black py-4 rounded-2xl hover:bg-brand-orange transition-all shadow-xl uppercase tracking-[0.2em] text-xs"
                            >
                                Guardar Evento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {alerts.length > 0 && (
                <div className="fixed bottom-6 right-6 z-[200] space-y-4">
                    {alerts.map(a => (
                        <div key={a.id} className="bg-brand-black text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-l-brand-orange animate-in slide-in-from-right-full">
                            <p className="text-xs font-black uppercase tracking-widest">{a.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Calendar;
