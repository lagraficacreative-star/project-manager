import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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
import { LayoutDashboard, Inbox as InboxIcon, Users, Book, Calendar as CalIcon, Folder, Menu, X, Package, Gavel } from 'lucide-react';

function App() {
    const [selectedUsers, setSelectedUsers] = useState([]);
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

    const clearFilters = () => setSelectedUsers([]);

    // Assume current user is Montse for now (simulated session)
    const currentUser = users.find(u => u.id === 'montse') || { name: 'Montse', id: 'montse' };

    const navLinks = [
        { to: "/inbox", icon: <InboxIcon size={18} />, label: "Buzón" },
        {
            to: "/agenda",
            icon: <Book size={18} />,
            label: "Agenda",
            subItems: [
                { to: "/agenda/clients", label: "Clientes" },
                { to: "/agenda/suppliers", label: "Proveedores" }
            ]
        },
        { to: "/calendar", icon: <CalIcon size={18} />, label: "Calendario" },
        { to: "/rrhh", icon: <Users size={18} />, label: "Equip" },
        { to: "/docs", icon: <Folder size={18} />, label: "Docs" },
        { to: "/resources", icon: <Package size={18} />, label: "Recursos" },
        { to: "/licitaciones", icon: <Gavel size={18} />, label: "Licitacions" },
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
                        // Check for messages from others
                        const fromOthers = newMsgs.filter(m => m.author !== currentUser.name);
                        if (fromOthers.length > 0) {
                            if (!isChatOpen) {
                                setUnreadCount(u => u + fromOthers.length);
                                if (Notification.permission === "granted" && document.hidden) {
                                    const latest = fromOthers[fromOthers.length - 1];
                                    new Notification(`Nou missatge de ${latest.author}`, {
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

    return (
        <Router>
            <div className="min-h-screen bg-brand-lightgray font-sans text-brand-black flex flex-col md:flex-row overflow-x-hidden">

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
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Menú Principal</p>
                        <nav className="flex flex-col gap-1">
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
                    </div>

                    {/* Members Filter (Vertical) */}
                    <div className="flex flex-col min-h-0 border-t border-gray-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membres de l'Equip</p>
                            <button onClick={clearFilters} className="text-[10px] font-bold text-brand-orange hover:underline">Tots</button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 pr-1 pb-2">
                            {users.map(u => {
                                const isSelected = selectedUsers.includes(u.id);
                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => toggleUserFilter(u.id)}
                                        className={`flex flex-col items-center justify-center p-1.5 rounded-lg cursor-pointer transition-all border text-center
                                            ${isSelected
                                                ? 'bg-orange-50 border-brand-orange shadow-sm'
                                                : 'bg-white border-transparent hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white mb-1 shrink-0
                                            ${u.id === 'montse' ? 'bg-brand-orange ring-1 ring-orange-100' : 'bg-gray-400'}`}>
                                            {u.avatar || u.name[0]}
                                        </div>
                                        <p className={`text-[8px] font-black leading-tight uppercase truncate w-full ${isSelected ? 'text-brand-orange' : 'text-gray-500'}`}>{u.name.split(' ')[0]}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <SidebarAI />

                    {/* Logout / Profile at bottom */}
                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center gap-3 p-2">
                            <div className="w-10 h-10 rounded-full bg-brand-black text-white flex items-center justify-center font-bold">M</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 truncate">Montse Torrelles</p>
                                <p className="text-xs text-brand-orange font-medium hover:underline cursor-pointer">SORTIR</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* MOBILE HEADER */}
                <header className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-50">
                    <Link to="/" className="text-xl font-black tracking-tighter text-brand-black">
                        LaGràfica <span className="text-brand-orange">Studio</span>
                    </Link>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-500">
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>

                {/* Main Content Overlay for Mobile Menu */}
                {isMenuOpen && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 md:hidden" onClick={() => setIsMenuOpen(false)} />
                )}

                <main className="flex-1 flex flex-col min-w-0 min-h-screen">
                    <div className="p-4 md:p-8 lg:p-10 flex-1">
                        <Routes>
                            <Route path="/" element={<Dashboard selectedUsers={selectedUsers} />} />
                            <Route path="/board/:boardId" element={<Board selectedUsers={selectedUsers} />} />
                            <Route path="/inbox" element={<Inbox selectedUsers={selectedUsers} />} />
                            <Route path="/rrhh" element={<HRManagement selectedUsers={selectedUsers} />} />
                            <Route path="/docs" element={<CompanyDocs selectedUsers={selectedUsers} />} />
                            <Route path="/agenda" element={<AgendaGPT selectedUsers={selectedUsers} />} />
                            <Route path="/agenda/:filterType" element={<AgendaGPT selectedUsers={selectedUsers} />} />
                            <Route path="/calendar" element={<Calendar />} />
                            <Route path="/resources" element={<Resources />} />
                            <Route path="/licitaciones" element={<Licitaciones />} />
                            <Route path="*" element={<Dashboard selectedUsers={selectedUsers} />} />
                        </Routes>
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
