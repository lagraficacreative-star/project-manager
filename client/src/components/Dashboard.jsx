import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Trash2, Edit2, Plus, Layout, Palette, Code, Smartphone, Clipboard, DollarSign, Receipt, Mail, Send, Calendar, Clock, Bell, Search, Mic, ChevronRight, Square, Play, Bot, Briefcase, FileText, Gavel, Archive, Check, Lock, Calculator, Upload, Table, User, Tag, X, Folder } from 'lucide-react';
import FolderGrid from './FolderGrid';


const Dashboard = ({ selectedUsers, selectedClient, currentUser, isManagementUnlocked, unlockManagement, AUTHORIZED_EMAILS }) => {
    const navigate = useNavigate();
    const CURRENT_USER_ID = currentUser.id;

    const [boards, setBoards] = useState([]);
    const [allCards, setAllCards] = useState([]);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ active: 0, completed: 0, totalProjects: 0 });
    const [docsConfig, setDocsConfig] = useState({ sections: [] });

    useEffect(() => {
        const loadDocsConfig = async () => {
            try {
                const data = await api.getData();
                if (data.docs_config) setDocsConfig(data.docs_config);
            } catch (err) {
                console.error("Failed to load docs config", err);
            }
        };
        loadDocsConfig();
    }, []);
    const [allDocs, setAllDocs] = useState([]);

    // Get unique clients & labels for filter
    const filterOptions = useMemo(() => {
        const options = new Set();
        allCards.forEach(c => {
            if (!c) return;
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
    const [aiAnswer, setAiAnswer] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [activity, setActivity] = useState([]);
    const [importingBoardId, setImportingBoardId] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'folders'

    useEffect(() => {
        loadData();
        loadActivity();
        const activityInterval = setInterval(loadActivity, 15000);
        return () => clearInterval(activityInterval);
    }, [currentUser.id]);

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
            setAllCards((db.cards || []).filter(Boolean).sort((a, b) => (a.order || 0) - (b.order || 0)));
            console.log("✅ Board data loaded:", db.boards?.length, "boards,", db.cards?.length, "cards");
        } catch (error) {
            console.error("❌ Error loading boards/cards", error);
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

            // Load extra data for search
            const [t, a, d] = await Promise.all([
                api.getTenders(),
                api.getAlerts(),
                api.getDocuments()
            ]);
            setAllTenders([...t, ...a.map(item => ({ ...item, isAlert: true }))]);
            setAllDocs(d);
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
            // Optional: loadData() to refresh stats if they include time
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
            if (!AUTHORIZED_EMAILS.includes(currentUser.email)) {
                alert("Acceso denegado: Tu usuario no tiene permisos para esta sección.");
                setManagementPassword('');
                setShowPasswordInput(false);
                return;
            }
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

    const performSearch = async (queryText) => {
        const query = queryText.toLowerCase();
        setIsSearchOpen(true);
        setAiAnswer(null);

        // Real-time Search Logic
        const foundCards = allCards.filter(c =>
            c && (c.title?.toLowerCase().includes(query) ||
                c.client?.toLowerCase().includes(query) ||
                (c.economic?.client && c.economic.client.toLowerCase().includes(query)))
        );

        const foundDocs = allDocs.filter(d =>
            d && (d.name?.toLowerCase().includes(query) ||
                d.description?.toLowerCase().includes(query))
        );

        const foundTenders = allTenders.filter(t =>
            t && (t.title?.toLowerCase().includes(query) ||
                t.institution?.toLowerCase().includes(query) ||
                t.source?.toLowerCase().includes(query))
        );

        setSearchResults({
            cards: foundCards.slice(0, 5),
            docs: foundDocs.slice(0, 5),
            tenders: foundTenders.slice(0, 5)
        });

        // AI Answer Logic (Deep Search / Contextual Summary)
        if (query.length > 2 || query === 'resumen') {
            setIsAiLoading(true);
            let responseText = "";
            let responseDetails = [];

            try {
                // 0. Proactive Summary / General Resumen
                if (query.includes('resumen') || query.includes('dia') || query.includes('hoy')) {
                    const userCards = allCards.filter(c => c && c.responsibleId === CURRENT_USER_ID && !c.columnId?.includes('done'));
                    // No need to fetch events again, we can just fetch once or use a safe call
                    const events = await api.getEvents().catch(() => []);
                    const upcomingEvents = events.filter(e => e.start && new Date(e.start) >= new Date()).sort((a, b) => new Date(a.start) - new Date(b.start));

                    responseText = `¡Hola ${currentUser.name.split(' ')[0]}! Aquí tienes tu resumen para hoy:`;
                    responseDetails = [
                        userCards.length > 0 ? `Tienes **${userCards.length} tareas** pendientes asignadas.` : "No tienes tareas pendientes para hoy.",
                        upcomingEvents.length > 0 ? `Próximo evento: **${upcomingEvents[0].title}** (${new Date(upcomingEvents[0].start).toLocaleDateString()}).` : "Sin eventos próximos en el calendario."
                    ];

                    const recentDocs = (allDocs || []).slice(0, 2);
                    if (recentDocs.length > 0) {
                        responseDetails.push(`Últimos documentos: ${recentDocs.map(d => d.name).join(', ')}.`);
                    }
                }
                // 1. Team Tasks ("que hace X?")
                else if (query.includes('que hace') || query.includes('tareas de') || query.includes('trabajo de')) {
                    const foundUser = (users || []).find(u => u.name && query.includes(u.name.toLowerCase()));
                    if (foundUser) {
                        const userCards = allCards.filter(c => c && c.responsibleId === foundUser.id && !c.columnId?.includes('done'));
                        responseText = `Actualmente **${foundUser.name}** tiene ${userCards.length} tareas pendientes asignadas.`;
                        responseDetails = userCards.slice(0, 5).map(c => `📋 ${c.title}`);
                        if (userCards.length === 0) responseText = `**${foundUser.name}** no tiene tareas pendientes en este momento.`;
                    }
                }
                // 2. Contact Search
                else if (query.includes('contacto') || query.includes('quien es') || query.includes('telefono') || query.includes('email')) {
                    const contacts = await api.getContacts().catch(() => []);
                    const cleanQuery = query.replace(/contacto|quien es|dime el|telefono|email|de/g, '').trim();
                    const foundContact = contacts.find(c => c.name && (c.name.toLowerCase().includes(cleanQuery) || (c.company && c.company.toLowerCase().includes(cleanQuery))));
                    if (foundContact) {
                        responseText = `He encontrado el contacto de **${foundContact.name}**.`;
                        responseDetails = [
                            foundContact.company ? `🏢 Empresa: ${foundContact.company}` : null,
                            foundContact.email ? `📧 Email: ${foundContact.email}` : null,
                            foundContact.phone ? `📞 Tel: ${foundContact.phone}` : null
                        ].filter(Boolean);
                    }
                }
                // 3. Project Status
                else if (query.includes('como va') || query.includes('estado de')) {
                    const cleanQuery = query.replace(/como va|el proyecto|la tarjeta|estado de/g, '').trim();
                    const card = allCards.find(c => c && c.title && c.title.toLowerCase().includes(cleanQuery));
                    if (card) {
                        const board = (boards || []).find(b => b.id === card.boardId);
                        const col = board?.columns?.find(cl => cl.id === card.columnId);
                        responseText = `El proyecto **${card.title}** está en el tablero **${board?.title || 'General'}**, columna **${col?.title || 'Pendiente'}**.`;
                        if (card.labels?.length) responseDetails = [`Etiquetas: ${card.labels.join(', ')}`];
                    }
                }
                // 4. Calendar Search
                else if (query.includes('calendario') || query.includes('agenda') || query.includes('evento') || query.includes('reunion')) {
                    const events = await api.getEvents().catch(() => []);
                    const nextEvents = events.filter(e => e.start && new Date(e.start) >= new Date()).sort((a, b) => new Date(a.start) - new Date(b.start));
                    if (nextEvents.length > 0) {
                        responseText = `He revisado la agenda. Tienes ${nextEvents.length} eventos próximamente.`;
                        responseDetails = nextEvents.slice(0, 3).map(e => `🗓️ ${new Date(e.start).toLocaleDateString()}: ${e.title}`);
                    } else {
                        responseText = "No he encontrado eventos próximos en el calendario.";
                    }
                }

                if (responseText) {
                    setAiAnswer({ text: responseText, details: responseDetails });
                } else {
                    // Default fallback for general queries
                    if (query.length > 3) {
                        setAiAnswer({
                            text: "No he podido encontrar una respuesta específica, pero puedo buscar proyectos, contactos o revisar tu agenda. ¿Quieres que busque algo más concreto?",
                            details: ["Prueba con: 'que hace Neus'", "Prueba con: 'busca proyecto X'", "Prueba con: 'resumen del dia'"]
                        });
                    }
                }
            } catch (err) {
                console.error("AI Search failed", err);
                setAiAnswer({ text: "Lo siento, ha habido un problema al procesar tu consulta. Por favor, inténtalo de nuevo." });
            } finally {
                setIsAiLoading(false);
            }
        }
    };

    const handleBannerSearch = async (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            if (!bannerQuery.trim()) {
                setIsSearchOpen(false);
                setAiAnswer(null);
                return;
            }
            performSearch(bannerQuery);
        }
    };

    // --- PROACTIVE AI SUMMARY ON MOUNT ---
    useEffect(() => {
        const timer = setTimeout(() => {
            if (allCards.length > 0 && !isSearchOpen && !bannerQuery) {
                performSearch('resumen');
            }
        }, 1500); // Wait a bit for initial data to load
        return () => clearTimeout(timer);
    }, [allCards, allDocs]);

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
                                onChange={(e) => {
                                    setBannerQuery(e.target.value);
                                    if (!e.target.value.trim()) setIsSearchOpen(false);
                                }}
                                placeholder="Busca proyectos, contactos, licitaciones..."
                                className="w-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl py-4 pl-6 pr-16 text-sm md:text-base outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all placeholder:text-white/20 shadow-2xl"
                                onKeyDown={handleBannerSearch}
                            />
                            <button
                                onClick={handleBannerSearch}
                                className="absolute right-2 top-2 bottom-2 bg-brand-orange text-white px-5 rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 font-black text-[10px] tracking-widest uppercase shadow-lg shadow-orange-500/20"
                            >
                                <Send size={16} />
                            </button>

                            {/* Search Results Overlay */}
                            {isSearchOpen && (
                                <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-slate-400">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Resultados de búsqueda</span>
                                        <button onClick={() => setIsSearchOpen(false)}><X size={16} /></button>
                                    </div>
                                    <div className="max-h-[500px] overflow-y-auto no-scrollbar p-2">
                                        {/* AI QUICK ANSWER */}
                                        {(aiAnswer || isAiLoading) && (
                                            <div className="mb-4 bg-brand-orange/5 border border-brand-orange/10 rounded-[2rem] p-5 shadow-inner">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="p-1.5 bg-brand-orange rounded-lg shadow-lg">
                                                        <Bot size={14} className="text-white" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange">Respuesta de IA</span>
                                                </div>
                                                {isAiLoading ? (
                                                    <div className="flex gap-1 p-2">
                                                        <div className="w-1 h-1 bg-brand-orange/40 rounded-full animate-bounce" />
                                                        <div className="w-1 h-1 bg-brand-orange/40 rounded-full animate-bounce delay-100" />
                                                        <div className="w-1 h-1 bg-brand-orange/40 rounded-full animate-bounce delay-200" />
                                                    </div>
                                                ) : aiAnswer && (
                                                    <div className="space-y-3">
                                                        <p className="text-sm font-bold text-slate-800 leading-relaxed">{aiAnswer.text}</p>
                                                        {aiAnswer.details && (
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {aiAnswer.details.map((d, i) => (
                                                                    <div key={i} className="text-[11px] font-medium text-slate-500 bg-white/50 px-3 py-2 rounded-xl flex items-center gap-2">
                                                                        <div className="w-1 h-1 bg-brand-orange rounded-full" /> {d}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Cards/Projects Section */}
                                        {searchResults.cards?.length > 0 && (
                                            <div className="mb-4">
                                                <div className="px-4 py-2 text-[10px] font-black text-brand-orange uppercase">Proyectos</div>
                                                {searchResults.cards.map(c => (
                                                    <div key={c.id} onClick={() => { navigate(`/board/${c.boardId}`); setIsSearchOpen(false); }} className="p-4 hover:bg-orange-50 cursor-pointer rounded-2xl transition-all flex items-center justify-between group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white rounded-xl shadow-sm"><Briefcase size={16} className="text-brand-orange" /></div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800">{c.title}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{c.economic?.client || c.client || 'Sin cliente'}</div>
                                                            </div>
                                                        </div>
                                                        {c.sourceEmailDate && (
                                                            <div className="text-[9px] font-black text-orange-400 bg-orange-50 px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap">
                                                                Mail: {new Date(c.sourceEmailDate).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tenders Section */}
                                        {searchResults.tenders?.length > 0 && (
                                            <div className="mb-4">
                                                <div className="px-4 py-2 text-[10px] font-black text-indigo-500 uppercase">Licitaciones</div>
                                                {searchResults.tenders.map(t => (
                                                    <div key={t.id} onClick={() => { navigate('/licitaciones'); setIsSearchOpen(false); }} className="p-4 hover:bg-indigo-50 cursor-pointer rounded-2xl transition-all flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-xl shadow-sm"><Gavel size={16} className="text-indigo-600" /></div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">{t.title}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{t.institution || t.source}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Documents Section */}
                                        {searchResults.docs?.length > 0 && (
                                            <div className="mb-4">
                                                <div className="px-4 py-2 text-[10px] font-black text-blue-500 uppercase">Documentos</div>
                                                {searchResults.docs.map(d => (
                                                    <div key={d.id} onClick={() => { navigate('/docs'); setIsSearchOpen(false); }} className="p-4 hover:bg-blue-50 cursor-pointer rounded-2xl transition-all flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-xl shadow-sm"><FileText size={16} className="text-blue-600" /></div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">{d.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{d.type}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {searchResults.cards?.length === 0 && searchResults.docs?.length === 0 && searchResults.tenders?.length === 0 && (
                                            <div className="p-10 text-center text-slate-400">
                                                <Search size={40} className="mx-auto mb-4 opacity-20" />
                                                <p className="text-sm font-bold">No se han encontrado resultados</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-gray-50 text-center">
                                        <button onClick={() => navigate(`/agenda?q=${encodeURIComponent(bannerQuery)}`)} className="text-[10px] font-black text-brand-orange uppercase tracking-widest hover:underline">Ver búsqueda avanzada en Agenda IA</button>
                                    </div>
                                </div>
                            )}
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

            {/* Tabs Header */}
            <div className="flex items-center gap-8 border-b border-gray-100 px-6">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'overview' ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Visión General
                    {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange rounded-full animate-in fade-in slide-in-from-bottom-2 duration-300" />}
                </button>
                <button
                    onClick={() => setActiveTab('folders')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'folders' ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Carpetas Drive
                    {activeTab === 'folders' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange rounded-full animate-in fade-in slide-in-from-bottom-2 duration-300" />}
                </button>
            </div>

            {activeTab === 'folders' ? (
                <div className="px-2">
                    <FolderGrid mode="general" customFolders={docsConfig.sections} />
                </div>
            ) : (
                <>
                    {/* Boards Grid */}
                    <div className="flex flex-col gap-10">
                        {/* ROW 1: SERVICES */}
                        <div>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 ml-1">Servicios</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <DepartmentCard title="LG - Diseño" icon={Palette} count={getCount('b_design')} onClick={() => navigate('/board/b_design')} />
                                <DepartmentCard title="REDES SOCIALES" icon={Smartphone} count={getCount('b_social')} onClick={() => navigate('/board/b_social')} />
                                <DepartmentCard title="WEB laGràfica" icon={Code} count={getCount('b_web')} onClick={() => navigate('/board/b_web')} />
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
                </>
            )
            }
        </div>
    );
};

export default Dashboard;
