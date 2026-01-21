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
import { LayoutDashboard, Inbox as InboxIcon, Users, Book, Calendar as CalIcon, Folder } from 'lucide-react';

function App() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        api.getUsers().then(data => setUsers(data || [])).catch(console.error);
    }, []);

    // Assume current user is Montse for now (simulated session)
    const currentUser = users.find(u => u.id === 'montse') || { name: 'Montse', id: 'montse' };

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
                            <Link to="/calendar" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-orange transition-colors">
                                <CalIcon size={18} /> Calendario
                            </Link>
                            <Link to="/docs" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-orange transition-colors">
                                <Folder size={18} /> Docs
                            </Link>
                        </nav>

                    </div>
                </header>

                <main className="p-6 flex-1 overflow-auto relative">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/board/:boardId" element={<Board />} />
                        <Route path="/inbox" element={<Inbox />} />
                        <Route path="/rrhh" element={<HRManagement />} />
                        <Route path="/docs" element={<CompanyDocs />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="*" element={<Dashboard />} />
                    </Routes>

                    <ChatWidget currentUser={currentUser} />
                </main>
            </div>
        </Router>
    );
}

export default App;
