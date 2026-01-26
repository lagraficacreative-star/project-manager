import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, User, Calendar as CalIcon, Briefcase, AlertTriangle } from 'lucide-react';


const Calendar = ({ selectedUsers, currentUser }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [view, setView] = useState('month'); // 'month', 'week', 'day'

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
            const [evts, usrs, db] = await Promise.all([
                api.getEvents(),
                api.getUsers(),
                api.getData()
            ]);
            setEvents(evts || []);
            setUsers(usrs || []);
            setProjects(db.cards || []);
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

    // Combine events and projects into a single list of calendar entries
    const getCalendarEntries = () => {
        const entries = [
            ...events.map(e => ({ ...e, calendarType: 'event' })),
            ...projects.filter(p => p.dueDate).map(p => ({
                id: p.id,
                title: p.title,
                start: p.dueDate + "T00:00:00Z", // Deadlines as all-day or start of day
                description: p.descriptionBlocks?.[0]?.text || '',
                userIds: [p.responsibleId].filter(Boolean),
                calendarType: 'project',
                priority: p.priority
            }))
        ];
        return entries;
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="flex-1 flex flex-col">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                    <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto overflow-hidden">
                        <div className="flex items-center gap-1 md:gap-2 bg-gray-100 rounded-lg p-1 shrink-0">
                            <button onClick={() => changeMonth(-1)} className="p-1 md:p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600"><ChevronLeft size={16} /></button>
                            <span className="w-32 md:w-48 text-center font-bold text-gray-800 uppercase text-[10px] md:text-sm truncate">
                                {view === 'month'
                                    ? currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                                    : view === 'week'
                                        ? `Semana ${Math.ceil(currentDate.getDate() / 7)} - ${currentDate.toLocaleDateString('es-ES', { month: 'short' })}`
                                        : currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
                                }
                            </span>
                            <button onClick={() => changeMonth(1)} className="p-1 md:p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600"><ChevronRight size={16} /></button>
                        </div>
                        <button onClick={() => setCurrentDate(new Date())} className="px-2 md:px-4 py-1.5 md:py-2 border border-gray-200 rounded-lg text-[10px] md:text-xs font-bold text-gray-600 hover:bg-gray-50 whitespace-nowrap uppercase tracking-widest">
                            Hoy
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                        {['month', 'week', 'day'].map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => { setSelectedDate(new Date()); setShowEventModal(true); }}
                        className="bg-brand-orange text-white px-3 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-bold shadow-lg hover:bg-orange-600 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest"
                    >
                        <Plus size={16} /> <span className="hidden xs:inline">Nuevo Evento</span><span className="xs:hidden">Nuevo</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50/10">
                    {view === 'month' && (
                        <div className="p-4 h-full flex flex-col">
                            <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
                                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                                    <div key={d} className="bg-white p-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
                                ))}
                                {Array.from({ length: startOffset }).map((_, i) => (
                                    <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[100px]"></div>
                                ))}
                                {Array.from({ length: days }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
                                    const dayEntries = getCalendarEntries().filter(e => e.start.startsWith(dateStr));
                                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                    return (
                                        <div
                                            key={day}
                                            onClick={() => handleDateClick(day)}
                                            className={`bg-white min-h-[120px] p-2 border-t border-l border-gray-50 hover:bg-orange-50/30 transition-colors cursor-pointer group flex flex-col gap-1`}
                                        >
                                            <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-orange text-white' : 'text-gray-400'}`}>
                                                {day}
                                            </span>
                                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar">
                                                {dayEntries.map(entry => (
                                                    <div
                                                        key={entry.id + entry.calendarType}
                                                        className={`text-[8px] p-1.5 rounded-lg border truncate font-bold uppercase tracking-tight
                                                            ${entry.calendarType === 'project' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-orange-50 border-orange-100 text-brand-orange'}`}
                                                    >
                                                        {entry.calendarType !== 'project' && `${new Date(entry.start).getHours().toString().padStart(2, '0')}:${new Date(entry.start).getMinutes().toString().padStart(2, '0')} `}
                                                        {entry.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {(view === 'week' || view === 'day') && (
                        <div className="p-4 h-full">
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                                <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10">
                                    <div className="w-16 md:w-24 shrink-0 border-r border-gray-50"></div>
                                    <div className={`flex-1 grid ${view === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
                                        {(() => {
                                            const today = new Date();
                                            const startOfWeek = new Date(currentDate);
                                            const day = startOfWeek.getDay();
                                            const diff = startOfWeek.getDate() - (day === 0 ? 6 : day - 1);
                                            startOfWeek.setDate(diff);

                                            const daysToShow = view === 'week' ? 7 : 1;
                                            const baseDate = view === 'week' ? startOfWeek : currentDate;

                                            return Array.from({ length: daysToShow }).map((_, i) => {
                                                const d = new Date(baseDate);
                                                d.setDate(baseDate.getDate() + i);
                                                const isToday = d.toDateString() === today.toDateString();
                                                return (
                                                    <div key={i} className={`p-4 text-center border-l border-gray-50 first:border-l-0 ${isToday ? 'bg-orange-50/30' : ''}`}>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                                                        <div className={`inline-flex items-center justify-center w-8 h-8 mt-1 rounded-full text-sm font-black ${isToday ? 'bg-brand-orange text-white' : 'text-brand-black'}`}>
                                                            {d.getDate()}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar relative min-h-[600px]">
                                    {/* Hour Grid */}
                                    <div className="absolute inset-0 flex">
                                        <div className="w-16 md:w-24 shrink-0 border-r border-gray-50 bg-white">
                                            {Array.from({ length: 24 }).map((_, h) => (
                                                <div key={h} className="h-20 border-b border-gray-50 px-2 text-[9px] font-black text-gray-300 text-right pt-2">
                                                    {h.toString().padStart(2, '0')}:00
                                                </div>
                                            ))}
                                        </div>
                                        <div className={`flex-1 grid ${view === 'week' ? 'grid-cols-7' : 'grid-cols-1'} divide-x divide-gray-50`}>
                                            {Array.from({ length: view === 'week' ? 7 : 1 }).map((_, i) => (
                                                <div key={i} className="relative h-[1920px]">
                                                    {Array.from({ length: 24 }).map((_, h) => (
                                                        <div key={h} className="h-20 border-b border-gray-50/50"></div>
                                                    ))}

                                                    {(() => {
                                                        const colDate = new Date(currentDate);
                                                        if (view === 'week') {
                                                            const day = colDate.getDay();
                                                            const diff = colDate.getDate() - (day === 0 ? 6 : day - 1);
                                                            colDate.setDate(diff + i);
                                                        }
                                                        const dateStr = colDate.toISOString().split('T')[0];
                                                        const dayEntries = getCalendarEntries().filter(e => e.start.startsWith(dateStr));

                                                        return dayEntries.map(entry => {
                                                            const start = new Date(entry.start);
                                                            const mins = start.getHours() * 60 + start.getMinutes();
                                                            const duration = entry.duration || 60;
                                                            const isProject = entry.calendarType === 'project';

                                                            return (
                                                                <div
                                                                    key={entry.id + entry.calendarType}
                                                                    className={`absolute left-1 right-1 rounded-xl p-2 border shadow-sm flex flex-col gap-1 overflow-hidden z-20 hover:scale-[1.02] transition-transform cursor-pointer
                                                                        ${isProject ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-orange-50 border-orange-100 text-brand-orange'}`}
                                                                    style={{
                                                                        top: `${(mins / 60) * 80}px`,
                                                                        height: `${Math.max((duration / 60) * 80, 40)}px`
                                                                    }}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[9px] font-black uppercase text-gray-400">{isProject ? 'Entrega' : start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        {!isProject && <button onClick={(e) => deleteEvent(entry.id, e)} className="p-0.5 hover:bg-orange-200/50 rounded"><X size={10} /></button>}
                                                                    </div>
                                                                    <h5 className="text-[10px] font-bold leading-tight line-clamp-2">{entry.title}</h5>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
