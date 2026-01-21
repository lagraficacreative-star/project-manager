import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Board from './components/Board';
import Inbox from './components/Inbox';
import HRManagement from './components/HRManagement';
import CompanyDocs from './components/CompanyDocs';
import AgendaGPT from './components/AgendaGPT';
import { api } from './api';
import Calendar from './components/Calendar';
import ChatWidget from './components/ChatWidget';
import { LayoutDashboard, Inbox as InboxIcon, Users, Book, Calendar as CalIcon, Folder, Menu, X } from 'lucide-react';

function App() {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        { to: "/", icon: <LayoutDashboard size={18} />, label: "Tableros" },
        { to: "/inbox", icon: <InboxIcon size={18} />, label: "Buzón" },
        { to: "/rrhh", icon: <Users size={18} />, label: "Equip" },
        { to: "/calendar", icon: <CalIcon size={18} />, label: "Calendario" },
        { to: "/docs", icon: <Folder size={18} />, label: "Docs" },
    ];

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
                        <nav className="flex flex-col gap-2">
                            {navLinks.map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-orange-50 hover:text-brand-orange transition-all group"
                                >
                                    <span className="text-gray-400 group-hover:text-brand-orange transition-colors">
                                        {link.icon}
                                    </span>
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Members Filter (Vertical) */}
                    <div className="flex-1 flex flex-col min-h-0 border-t border-gray-100 pt-8">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membres de l'Equip</p>
                            <button onClick={clearFilters} className="text-[10px] font-bold text-brand-orange hover:underline">Tots</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 no-scrollbar">
                            {users.map(u => {
                                const isSelected = selectedUsers.includes(u.id);
                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => toggleUserFilter(u.id)}
                                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border
                                            ${isSelected
                                                ? 'bg-orange-50 border-brand-orange shadow-sm'
                                                : 'bg-white border-transparent hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0
                                            ${u.id === 'montse' ? 'bg-brand-orange shadow-lg shadow-orange-500/20' : 'bg-gray-400'}`}>
                                            {u.avatar || u.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold leading-none mb-1 truncate ${isSelected ? 'text-brand-orange' : 'text-gray-700'}`}>{u.name}</p>
                                            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{u.role || 'MIP'}</p>
                                        </div>
                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

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
                            <Route path="/calendar" element={<Calendar selectedUsers={selectedUsers} />} />
                            <Route path="*" element={<Dashboard selectedUsers={selectedUsers} />} />
                        </Routes>
                    </div>
                    <ChatWidget currentUser={currentUser} />
                </main>
            </div>
        </Router>
    );
}

export default App;
