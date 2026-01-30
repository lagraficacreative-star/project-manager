import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Board from './components/Board';
import Inbox from './components/Inbox';
import HRManagement from './components/HRManagement';
import CompanyDocs from './components/CompanyDocs';
import AgendaGPT from './components/AgendaGPT';
import Resources from './components/Resources';
import SidebarAI from './components/SidebarAI';
import Licitaciones from './components/Licitaciones';
import { api } from './api';
import Calendar from './components/Calendar';
import ChatWidget from './components/ChatWidget';
import { LayoutDashboard, Inbox as InboxIcon, Users, Book, Calendar as CalIcon, Folder, Menu, X, Package, Gavel, LogOut, ChevronRight, User as UserIcon, Tag } from 'lucide-react';

// Sub-component to handle page title/context in TopBar
const AUTHORIZED_EMAILS = ['montse@lagrafica.com', 'admin@lagrafica.com', 'alba@lagrafica.com', 'neus@lagrafica.com', 'ateixido@lagrafica.com', 'omar@lagrafica.com'];

const PageContext = () => {
    const location = useLocation();
    const path = location.pathname;

    if (path === '/') return "Dashboard Principal";
    if (path.startsWith('/board')) return "Gestión de Tablero";
    if (path === '/inbox') return "Buzón de Comunicaciones";
    if (path === '/agenda') return "CONTACTOS";
    if (path === '/calendar') return "Calendario de Trabajo";
    if (path === '/rrhh') return "Gestión de Equipo";
    if (path === '/docs') return "Gestión de Empresa";
    if (path === '/resources') return "Recursos & Assets";
    if (path === '/licitaciones') return "Gestión de Licitaciones";
    return "LaGràfica Project Manager";
};

function App() {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [users, setUsers] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        api.getUsers().then(data => setUsers(data || [])).catch(console.error);
    }, []);

    const toggleUserFilter = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const clearFilters = () => {
        setSelectedUsers([]);
        setSelectedClient(null);
    };

    const [isManagementUnlocked, setIsManagementUnlocked] = useState(() => {
        return localStorage.getItem('isManagementUnlocked') === 'true';
    });

    const unlockManagement = (unlocked) => {
        if (unlocked && !AUTHORIZED_EMAILS.includes(currentUser.email)) {
            alert("Acceso denegado: Tu usuario no tiene permisos para esta sección.");
            return;
        }
        setIsManagementUnlocked(unlocked);
        localStorage.setItem('isManagementUnlocked', unlocked ? 'true' : 'false');
    };

    const [currentUserId, setCurrentUserId] = useState(() => {
        return localStorage.getItem('currentUserId') || 'montse';
    });

    const currentUser = users.find(u => u.id === currentUserId) || { name: 'Montse', id: 'montse' };

    useEffect(() => {
        localStorage.setItem('currentUserId', currentUserId);
    }, [currentUserId]);

    const navLinks = [
        { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { to: "/inbox", icon: <InboxIcon size={18} />, label: "Buzón" },
        {
            to: "/agenda",
            icon: <Book size={18} />,
            label: "CONTACTOS",
            subItems: [
                { to: "/agenda/clients", label: "Clientes" },
                { to: "/agenda/suppliers", label: "Proveedores" }
            ]
        },
        { to: "/calendar", icon: <CalIcon size={18} />, label: "Calendario" },
        { to: "/rrhh", icon: <Users size={18} />, label: "Equipo" },
        { to: "/resources", icon: <Package size={18} />, label: "Recursos" },
        { to: "/licitaciones", icon: <Gavel size={18} />, label: "Licitaciones" },
        { to: "/docs", icon: <Folder size={18} />, label: "Gestión" },
    ];

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        const pollMessages = async () => {
            try {
                const data = await api.getMessages();
                setMessages(prev => {
                    if (data.length > prev.length) {
                        const newMsgs = data.slice(prev.length);
                        const fromOthers = newMsgs.filter(m => m.author !== currentUser.name);
                        if (fromOthers.length > 0) {
                            if (!isChatOpen) {
                                setUnreadCount(u => u + fromOthers.length);
                                if (Notification.permission === "granted" && document.hidden) {
                                    const latest = fromOthers[fromOthers.length - 1];
                                    new Notification(`Nuevo mensaje de ${latest.author}`, {
                                        body: latest.text,
                                        icon: '/favicon.ico'
                                    });
                                }
                            }
                        }
                        return data;
                    }
                    return prev;
                });
            } catch (err) { }
        };

        const interval = setInterval(pollMessages, 3000);
        return () => clearInterval(interval);
    }, [currentUser.name, isChatOpen]);

    const handleToggleChat = () => {
        setIsChatOpen(!isChatOpen);
        if (!isChatOpen) setUnreadCount(0);
    };

    const handleSwitchSession = (userId) => {
        setCurrentUserId(userId);
        setSelectedUsers([userId]);
    };

    return (
        <Router>
            <div className="h-screen bg-brand-lightgray font-sans text-brand-black flex flex-col md:flex-row overflow-hidden">

                {/* VERTICAL SIDEBAR */}
                <aside className={`
                    fixed md:sticky top-0 left-0 z-[60] 
                    w-72 h-screen bg-white border-r border-gray-200 
                    flex flex-col gap-8 p-6 transition-transform duration-300
                    ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    {/* Logo */}
                    <Link to="/" className="text-2xl font-black tracking-tighter text-brand-black hover:opacity-80 transition-all shrink-0">
                        LaGràfica <span className="text-brand-orange">Studio</span>
                    </Link>

                    {/* Navigation */}
                    <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Menú Principal</p>
                        <nav className="flex flex-col gap-1 mb-8">
                            {navLinks.map(link => (
                                <div key={link.to} className="flex flex-col">
                                    <Link
                                        to={link.to}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-orange-50 hover:text-brand-orange transition-all group"
                                    >
                                        <span className="text-gray-400 group-hover:text-brand-orange transition-colors">
                                            {link.icon}
                                        </span>
                                        {link.label}
                                    </Link>
                                    {link.subItems && (
                                        <div className="ml-10 flex flex-col gap-1 mt-1">
                                            {link.subItems.map(sub => (
                                                <Link
                                                    key={sub.to}
                                                    to={sub.to}
                                                    onClick={() => setIsMenuOpen(false)}
                                                    className="text-[11px] font-bold text-gray-400 hover:text-brand-orange px-2 py-1.5 transition-colors uppercase tracking-wider"
                                                >
                                                    • {sub.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </nav>

                        <div className="pt-4 border-t border-gray-100">
                            <SidebarAI />
                        </div>
                    </div>

                    {/* Branding / Footer */}
                    <div className="pt-4 border-t border-gray-100 opacity-20">
                        <p className="text-[10px] font-black text-center uppercase tracking-[0.4em]">LAGRAFICA © 2025</p>
                    </div>
                </aside>

                {/* MOBILE HEADER */}
                <header className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between shrink-0 z-50 shadow-sm">
                    <Link to="/" className="text-xl font-black tracking-tighter text-brand-black">
                        LaGràfica <span className="text-brand-orange">Studio</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center text-[10px] font-black">{currentUser.name[0]}</div>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-500 bg-gray-50 rounded-xl active:scale-90 transition-all">
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </header>

                {isMenuOpen && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 md:hidden" onClick={() => setIsMenuOpen(false)} />
                )}

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-brand-lightgray">

                    {/* GLOBAL TOPBAR / LOGIN MENU */}
                    <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 sticky top-0 z-[40] shadow-sm shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-brand-lightgray p-2 rounded-xl text-brand-orange">
                                <UserIcon size={20} />
                            </div>
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Sección Actual</p>
                                <h2 className="text-sm font-black text-brand-black uppercase tracking-tight"><PageContext /></h2>
                            </div>
                            {selectedClient && (
                                <div className="ml-6 flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full border border-blue-100 animate-in slide-in-from-left-4">
                                    <Tag size={12} className="font-black" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Cliente: {selectedClient}</span>
                                    <button onClick={() => setSelectedClient(null)} className="hover:text-blue-800 ml-1"><X size={12} /></button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            {/* UNIFIED LOGIN & FILTER SELECTOR */}
                            <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-full border border-gray-100 shadow-inner">
                                <button
                                    onClick={clearFilters}
                                    className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${(selectedUsers.length === 0 && !selectedClient) ? 'bg-white text-brand-orange shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Ver Todo
                                </button>
                                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                {users.map(u => {
                                    const isActiveSession = currentUserId === u.id;

                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => {
                                                handleSwitchSession(u.id);
                                                if (isManagementUnlocked && !AUTHORIZED_EMAILS.includes(u.email)) {
                                                    setIsManagementUnlocked(false);
                                                    localStorage.setItem('isManagementUnlocked', 'false');
                                                }
                                            }}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all group border-2
                                                ${isActiveSession
                                                    ? 'bg-white border-brand-orange text-brand-black shadow-lg scale-105'
                                                    : 'bg-transparent border-transparent text-gray-400 hover:bg-white/50'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0
                                                ${isActiveSession ? 'bg-brand-orange ring-2 ring-orange-100' : 'bg-gray-300 group-hover:bg-gray-400'}`}>
                                                {u.avatar || u.name[0]}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isActiveSession ? 'text-brand-orange' : ''}`}>
                                                {u.name.split(' ')[0]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="h-8 w-px bg-gray-100 mx-2"></div>

                            <div className="flex items-center gap-4 pl-4 pr-1 py-1 bg-white border border-gray-100 rounded-full shadow-inner group">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-brand-black uppercase leading-none">{currentUser.name}</span>
                                    <span className="text-[8px] font-bold text-green-500 uppercase tracking-widest">En línea</span>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center font-black text-lg shadow-lg ring-4 ring-orange-50 transition-transform group-hover:scale-110">
                                    {currentUser.name[0]}
                                </div>
                                <button className="p-3 text-gray-200 hover:text-red-500 transition-colors">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto no-scrollbar relative p-2 md:p-4">
                        <Routes>
                            <Route path="/" element={<Dashboard selectedUsers={selectedUsers} selectedClient={selectedClient} currentUser={currentUser} isManagementUnlocked={isManagementUnlocked} unlockManagement={unlockManagement} AUTHORIZED_EMAILS={AUTHORIZED_EMAILS} />} />
                            <Route path="/board/:boardId" element={<Board selectedUsers={selectedUsers} selectedClient={selectedClient} currentUser={currentUser} isManagementUnlocked={isManagementUnlocked} unlockManagement={unlockManagement} AUTHORIZED_EMAILS={AUTHORIZED_EMAILS} />} />
                            <Route path="/inbox" element={<Inbox selectedUsers={selectedUsers} currentUser={currentUser} isManagementUnlocked={isManagementUnlocked} unlockManagement={unlockManagement} AUTHORIZED_EMAILS={AUTHORIZED_EMAILS} />} />
                            <Route path="/rrhh" element={<HRManagement selectedUsers={selectedUsers} currentUser={currentUser} />} />
                            <Route path="/docs" element={<CompanyDocs selectedUsers={selectedUsers} currentUser={currentUser} isManagementUnlocked={isManagementUnlocked} unlockManagement={unlockManagement} AUTHORIZED_EMAILS={AUTHORIZED_EMAILS} />} />
                            <Route path="/agenda" element={<AgendaGPT selectedUsers={selectedUsers} currentUser={currentUser} setSelectedClient={setSelectedClient} />} />
                            <Route path="/agenda/:filterType" element={<AgendaGPT selectedUsers={selectedUsers} currentUser={currentUser} setSelectedClient={setSelectedClient} />} />
                            <Route path="/calendar" element={<Calendar currentUser={currentUser} />} />
                            <Route path="/resources" element={<Resources currentUser={currentUser} />} />
                            <Route path="/licitaciones" element={<Licitaciones currentUser={currentUser} isManagementUnlocked={isManagementUnlocked} unlockManagement={unlockManagement} AUTHORIZED_EMAILS={AUTHORIZED_EMAILS} />} />
                            <Route path="*" element={<Dashboard selectedUsers={selectedUsers} selectedClient={selectedClient} currentUser={currentUser} isManagementUnlocked={isManagementUnlocked} unlockManagement={unlockManagement} />} />
                        </Routes>

                        <div className="h-20"></div> {/* Space for chat widget */}
                    </div>

                    <ChatWidget
                        currentUser={currentUser}
                        messages={messages}
                        isOpen={isChatOpen}
                        setIsOpen={setIsChatOpen}
                        onToggle={handleToggleChat}
                        unreadCount={unreadCount}
                    />
                </main>
            </div>
        </Router>
    );
}

export default App;
