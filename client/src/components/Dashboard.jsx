import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Trash2, Edit2, Plus, Layout, Palette, Code, Smartphone, Clipboard, DollarSign, Receipt, Mail, Send, Calendar, Clock, Bell, Search, Mic, ChevronRight, Square, Play, Bot, Briefcase, FileText, Gavel, Archive, Check, Lock, Calculator, Upload, Table, User, Tag } from 'lucide-react';


const Dashboard = ({ selectedUsers, selectedClient, currentUser, isManagementUnlocked, unlockManagement }) => {
    const navigate = useNavigate();
    const CURRENT_USER_ID = currentUser.id;

    const [boards, setBoards] = useState([]);
    const [allCards, setAllCards] = useState([]);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ active: 0, completed: 0, totalProjects: 0 });

    // Get unique clients & labels for filter
    const filterOptions = useMemo(() => {
        const options = new Set();
        allCards.forEach(c => {
            const clientName = c.economic?.client || c.client;
            if (clientName) options.add(clientName);
            if (c.labels && Array.isArray(c.labels)) {
                c.labels.forEach(l => options.add(l));
            }
        });
        return Array.from(options).sort();
    }, [allCards]);

    const [activeEntry, setActiveEntry] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    const [emails, setEmails] = useState([]);
    const [urgentNotes, setUrgentNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [chatMessage, setChatMessage] = useState('');

    const [managementPassword, setManagementPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ cards: [], docs: [] });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [localSelectedClient, setLocalSelectedClient] = useState(selectedClient || '');

    const [activity, setActivity] = useState([]);
    const [importingBoardId, setImportingBoardId] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => {
        loadData();
        loadActivity();
        const activityInterval = setInterval(loadActivity, 10000);
        return () => clearInterval(activityInterval);
    }, []);

    const loadActivity = async () => {
        try {
            const data = await api.getActivity();
            setActivity(data);
        } catch (err) { }
    };

    useEffect(() => {
        let interval;
        if (activeEntry) {
            const start = new Date(activeEntry.start).getTime();
            setElapsedTime(Date.now() - start);

            interval = setInterval(() => {
                setElapsedTime(Date.now() - start);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [activeEntry]);

    const loadData = async () => {
        try {
            const db = await api.getData();
            setBoards(db.boards || []);
            setAllCards((db.cards || []).sort((a, b) => (a.order || 0) - (b.order || 0)));
        } catch (error) {
            console.error("Error loading boards/cards", error);
        }

        try {
            const userData = await api.getUsers();
            setUsers(userData || []);
        } catch (error) {
            console.error("Error loading users", error);
        }

        try {
            const entries = await api.getTimeEntries(CURRENT_USER_ID);
            const ongoing = entries.find(e => !e.end);
            if (ongoing) {
                setActiveEntry(ongoing);
            }
        } catch (error) {
            console.error("Error loading time entries", error);
        }

        const emailData = await api.getEmails(CURRENT_USER_ID, 'INBOX');
        setEmails(Array.isArray(emailData) ? emailData.slice(0, 3) : []);
    };

    const handleClockIn = async () => {
        try {
            const entry = await api.createTimeEntry({
                userId: CURRENT_USER_ID,
                start: new Date().toISOString(),
                type: 'work'
            });
            setActiveEntry(entry);
        } catch (error) {
            console.error("Clock in failed", error);
        }
    };

    const handleClockOut = async () => {
        if (!activeEntry) return;
        try {
            await api.updateTimeEntry(activeEntry.id, {
                end: new Date().toISOString()
            });
            setActiveEntry(null);
        } catch (error) {
            console.error("Clock out failed", error);
        }
    };

    const formatTime = (ms) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const DepartmentCard = ({ title, icon: Icon, count, onClick }) => (
        <div onClick={onClick} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-brand-orange/30 transition-all cursor-pointer h-40">
            <div className={`p-3 rounded-full mb-3 ${onClick ? 'bg-orange-50 text-brand-orange' : 'bg-gray-50 text-gray-400'}`}>
                <Icon size={24} />
            </div>
            <h3 className="font-bold text-sm uppercase text-gray-800 mb-1">{title}</h3>
            <p className="text-xs text-gray-400">{count} Proyectos</p>
        </div>
    );

    const handleAddTimeLog = () => {
        navigate('/rrhh');
    };

    const addUrgentNote = () => {
        if (newNote.trim()) {
            setUrgentNotes([...urgentNotes, {
                id: Date.now(),
                text: newNote,
                done: false,
                date: new Date().toISOString().split('T')[0]
            }]);
            setNewNote('');
        }
    };

    const toggleUrgentNoteDone = (id) => {
        setUrgentNotes(urgentNotes.map(n => n.id === id ? { ...n, done: !n.done } : n));
    };

    const handleArchiveNote = async (note) => {
        setUrgentNotes(urgentNotes.filter(n => n.id !== note.id));
        try {
            await api.archiveNotice(note.text, note.date || new Date().toISOString().split('T')[0]);
        } catch (err) {
            console.error("Failed to archive", err);
        }
    };

    const handleUnlockManagement = (e) => {
        e.preventDefault();
        if (managementPassword === 'lagrafica2025') {
            unlockManagement(true);
            setManagementPassword('');
            setShowPasswordInput(false);
        } else {
            alert('Contraseña incorrecta');
        }
    };

    const handleTrelloImport = async (e) => {
        const file = e.target.files[0];
        if (!file || !importingBoardId) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const trelloData = JSON.parse(event.target.result);
                const result = await api.importTrello(importingBoardId, trelloData);
                if (result.success) {
                    alert(`Importación completada: ${result.count} tarjetas añadidas.`);
                    setIsImportModalOpen(false);
                    loadData();
                } else {
                    alert('Error en la importación: ' + (result.error || 'Desconocido'));
                }
            } catch (err) {
                alert('Error al leer el fichero JSON');
            }
        };
        reader.readAsText(file);
    };

    const [isExporting, setIsExporting] = useState(false);

    const handleSyncSheets = async () => {
        setIsExporting(true);
        try {
            const res = await api.exportToSheets();
            if (res.success) {
                alert("Sincronización con Google Sheets iniciada correctamente.");
            } else {
                alert("Error al sincronizar: " + (res.error || "Desconocido"));
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al sincronizar.");
        } finally {
            setIsExporting(false);
        }
    };

    // FILTER LOGIC
    const filteredCards = useMemo(() => {
        let result = allCards;
        if (selectedUsers.length > 0) {
            result = result.filter(c => selectedUsers.includes(c.responsibleId));
        }
        const clientFilter = localSelectedClient || selectedClient;
        if (clientFilter) {
            result = result.filter(c =>
                (c.economic?.client === clientFilter) ||
                (c.client === clientFilter) ||
                (c.labels && c.labels.includes(clientFilter))
            );
        }
        return result;
    }, [allCards, selectedUsers, selectedClient, localSelectedClient]);

    const getCount = (bid) => filteredCards.filter(c => c.boardId === bid).length;

    const [bannerQuery, setBannerQuery] = useState('');

    const handleBannerSearch = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            if (bannerQuery.trim()) {
                navigate(`/agenda?q=${encodeURIComponent(bannerQuery)}`);
            } else {
                navigate('/agenda');
            }
        }
    };

    return (
        <div className="flex flex-col gap-10 pb-10">

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-brand-black tracking-tighter uppercase leading-none">LaGràfica <span className="text-brand-orange">Project</span></h2>
                    <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Workspace & Intelligence</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative mr-2">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <select
                            value={localSelectedClient}
                            onChange={(e) => setLocalSelectedClient(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-2 focus:ring-brand-orange/20 shadow-sm appearance-none cursor-pointer w-64"
                        >
                            <option value="">FILTRAR POR CLIENTE/ETIQUETA</option>
                            {filterOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleSyncSheets}
                        disabled={isExporting}
                        className={`bg-white text-green-600 border border-green-100 px-5 py-2.5 rounded-2xl text-[10px] font-black tracking-widest hover:bg-green-50 transition-all shadow-sm flex items-center gap-2 group ${isExporting ? 'opacity-50' : ''}`}
                    >
                        <Table size={14} className={isExporting ? 'animate-spin' : ''} /> {isExporting ? 'SINCRONIZANDO...' : 'SINCRONIZAR SHEETS'}
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-white text-brand-black border border-gray-100 px-5 py-2.5 rounded-2xl text-[10px] font-black tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 group"
                    >
                        <Upload size={14} className="group-hover:text-brand-orange transition-colors" /> IMPORTAR TRELLO
                    </button>
                    <button
                        onClick={() => navigate('/docs')}
                        className="bg-brand-black text-white px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-widest hover:bg-brand-orange transition-all shadow-lg shadow-black/10"
                    >
                        GESTIÓN
                    </button>
                </div>
            </div>

            {/* HERO: ASSISTENT LAGRÀFICA */}
            <div className="bg-gradient-to-br from-brand-black to-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-brand-orange rounded-xl shadow-lg shadow-orange-500/30">
                                <Bot size={18} className="text-white" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200/80">Inteligencia Artificial</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black leading-tight tracking-tighter">
                            Hola {currentUser.name.split(' ')[0]}, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-orange-400">¿en qué puedo ayudarte?</span>
                        </h1>
                        <div className="relative max-w-xl group">
                            <input
                                type="text"
                                value={bannerQuery}
                                onChange={(e) => setBannerQuery(e.target.value)}
                                placeholder="Escribe tu consulta o petición..."
                                className="w-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl py-4 pl-6 pr-16 text-sm md:text-base outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all placeholder:text-white/20 shadow-2xl"
                                onKeyDown={handleBannerSearch}
                            />
                            <button
                                onClick={handleBannerSearch}
                                className="absolute right-2 top-2 bottom-2 bg-brand-orange text-white px-5 rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 font-black text-[10px] tracking-widest uppercase shadow-lg shadow-orange-500/20"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="hidden lg:flex w-40 h-40 items-center justify-center relative">
                        <div className="absolute inset-0 bg-brand-orange/20 rounded-full blur-[60px] animate-pulse"></div>
                        <Bot size={80} className="text-brand-orange opacity-10 absolute" />
                        <div className="relative w-full h-full border-2 border-dashed border-white/5 rounded-full animate-[spin_30s_linear_infinite] flex items-center justify-center">
                            <div className="w-2 h-2 bg-brand-orange rounded-full absolute -top-1"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Boards Grid */}
            <div className="flex flex-col gap-10">
                {/* ROW 1: SERVICES */}
                <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ml-1">Servicios</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DepartmentCard title="LG - Diseño" icon={Palette} count={getCount('b_design')} onClick={() => navigate('/board/b_design')} />
                        <DepartmentCard title="REDES SOCIALES" icon={Smartphone} count={getCount('b_social')} onClick={() => navigate('/board/b_social')} />
                        <DepartmentCard title="WEB laGràfica" icon={Code} count={getCount('b_web')} onClick={() => navigate('/board/b_web')} />
                        <DepartmentCard title="Proyectos IA" icon={Bot} count={getCount('b_ai')} onClick={() => navigate('/board/b_ai')} />
                    </div>
                </div>

                {/* ROW 2: CLIENTS */}
                <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ml-1">Clientes del Estudio</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DepartmentCard title="LLEIDA EN VERD 2025" icon={Layout} count={getCount('b_lleida')} onClick={() => navigate('/board/b_lleida')} />
                        <DepartmentCard title="ANIMAC26" icon={Play} count={getCount('b_animac')} onClick={() => navigate('/board/b_animac')} />
                        <DepartmentCard title="Imo" icon={Briefcase} count={getCount('b_imo')} onClick={() => navigate('/board/b_imo')} />
                        <DepartmentCard title="EXPOSICIÓN DIBA 2026" icon={FileText} count={getCount('b_diba')} onClick={() => navigate('/board/b_diba')} />
                    </div>
                </div>

                {/* ROW 3: GESTIÓ (Password Protected) */}
                <div className="bg-gray-50/50 rounded-[2.5rem] p-8 border border-gray-100 mt-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-orange/10 rounded-xl text-brand-orange">
                                <Lock size={18} />
                            </div>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Gestión Administrativa</h2>
                        </div>
                        {!isManagementUnlocked && (
                            <button
                                onClick={() => setShowPasswordInput(!showPasswordInput)}
                                className="text-[10px] font-black text-brand-orange uppercase tracking-widest hover:underline"
                            >
                                {showPasswordInput ? 'CANCELAR' : 'DESBLOQUEAR ACCESO'}
                            </button>
                        )}
                    </div>

                    {!isManagementUnlocked ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            {showPasswordInput ? (
                                <form onSubmit={handleUnlockManagement} className="flex flex-col items-center gap-4 w-full max-w-xs">
                                    <input
                                        type="password"
                                        placeholder="Introduce la contraseña..."
                                        className="w-full px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-orange/20"
                                        value={managementPassword}
                                        onChange={(e) => setManagementPassword(e.target.value)}
                                        autoFocus
                                    />
                                    <button type="submit" className="w-full bg-brand-orange text-white py-3 rounded-2xl text-xs font-black tracking-widest uppercase shadow-lg shadow-orange-500/20">
                                        ENTRAR
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                                        <Lock size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sección Privada</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <DepartmentCard title="PRESUPUESTOS" icon={Calculator} count={getCount('b_budget')} onClick={() => navigate('/board/b_budget')} />
                            <DepartmentCard title="FACTURACIÓN" icon={Receipt} count={getCount('b_billing')} onClick={() => navigate('/board/b_billing')} />
                            <DepartmentCard title="KIT DIGITAL" icon={Gavel} count={getCount('b_kit_digital')} onClick={() => navigate('/board/b_kit_digital')} />
                        </div>
                    )}
                </div>

                {/* ROW 4: URGENT NOTICES */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col h-full border-l-4 border-l-brand-orange">
                    <div className="flex items-center justify-between mb-6 md:mb-8">
                        <div className="flex items-center gap-3">
                            <Calendar size={20} className="text-brand-orange" />
                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Agenda (Orden del día)</h3>
                        </div>
                        <span className="text-[10px] font-black bg-orange-50 text-brand-orange px-3 py-1 rounded-full">{urgentNotes.filter(n => !n.done).length} POR HACER</span>
                    </div>
                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="¿Qué hay que hacer ahora mismo?..."
                            className="flex-1 px-5 py-4 bg-gray-50 rounded-2xl text-sm font-bold border border-gray-100 outline-none focus:ring-2 focus:ring-brand-orange/10 transition-all"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addUrgentNote()}
                        />
                        <button onClick={addUrgentNote} className="bg-brand-orange text-white px-5 rounded-2xl shadow-lg shadow-orange-500/20 active:scale-90 transition-all">
                            <Plus size={24} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {urgentNotes.map(note => (
                            <div key={note.id} className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${note.done ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-orange-100 shadow-sm border-l-4 border-l-brand-orange'}`}>
                                <button onClick={() => toggleUrgentNoteDone(note.id)} className={`w-6 h-6 shrink-0 rounded-lg border-2 ${note.done ? 'bg-brand-orange border-brand-orange text-white' : 'bg-white border-brand-orange/30 text-transparent'} flex items-center justify-center transition-all mt-0.5`}>
                                    <Check size={14} strokeWidth={3} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-black whitespace-pre-wrap leading-tight ${note.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {note.text}
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{note.date}</p>
                                </div>
                                {note.done && (
                                    <button onClick={() => handleArchiveNote(note)} className="p-2 text-gray-300 hover:text-brand-orange transition-colors">
                                        <Archive size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {urgentNotes.length === 0 && <div className="py-12 text-center text-gray-300 font-bold uppercase tracking-widest text-xs col-span-full italic">No hay avisos urgentes</div>}
                    </div>
                </div>
            </div>

            {/* Widgets Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Calendar */}
                <div onClick={() => navigate('/calendar')} className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 cursor-pointer hover:border-brand-orange/30 hover:shadow-xl transition-all group">
                    <div className="flex items-center gap-3 mb-6">
                        <Calendar size={20} className="text-brand-orange" />
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Calendario</h3>
                    </div>
                    <div className="h-40 bg-gray-50 rounded-3xl flex flex-col items-center justify-center text-gray-300 text-[10px] font-black uppercase tracking-widest italic group-hover:bg-orange-50 transition-all gap-4">
                        <Calendar size={32} className="opacity-20" />
                        <span className="px-6 text-center">Pulsa para ver la agenda completa</span>
                    </div>
                </div>

                {/* Time Control */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Clock size={20} className="text-brand-orange" />
                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Control Horario</h3>
                        </div>
                        <button onClick={handleAddTimeLog} className="text-[10px] font-bold text-gray-400 hover:text-brand-orange uppercase tracking-widest flex items-center gap-1">VER TODO <ChevronRight size={12} /></button>
                    </div>
                    <div className="p-6 bg-orange-50/50 rounded-3xl border border-brand-orange/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg ${activeEntry ? 'bg-red-500 animate-pulse' : 'bg-brand-orange'}`}>
                                    {activeEntry ? <Play size={20} /> : <Square size={20} />}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Tu jornada hoy</p>
                                    <p className="text-2xl font-black text-brand-black tracking-tighter">{formatTime(elapsedTime)}</p>
                                </div>
                            </div>
                            <button
                                onClick={activeEntry ? handleClockOut : handleClockIn}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg ${activeEntry
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 shadow-red-200'
                                    : 'bg-brand-orange text-white hover:bg-orange-600 shadow-orange-200'
                                    }`}
                            >
                                {activeEntry ? 'Detener' : 'Comenzar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
