import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Trash2, Edit2, Plus, Layout, Palette, Code, Smartphone, Clipboard, DollarSign, Receipt, Mail, Send, Calendar, Clock, Bell, Search, Mic, ChevronRight, Square, Play, Bot, Briefcase, FileText, Gavel, Archive, Check, Lock } from 'lucide-react';

// ... (previous imports)

const Dashboard = () => {
    const navigate = useNavigate();
    const CURRENT_USER_ID = 'montse'; // Hardcoded for this session

    const [boards, setBoards] = useState([]);
    const [allCards, setAllCards] = useState([]); // State for all cards
    const [users, setUsers] = useState([]); // Add users state
    const [selectedUsers, setSelectedUsers] = useState([]); // Filter State
    const [stats, setStats] = useState({ active: 0, completed: 0, totalProjects: 0 });

    // Time Tracking State
    const [activeEntry, setActiveEntry] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    const [emails, setEmails] = useState([]);
    const [urgentNotes, setUrgentNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [chatMessage, setChatMessage] = useState('');

    // Management Access
    const [isManagementUnlocked, setIsManagementUnlocked] = useState(false);
    const [managementPassword, setManagementPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);

    // Global Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ cards: [], docs: [] });
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Timer Interval
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
            setAllCards(db.cards || []);
        } catch (error) {
            console.error("Error loading boards/cards", error);
        }

        try {
            const userData = await api.getUsers();
            setUsers(userData || []);
        } catch (error) {
            console.error("Error loading users", error);
        }

        // Check Time Status
        try {
            const entries = await api.getTimeEntries(CURRENT_USER_ID);
            const ongoing = entries.find(e => !e.end);
            if (ongoing) {
                setActiveEntry(ongoing);
            }
        } catch (error) {
            console.error("Error loading time entries", error);
        }

        // Mock emails
        const emailData = await api.getEmails('dummy_user_1', 'INBOX');
        setEmails(emailData.slice(0, 3));
    };

    const toggleUserFilter = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
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

    // --- Widgets ---

    const DepartmentCard = ({ title, icon: Icon, count, onClick }) => (
        <div onClick={onClick} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-brand-orange/30 transition-all cursor-pointer h-40">
            <div className={`p-3 rounded-full mb-3 ${onClick ? 'bg-orange-50 text-brand-orange' : 'bg-gray-50 text-gray-400'}`}>
                <Icon size={24} />
            </div>
            <h3 className="font-bold text-sm uppercase text-gray-800 mb-1">{title}</h3>
            <p className="text-xs text-gray-400">{count} Projectes</p>
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
        if (managementPassword === 'admin123') {
            setIsManagementUnlocked(true);
            setManagementPassword('');
        } else {
            alert('Contraseña incorrecta');
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults({ cards: [], docs: [] });
            setIsSearchOpen(false);
            return;
        }

        const db = await api.getData();

        // Search in Cards
        const foundCards = (db.cards || []).filter(c =>
            c.title?.toLowerCase().includes(query.toLowerCase()) ||
            (c.descriptionBlocks || []).some(b => b.text?.toLowerCase().includes(query.toLowerCase())) ||
            (c.comments || []).some(com => com.text?.toLowerCase().includes(query.toLowerCase()))
        ).map(c => ({
            ...c,
            boardTitle: db.boards?.find(b => b.id === c.boardId)?.title || 'Tablero'
        }));

        // Search in local docs/checklists (simulated)
        const savedDocs = JSON.parse(localStorage.getItem('companyChecklists') || '{}');
        const foundDocs = [];
        Object.entries(savedDocs).forEach(([cat, items]) => {
            (items || []).forEach(item => {
                if (item.text?.toLowerCase().includes(query.toLowerCase())) {
                    foundDocs.push({ category: cat, text: item.text, id: item.id });
                }
            });
        });

        const notes = localStorage.getItem('companyNotes') || '';
        if (notes.toLowerCase().includes(query.toLowerCase())) {
            foundDocs.push({ category: 'Notes', text: 'Coincidencia en Bloc de Notes', id: 'notes' });
        }

        setSearchResults({ cards: foundCards, docs: foundDocs });
        setIsSearchOpen(true);
    };

    return (
        <div className="max-w-[1920px] mx-auto h-full flex flex-col space-y-6">

            {/* Custom Dashboard Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-2xl font-bold">
                        <span>LaGràfica <span className="text-brand-orange">Studio</span></span>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-64 lg:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar en todo el proyecto..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />

                        {/* Search Results Dropdown */}
                        {isSearchOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                <div className="p-4">
                                    {searchResults.cards.length === 0 && searchResults.docs.length === 0 ? (
                                        <p className="text-center text-xs text-gray-400 py-4">No se han encontrado resultados.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {searchResults.cards.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Tarjetas ({searchResults.cards.length})</h4>
                                                    <div className="space-y-1">
                                                        {searchResults.cards.map(card => (
                                                            <div
                                                                key={card.id}
                                                                onClick={() => { navigate(`/board/${card.boardId}`); setIsSearchOpen(false); }}
                                                                className="p-2 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors group"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-sm font-bold text-gray-800 group-hover:text-brand-orange transition-colors">{card.title}</p>
                                                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{card.boardTitle}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {searchResults.docs.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Documentos ({searchResults.docs.length})</h4>
                                                    <div className="space-y-1">
                                                        {searchResults.docs.map(doc => (
                                                            <div
                                                                key={doc.id}
                                                                onClick={() => { navigate('/docs'); setIsSearchOpen(false); }}
                                                                className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors group"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{doc.text}</p>
                                                                    <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{doc.category}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* MEMBER SELECTION (Centeredish) */}
                <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:block">Filtrar per equip:</span>
                    <div className="flex items-center gap-3">
                        {users.map((u, index) => {
                            // Deterministic color fallback
                            const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
                            const colorClass = colors[index % colors.length];

                            return (
                                <div
                                    key={u.id}
                                    onClick={() => toggleUserFilter(u.id)}
                                    className="flex flex-col items-center gap-1 cursor-pointer group min-w-[40px]"
                                    title={u.name}
                                >
                                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all relative flex items-center justify-center text-white
                                        ${selectedUsers.includes(u.id)
                                            ? 'border-brand-orange ring-2 ring-brand-orange/30 scale-105'
                                            : 'border-white ring-1 ring-gray-100'}
                                        ${!u.avatarImage ? colorClass : ''}
                                    `}>
                                        {u.avatarImage ? (
                                            <img src={u.avatarImage} alt={u.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold">{u.avatar || u.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <span className={`text-[9px] font-bold text-center truncate w-full ${selectedUsers.includes(u.id) ? 'text-brand-orange' : 'text-gray-400'}`}>
                                        {u.name.split(' ')[0]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/docs')} className="bg-brand-orange text-white px-6 py-2.5 rounded-lg font-bold text-xs tracking-wider shadow-lg hover:bg-orange-600 transition-colors flex items-center gap-2">
                        <Clipboard size={16} /> DOCUMENTACIÓ
                    </button>
                    <button className="bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg font-bold text-xs tracking-wider hover:bg-gray-50 transition-colors">
                        SORTIR
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

                {/* CENTER COLUMN (Expanded to 9 columns) */}
                <div className="col-span-9 flex flex-col gap-6">

                    {/* Helper for counts */}
                    {(() => {
                        const getCount = (bid) =>
                            boards.find(b => b.id === bid)?.columns?.reduce((acc, col) =>
                                acc + (allCards.filter(c => {
                                    if (c.columnId !== col.id) return false;
                                    if (selectedUsers.length > 0) {
                                        const responsible = c.responsibleId || c.assignee;
                                        return selectedUsers.includes(responsible);
                                    }
                                    return true;
                                })?.length || 0), 0) || 0;

                        return (
                            <div className="space-y-8">
                                {/* ROW 1: SERVICES */}
                                <div>
                                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ml-1">Serveis</h2>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <DepartmentCard title="Disseny Gràfic" icon={Palette} count={getCount('b_design')} onClick={() => navigate('/board/b_design')} />
                                        <DepartmentCard title="Xarxes Socials" icon={Smartphone} count={getCount('b_social')} onClick={() => navigate('/board/b_social')} />
                                        <DepartmentCard title="Web" icon={Code} count={getCount('b_web')} onClick={() => navigate('/board/b_web')} />
                                        <DepartmentCard title="Projectes IA" icon={Bot} count={getCount('b_ai')} onClick={() => navigate('/board/b_ai')} />
                                    </div>
                                </div>

                                {/* ROW 2: CLIENTS */}
                                <div>
                                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ml-1">Clients</h2>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <DepartmentCard title="Lleida en verd" icon={Layout} count={getCount('b_lleida')} onClick={() => navigate('/board/b_lleida')} />
                                        <DepartmentCard title="Animac" icon={Play} count={getCount('b_animac')} onClick={() => navigate('/board/b_animac')} />
                                        <DepartmentCard title="Imo" icon={Briefcase} count={getCount('b_imo')} onClick={() => navigate('/board/b_imo')} />
                                        <DepartmentCard title="Diba" icon={FileText} count={getCount('b_diba')} onClick={() => navigate('/board/b_diba')} />
                                    </div>
                                </div>

                                {/* ROW 3: MANAGEMENT (PROTECTED) */}
                                <div className="bg-brand-orange p-6 rounded-3xl shadow-lg mt-4 relative overflow-hidden">
                                    <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Gestió i Administració</h2>

                                    {isManagementUnlocked ? (
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
                                            <DepartmentCard title="Gestió" icon={Clipboard} count={getCount('b_management')} onClick={() => navigate('/board/b_management')} />
                                            <DepartmentCard title="Pressupostos" icon={DollarSign} count={getCount('b_budget')} onClick={() => navigate('/board/b_budget')} />
                                            <DepartmentCard title="Facturació" icon={Receipt} count={getCount('b_billing')} onClick={() => navigate('/board/b_billing')} />
                                            <DepartmentCard title="Licitacions" icon={Gavel} count={getCount('b_tenders')} onClick={() => navigate('/board/b_tenders')} />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                                            <div className="bg-white/20 p-4 rounded-full text-white">
                                                <Lock size={32} />
                                            </div>

                                            {!showPasswordInput ? (
                                                <button
                                                    onClick={() => setShowPasswordInput(true)}
                                                    className="bg-white text-brand-orange px-6 py-2 rounded-full font-bold shadow-sm hover:bg-orange-50 transition-colors"
                                                >
                                                    Accedir
                                                </button>
                                            ) : (
                                                <form onSubmit={handleUnlockManagement} className="flex gap-2">
                                                    <input
                                                        type="password"
                                                        placeholder="Contrasenya..."
                                                        autoFocus
                                                        className="px-4 py-2 rounded-lg text-sm outline-none text-gray-800 w-48"
                                                        value={managementPassword}
                                                        onChange={(e) => setManagementPassword(e.target.value)}
                                                    />
                                                    <button type="submit" className="bg-brand-black text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-800">
                                                        OK
                                                    </button>
                                                </form>
                                            )}
                                            <p className="text-white/60 text-xs font-medium">Àrea restringida</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Calendar Mock */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-1 min-h-[300px] flex flex-col relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 z-10">
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">Hoy</button>
                                <span className="text-sm font-bold text-gray-800">Enero de 2026</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-gray-50 rounded-lg"><Calendar size={16} className="text-gray-400" /></button>
                                <button className="px-3 py-1 border border-gray-200 rounded-lg text-xs font-bold text-gray-600">Mes</button>
                            </div>
                        </div>

                        {/* Warning Box */}
                        <div className="bg-yellow-100/50 p-2 rounded-lg text-[10px] text-yellow-700 font-medium mb-4 text-center">
                            No se han podido mostrar aquí los eventos de uno o más calendarios porque no tienes permiso para verlos.
                        </div>

                        {/* Calendar Grid Mockup */}
                        <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-1 text-center text-xs text-gray-500">
                            {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map(day => <div key={day} className="font-bold text-[10px] text-gray-400 py-2">{day}</div>)}

                            {/* Days Mock */}
                            {[...Array(31)].map((_, i) => {
                                const day = i + 1;
                                const isToday = day === 14;
                                return (
                                    <div key={day} className={`p-2 rounded-lg ${isToday ? 'bg-brand-orange text-white font-bold h-8 w-8 mx-auto flex items-center justify-center' : 'hover:bg-gray-50'}`}>
                                        {day}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* laGràficaProjects Chat Widget */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 min-h-[300px] flex flex-col relative group">
                        {/* Header */}
                        <div className="bg-white p-4 border-b border-gray-100 flex items-center gap-3 z-10">
                            <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Google_Chat_icon_%282020%29.svg/1024px-Google_Chat_icon_%282020%29.svg.png" alt="GC" className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-800">laGràficaProjects</h2>
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-[10px] text-gray-400">En línia</span>
                                </div>
                            </div>
                        </div>

                        {/* Visual Placeholder (Fake Chat) to give context */}
                        <div className="absolute inset-0 pt-16 px-4 space-y-3 opacity-30 pointer-events-none bg-gray-50">
                            <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                                <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm w-32 h-8"></div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <div className="bg-green-100 p-2 rounded-lg rounded-tr-none shadow-sm w-40 h-10"></div>
                                <div className="w-6 h-6 rounded-full bg-green-200"></div>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                                <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm w-56 h-12"></div>
                            </div>
                        </div>

                        {/* Action Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pt-10 bg-white/60 backdrop-blur-[2px] transition-all group-hover:bg-white/40">
                            <p className="text-xs text-gray-500 mb-4 font-medium">Per seguretat, Google Chat s'obra en finestra independent</p>
                            <button
                                onClick={() => window.open('https://chat.google.com', 'laGraficaChat', 'width=600,height=700,menubar=no,toolbar=no,location=no,status=no')}
                                className="bg-[#00AC47] hover:bg-[#008f3b] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-xl hover:shadow-green-500/30 flex items-center gap-2 transform hover:scale-105 active:scale-95"
                            >
                                <Send size={18} />
                                Obrir Xat d'Equip
                            </button>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: TIME CONTROL & URGENT */}
                <div className="col-span-3 flex flex-col gap-6">
                    {/* Time Control (Team List) */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col max-h-[400px]">
                        <div onClick={handleAddTimeLog} className="flex justify-between items-center mb-6 cursor-pointer group">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider group-hover:text-brand-orange transition-colors">Control Horari</h3>
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-orange transition-colors" />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {/* MY STATUS */}
                            <div className="flex items-center justify-between p-3 bg-brand-lightgray rounded-xl border border-brand-orange/20 shadow-sm relative overflow-hidden">
                                {activeEntry && <div className="absolute top-0 right-0 p-1"><span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span></div>}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center text-xs font-bold">
                                        M
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-brand-black">TU (Montse)</p>
                                        <p className={`text-[10px] font-mono ${activeEntry ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                                            {activeEntry ? formatTime(elapsedTime) : 'DESCONNECTAT'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={activeEntry ? handleClockOut : handleClockIn}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm
                                        ${activeEntry
                                            ? 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white'
                                            : 'bg-green-100 text-green-500 hover:bg-green-500 hover:text-white'}`}
                                >
                                    {activeEntry ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                </button>
                            </div>

                            {[
                                { id: 1, name: 'Omar', status: 'idle', color: 'bg-blue-500' },
                                { id: 2, name: 'Neus', status: 'idle', color: 'bg-sky-400' },
                                { id: 3, name: 'Alba T', status: 'working', color: 'bg-yellow-500' }
                            ].map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full ${user.color} text-white flex items-center justify-center text-xs font-bold`}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{user.name}</p>
                                            <p className={`text-[10px] font-bold ${user.status === 'working' ? 'text-green-500 animate-pulse' : 'text-gray-400'}`}>
                                                {user.status === 'working' ? 'TREBALLANT...' : 'DESCONNECTAT'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm
                                            ${user.status === 'working'
                                                ? 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white'
                                                : 'bg-green-100 text-green-500 hover:bg-green-500 hover:text-white'}`}
                                    >
                                        {user.status === 'working' ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Urgent Notices */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-1 flex flex-col">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Avisos Urgents</h3>

                        {/* Input Moved to Top */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Nova nota urgent..."
                                className="w-full pl-3 pr-3 py-2 bg-gray-50 rounded-lg text-xs border border-gray-200 focus:outline-none focus:border-brand-orange"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addUrgentNote()}
                            />
                            <button onClick={addUrgentNote} className="bg-brand-orange text-white p-2 rounded-lg hover:bg-orange-600 transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[300px] pr-1">
                            {urgentNotes.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No hi ha avisos urgents.</p>}
                            {urgentNotes.map(note => (
                                <div key={note.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${note.done ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-yellow-50 border-yellow-100'}`}
                                >
                                    <div
                                        onClick={() => toggleUrgentNoteDone(note.id)}
                                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${note.done ? 'border-gray-400 bg-gray-400' : 'border-red-500 bg-white'}`}
                                    >
                                        {note.done && <Check size={10} className="text-white" />}
                                    </div>
                                    <span
                                        onClick={() => toggleUrgentNoteDone(note.id)}
                                        className={`text-xs font-bold flex-1 cursor-pointer select-none ${note.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                                    >
                                        {note.text}
                                    </span>
                                    <button
                                        onClick={() => handleArchiveNote(note)}
                                        className="text-gray-400 hover:text-green-600 p-1 rounded-md hover:bg-green-50 transition-colors"
                                        title="Archivar"
                                    >
                                        <Archive size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
