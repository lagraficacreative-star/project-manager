import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Trash2, Edit2, Plus, Layout, Palette, Code, Smartphone, Clipboard, DollarSign, Receipt, Mail, Send, Calendar, Clock, Bell, Search, Mic, ChevronRight, Square, Play, Bot, Briefcase, FileText, Gavel, Archive, Check, Lock, Calculator } from 'lucide-react';


const Dashboard = ({ selectedUsers }) => {
    const navigate = useNavigate();
    const CURRENT_USER_ID = 'montse'; // Hardcoded for this session

    const [boards, setBoards] = useState([]);
    const [allCards, setAllCards] = useState([]); // State for all cards
    const [users, setUsers] = useState([]); // Add users state
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
        <div className="flex flex-col gap-10 pb-10">

            {/* Header Section */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-brand-black tracking-tighter">LaGràfica <span className="text-brand-orange">Studio</span></h2>
                        <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Taulell de Control</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cerca global..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange/20 outline-none"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {isSearchOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] max-h-[400px] overflow-y-auto">
                                    <div className="p-4">
                                        {searchResults.cards.length === 0 && searchResults.docs.length === 0 ? (
                                            <p className="text-center text-xs text-gray-400 py-4">No s'han trobat resultats.</p>
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
                                                                    className="p-2 hover:bg-orange-50 rounded-lg cursor-pointer"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-sm font-bold text-gray-800">{card.title}</p>
                                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{card.boardTitle}</span>
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
                        <button
                            onClick={() => navigate('/docs')}
                            className="bg-brand-black text-white px-6 py-3 sm:py-2 rounded-xl text-xs font-bold tracking-widest hover:bg-brand-orange transition-all w-full sm:w-auto shadow-sm active:scale-95"
                        >
                            DOCUMENTACIÓ
                        </button>
                    </div>
                </div>
            </div>

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
                    <div className="flex flex-col gap-10">
                        {/* ROW 1: SERVICES */}
                        <div>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ml-1">Serveis</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <DepartmentCard title="Disseny Gràfic" icon={Palette} count={getCount('b_design')} onClick={() => navigate('/board/b_design')} />
                                <DepartmentCard title="Xarxes Socials" icon={Smartphone} count={getCount('b_social')} onClick={() => navigate('/board/b_social')} />
                                <DepartmentCard title="Web" icon={Code} count={getCount('b_web')} onClick={() => navigate('/board/b_web')} />
                                <DepartmentCard title="Projectes IA" icon={Bot} count={getCount('b_ai')} onClick={() => navigate('/board/b_ai')} />
                            </div>
                        </div>

                        {/* ROW 2: CLIENTS */}
                        <div>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ml-1">Clients</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <DepartmentCard title="Lleida en verd" icon={Layout} count={getCount('b_lleida')} onClick={() => navigate('/board/b_lleida')} />
                                <DepartmentCard title="Animac" icon={Play} count={getCount('b_animac')} onClick={() => navigate('/board/b_animac')} />
                                <DepartmentCard title="Imo" icon={Briefcase} count={getCount('b_imo')} onClick={() => navigate('/board/b_imo')} />
                                <DepartmentCard title="Diba" icon={FileText} count={getCount('b_diba')} onClick={() => navigate('/board/b_diba')} />
                            </div>
                        </div>

                        {/* ROW 3: MANAGEMENT (PROTECTED) */}
                        <div className="bg-brand-orange p-6 rounded-3xl shadow-lg relative overflow-hidden">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Gestió i Administració</h2>
                            {isManagementUnlocked ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <DepartmentCard title="Gestió" icon={Clipboard} count={getCount('b_management')} onClick={() => navigate('/board/b_management')} />
                                    <DepartmentCard title="Pressupostos" icon={DollarSign} count={getCount('b_budget')} onClick={() => navigate('/board/b_budget')} />
                                    <DepartmentCard title="Facturació" icon={Receipt} count={getCount('b_billing')} onClick={() => navigate('/board/b_billing')} />
                                    <DepartmentCard title="Licitacions" icon={Gavel} count={getCount('b_tenders')} onClick={() => navigate('/board/b_tenders')} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 gap-4">
                                    <Lock size={32} className="text-white/50" />
                                    <button onClick={() => setShowPasswordInput(true)} className="bg-white text-brand-orange px-6 py-2 rounded-full font-bold">Accedir</button>
                                    {showPasswordInput && (
                                        <form onSubmit={handleUnlockManagement} className="flex gap-2">
                                            <input type="password" placeholder="Contrasenya..." className="px-4 py-2 rounded-lg text-sm outline-none" value={managementPassword} onChange={e => setManagementPassword(e.target.value)} />
                                            <button type="submit" className="bg-brand-black text-white px-4 py-2 rounded-lg font-bold text-sm">OK</button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Calendar Widget */}
            <div onClick={() => navigate('/calendar')} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:border-brand-orange/30 transition-all">
                <div className="flex items-center gap-3 mb-6">
                    <Calendar size={20} className="text-brand-orange" />
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Calendari</h3>
                </div>
                <div className="h-64 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 text-sm font-medium italic">
                    Prem per veure l'agenda completa
                </div>
            </div>

            {/* Time Control */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div onClick={handleAddTimeLog} className="flex justify-between items-center mb-8 cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Clock size={20} className="text-brand-orange" />
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Control Horari</h3>
                    </div>
                    <ChevronRight size={20} className="text-gray-300" />
                </div>
                <div className="space-y-4">
                    {/* User Status Mockups */}
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-brand-orange/10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold">M</div>
                            <div>
                                <p className="text-sm font-black text-brand-black">TU (Montse)</p>
                                <p className="text-xs font-bold text-green-600">{activeEntry ? 'TREBALLANT' : 'DESCONNECTAT'}</p>
                            </div>
                        </div>
                        <button onClick={activeEntry ? handleClockOut : handleClockIn} className={`p-3 rounded-xl ${activeEntry ? 'bg-red-500' : 'bg-green-500'} text-white`}>
                            {activeEntry ? <Square size={16} /> : <Play size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Urgent Notices */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                    <Bell size={20} className="text-brand-orange" />
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Avisos Urgents</h3>
                </div>
                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        placeholder="Escriu una nota urgent..."
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 outline-none"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addUrgentNote()}
                    />
                    <button onClick={addUrgentNote} className="bg-brand-orange text-white p-3 rounded-xl">
                        <Plus size={20} />
                    </button>
                </div>
                <div className="space-y-4">
                    {urgentNotes.map(note => (
                        <div key={note.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${note.done ? 'bg-gray-50' : 'bg-yellow-50'}`}>
                            <div onClick={() => toggleUrgentNoteDone(note.id)} className={`w-5 h-5 rounded-full border-2 ${note.done ? 'bg-gray-400' : 'bg-white'} cursor-pointer`} />
                            <span className={`text-sm font-bold flex-1 ${note.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{note.text}</span>
                            <button onClick={() => handleArchiveNote(note)} className="text-gray-400 hover:text-red-500"><Archive size={18} /></button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
