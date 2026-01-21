import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ChevronLeft, Clock, Play, Square, Users, Calendar, Download } from 'lucide-react';
import MemberFilter from './MemberFilter';

const HRManagement = () => {
    const [users, setUsers] = useState([]);
    const [timeEntries, setTimeEntries] = useState([]);
    const [currentUser] = useState({ id: 999, name: 'Montse' }); // Mock current user
    const [activeEntry, setActiveEntry] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [selectedUsers, setSelectedUsers] = useState([]); // Filter State

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let interval;
        if (activeEntry) {
            interval = setInterval(() => {
                const start = new Date(activeEntry.start).getTime();
                setElapsedTime(Date.now() - start);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [activeEntry]);

    const loadData = async () => {
        try {
            const [usersData, timeData] = await Promise.all([
                api.getUsers(),
                api.getTimeEntries()
            ]);

            setUsers(usersData || []);
            setTimeEntries(timeData || []);

            // Check if current user is active
            // This logic assumes the backend returns all entries. 
            // We search for an entry for 'Montse' that has no 'end' time.
            const currentActive = timeData.find(e => e.user === currentUser.name && !e.end);
            if (currentActive) {
                setActiveEntry(currentActive);
                const start = new Date(currentActive.start).getTime();
                setElapsedTime(Date.now() - start);
            }
        } catch (error) {
            console.error("Failed to load HR data:", error);
        }
    };

    const handleClockIn = async () => {
        const newEntry = {
            id: Date.now(),
            user: currentUser.name,
            start: new Date().toISOString(),
            end: null
        };

        // Optimistic update
        setActiveEntry(newEntry);

        try {
            await api.createTimeEntry(newEntry);
            loadData(); // Reload to ensure sync
        } catch (error) {
            console.error("Clock in failed:", error);
            setActiveEntry(null);
        }
    };

    const handleClockOut = async () => {
        if (!activeEntry) return;

        const now = new Date();
        const updatedEntry = {
            ...activeEntry,
            end: now.toISOString(),
            duration: now.getTime() - new Date(activeEntry.start).getTime()
        };

        // Optimistic update
        setActiveEntry(null);
        setElapsedTime(0);

        try {
            await api.updateTimeEntry(activeEntry.id, updatedEntry);
            loadData();
        } catch (error) {
            console.error("Clock out failed:", error);
        }
    };

    const formatTime = (ms) => {
        if (!ms) return "00:00:00";
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatDuration = (ms) => {
        if (!ms) return "-";
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        return `${hours}h ${minutes}m`;
    };

    // Calculate daily totals for users
    const getDailyTotal = (userName) => {
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = timeEntries.filter(e =>
            e.user === userName &&
            e.start.startsWith(today) &&
            e.end // Only count finished entries or handle active ones separately? Usually finished.
        );

        // Add active entry if it's for this user and today
        let total = todayEntries.reduce((acc, curr) => acc + (curr.duration || 0), 0);

        if (activeEntry && activeEntry.user === userName && activeEntry.start.startsWith(today)) {
            total += elapsedTime;
        }

        return formatDuration(total);
    };

    return (
        <div className="min-h-screen bg-brand-lightgray p-6">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                            <ChevronLeft size={16} /> Tornar
                        </Link>
                        <h1 className="text-2xl font-bold text-brand-black uppercase">Gestió de RRHH i Control Horari</h1>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-100">
                        <Calendar size={16} />
                        <span className="font-bold">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>

                {/* Filter Row */}
                <MemberFilter
                    users={users}
                    selectedUsers={selectedUsers}
                    onToggleUser={(id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id])}
                    onClear={() => setSelectedUsers([])}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: STATUS & ACTIONS */}
                    <div className="space-y-6">
                        {/* MY CARD */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-brand-orange"></div>
                            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Clock className="text-brand-orange" /> El meu Estat
                            </h2>

                            <div className="flex flex-col items-center justify-center py-4 space-y-4">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg transition-all ${activeEntry ? 'bg-green-500 ring-4 ring-green-100' : 'bg-gray-300'}`}>
                                    {currentUser.name.charAt(0)}
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-brand-black">{currentUser.name}</h3>
                                    <p className="text-gray-500 text-sm mb-2">{activeEntry ? 'Treballant actualment' : 'Desconnectat'}</p>
                                    <div className={`font-mono text-3xl font-bold ${activeEntry ? 'text-green-600' : 'text-gray-300'}`}>
                                        {formatTime(elapsedTime)}
                                    </div>
                                </div>

                                <button
                                    onClick={activeEntry ? handleClockOut : handleClockIn}
                                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                                        ${activeEntry
                                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/30'
                                            : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/30'}`}
                                >
                                    {activeEntry ? (
                                        <>
                                            <Square size={20} fill="currentColor" /> ATURAR JORNADA
                                        </>
                                    ) : (
                                        <>
                                            <Play size={20} fill="currentColor" /> INICIAR JORNADA
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* TEAM STATUS */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Users className="text-brand-orange" /> Estat de l'Equip
                            </h2>
                            <div className="space-y-4">
                                {users
                                    .filter(u => !['montse', 'web', 'albap'].includes(u.id))
                                    .map(user => {
                                        // Specific mapping for vacation types or just show the common 20 days
                                        const totalVacation = 20; // 20 working days
                                        const usedVacation = user.vacationDaysUsed || 0;
                                        const progress = (usedVacation / totalVacation) * 100;

                                        return (
                                            <div key={user.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold shadow-sm">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{user.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono">{getDailyTotal(user.name)} avui</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-bold text-brand-orange uppercase">Vacances</span>
                                                        <p className="text-xs font-bold text-gray-700">{usedVacation} / {totalVacation} <span className="text-[10px] text-gray-400 font-normal">dies</span></p>
                                                    </div>
                                                </div>

                                                {/* Vacation Progress Bar */}
                                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brand-orange transition-all duration-500"
                                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: HISTORY */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Calendar className="text-brand-orange" /> Registre d'Activitat
                                </h2>
                                <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-brand-orange bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                                    <Download size={14} /> Exportar CSV
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto rounded-xl border border-gray-100">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs sticky top-0">
                                        <tr>
                                            <th className="p-4">Usuari</th>
                                            <th className="p-4">Data</th>
                                            <th className="p-4">Inici</th>
                                            <th className="p-4">Fi</th>
                                            <th className="p-4 text-right">Durada</th>
                                            <th className="p-4 text-center">Estat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {timeEntries.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-gray-400 italic">No hi ha registres d'activitat recents.</td>
                                            </tr>
                                        )}
                                        {[...timeEntries]
                                            .filter(e => selectedUsers.length === 0 || selectedUsers.includes(users.find(u => u.name === e.user)?.id))
                                            .reverse()
                                            .map(entry => (
                                                <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-4 font-bold text-gray-800">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px]">
                                                                {entry.user?.[0]}
                                                            </div>
                                                            {entry.user}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-gray-600">{new Date(entry.start).toLocaleDateString()}</td>
                                                    <td className="p-4 font-mono text-gray-600">{new Date(entry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="p-4 font-mono text-gray-600">
                                                        {entry.end ? new Date(entry.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </td>
                                                    <td className="p-4 text-right font-mono font-bold text-brand-black">
                                                        {entry.duration ? formatDuration(entry.duration) : formatTime(Date.now() - new Date(entry.start).getTime())}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${entry.end ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'}`}>
                                                            {entry.end ? 'COMPLET' : 'ACTIU'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HRManagement;
