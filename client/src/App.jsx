import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Board from './components/Board';
import Inbox from './components/Inbox';
import HRManagement from './components/HRManagement';
import CompanyDocs from './components/CompanyDocs';
import AgendaGPT from './components/AgendaGPT';
import { api } from './api';
import { LayoutDashboard, Inbox as InboxIcon, Users, Book } from 'lucide-react';

function App() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        api.getUsers().then(data => setUsers(data || [])).catch(console.error);
    }, []);

    return (
        <Router>
            <div className="min-h-screen bg-brand-lightgray font-sans text-brand-black flex flex-col">
                <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="text-2xl font-bold tracking-tight text-brand-black hover:text-brand-orange transition-colors">
                            Project<span className="text-brand-orange">Manager</span>
                        </Link>

                        <nav className="flex items-center gap-4 ml-4">
                            <Link to="/" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-orange transition-colors">
                                <LayoutDashboard size={18} /> Tableros
                            </Link>
                            <Link to="/inbox" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-orange transition-colors">
                                <InboxIcon size={18} /> Buzón
                            </Link>
                            <Link to="/rrhh" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-orange transition-colors">
                                <Users size={18} /> Equip
                            </Link>
                            <Link to="/agenda" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-orange transition-colors">
                                <Book size={18} /> Agenda
                            </Link>
                        </nav>

                        {/* Team Avatars Header */}
                        <div className="flex items-center gap-2 ml-6 pl-6 border-l border-gray-100 hidden lg:flex">
                            <div className="flex -space-x-2 hover:space-x-1 transition-all">
                                {users.map(u => (
                                    <div key={u.id} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm transition-transform hover:scale-110 hover:z-10 bg-white" title={u.name}>
                                        {u.avatarImage ? (
                                            <img src={u.avatarImage} alt={u.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">{u.avatar}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-6 flex-1 overflow-auto">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/board/:boardId" element={<Board />} />
                        <Route path="/inbox" element={<Inbox />} />
                        <Route path="/rrhh" element={<HRManagement />} />
                        <Route path="/docs" element={<CompanyDocs />} />
                        {/* <Route path="/agenda" element={<AgendaGPT />} /> */}
                        <Route path="*" element={<Dashboard />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
