import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Send, Search, Phone, Mail, MapPin, Bot, User } from 'lucide-react';
import { api } from '../api';
import MemberFilter from './MemberFilter';

const AgendaGPT = () => {
    const [messages, setMessages] = useState([
        { id: 1, role: 'assistant', text: 'Hola! Sóc el teu assistent de contactes de LaGràfica. Vols saber el telèfon o correu d\'algun client o proveïdor?' }
    ]);
    const [input, setInput] = useState('');
    const [contacts, setContacts] = useState([]); // Mock contacts database
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]); // Filter State

    // Load "Contacts" (Users + Mock Clients)
    useEffect(() => {
        // In a real app, this would fetch from a CRM
        const loadContacts = async () => {
            const usersData = await api.getUsers();
            setUsers(usersData || []);
            const mockClients = [
                { id: 'client_paeria', name: 'Ajuntament de Lleida', email: 'contacte@paeria.cat', phone: '973 700 300', tag: 'Client' },
                { id: 'client_animac', name: 'Animac', email: 'info@animac.cat', phone: '973 700 325', tag: 'Client' },
                { id: 'client_fira', name: 'Fira de Lleida', email: 'fira@firalleida.com', phone: '973 70 50 00', tag: 'Client' },
            ];
            // Normalize internal users
            const team = usersData.map(u => ({ id: u.id, name: u.name, email: `${u.id}@lagrafica.com`, phone: 'Intern', tag: 'Equip' }));
            setContacts([...team, ...mockClients]);
        };
        loadContacts();
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Simple RAG / Search Logic
        setTimeout(() => {
            const lowerInput = input.toLowerCase();
            const found = contacts.filter(c => c.name.toLowerCase().includes(lowerInput));

            let responseText = '';
            if (found.length > 0) {
                responseText = `He trobat ${found.length} contacte(s):\n` + found.map(c => `• **${c.name}** (${c.tag}): ${c.email} | ${c.phone}`).join('\n');
            } else if (lowerInput.includes('hola') || lowerInput.includes('dia')) {
                responseText = "Bon dia! Com et puc ajudar avui?";
            } else {
                responseText = "Em sap greu, no he trobat cap contacte amb aquest nom. Prova amb 'Ajuntament' o 'Montse'.";
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: responseText }]);
        }, 800);
    };

    return (
        <div className="min-h-[calc(100vh-80px)] p-6 flex flex-col gap-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                        <ChevronLeft size={16} /> Tornar
                    </Link>
                    <h1 className="text-2xl font-bold text-brand-black uppercase flex items-center gap-2">
                        <Bot className="text-brand-orange" /> Agenda IA
                    </h1>
                </div>
            </div>

            <MemberFilter
                users={users}
                selectedUsers={selectedUsers}
                onToggleUser={(id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id])}
                onClear={() => setSelectedUsers([])}
            />

            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex overflow-hidden">
                {/* Sidebar (Contacts List) */}
                <div className="w-1/3 border-r border-gray-100 p-6 flex flex-col hidden md:flex">
                    <h3 className="font-bold text-gray-400 uppercase tracking-wider text-xs mb-4">Contactes Recents</h3>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none" placeholder="Filtrar..." />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {contacts
                            .filter(c => selectedUsers.length === 0 || (c.tag === 'Equip' && selectedUsers.includes(c.id)))
                            .map((c, i) => (
                                <div key={i} className="p-3 bg-white border border-gray-100 rounded-xl hover:border-brand-orange/30 cursor-pointer transition-colors group">
                                    <h4 className="font-bold text-sm text-gray-800 group-hover:text-brand-orange">{c.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                        <span className={`px-1.5 py-0.5 rounded-md ${c.tag === 'Equip' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{c.tag}</span>
                                        {c.email}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-gray-50/50">
                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-brand-orange text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                                    {msg.role === 'assistant' && <Bot size={16} className="mb-2 text-brand-orange" />}
                                    <p className="text-sm whitespace-pre-line">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
                        <div className="relative flex items-center gap-2">
                            <input
                                className="flex-1 p-4 pr-12 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all shadow-inner"
                                placeholder="Pregunta per un contacte (ex: 'telefon de Animac')..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" disabled={!input.trim()} className="absolute right-2 p-2 bg-brand-orange text-white rounded-xl shadow-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AgendaGPT;
