import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { Search, Plus, Mail, Phone, MapPin, Globe, Trash2, Edit2, X, Briefcase, ChevronRight, MessageSquare, Send, Sparkles, User, Tag, FileText, LayoutDashboard, Table, Book, Bot } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const AgendaGPT = ({ currentUser, setSelectedClient }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Data states
    const [contacts, setContacts] = useState([]);
    const [filter, setFilter] = useState('');
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // list or chat

    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', address: '', tag: 'Referencia', company: '', notes: ''
    });

    // AI Chat states
    const [aiInput, setAiInput] = useState('');
    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', text: 'Hola! Sóc el teu assistent de l\'Orden del Día. Puc ajudar-te a trobar qualsevol contacte o consultar què estan fent els membres de l\'equip. Què busques?' }
    ]);
    const [isAiTyping, setIsAiTyping] = useState(false);

    useEffect(() => {
        loadContacts();
        const params = new URLSearchParams(location.search);
        const query = params.get('q');
        if (query) {
            setViewMode('chat');
            setAiInput(query);
            // Auto-trigger handlesend after mount if query present
        }
    }, [location]);

    const loadContacts = async () => {
        try {
            const data = await api.getContacts();
            setContacts(data || []);
        } catch (error) { }
    };

    const handleOpenAdd = () => {
        setEditingContact(null);
        setFormData({ name: '', email: '', phone: '', address: '', tag: 'Referencia', company: '', notes: '' });
        setShowModal(true);
    };

    const handleOpenEdit = (contact, e) => {
        e.stopPropagation();
        setEditingContact(contact);
        setFormData(contact);
        setShowModal(true);
    };

    const handleDeleteContact = async (id, name, e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar contacto ${name}?`)) {
            await api.deleteContact(id);
            loadContacts();
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingContact) {
                await api.updateContact(editingContact.id, formData);
            } else {
                await api.createContact(formData);
            }
            setShowModal(false);
            loadContacts();
        } catch (error) { }
    };

    const handleAiSend = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!aiInput.trim()) return;

        const userMsg = aiInput;
        setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setAiInput('');
        setIsAiTyping(true);

        try {
            const lowerInput = userMsg.toLowerCase();
            const db = await api.getData();
            const users = await api.getUsers();
            let response = "";

            if (lowerInput.includes('suma') || lowerInput.includes('total') || lowerInput.includes('cuanto') || lowerInput.includes('presupuesto') || lowerInput.includes('facturaci') || lowerInput.includes('balance') || lowerInput.includes('cuenta') || lowerInput.includes('dinero') || lowerInput.includes('€') || lowerInput.includes('pago')) {
                response = "Ho sento, com a assistent general no tinc permís per accedir a dades de facturació, pressupostos o moviments econòmics. Per a això has d'entrar a la secció de Gestió.";
            }
            else if (lowerInput.includes('hola') || lowerInput.includes('bon dia')) {
                response = "Hola! Com puc ajudar-te avui amb l'Orden del Día?";
            }
            else if (lowerInput.includes('que fa') || lowerInput.includes('treball de') || lowerInput.includes('tasques de')) {
                const foundUser = users.find(u => lowerInput.includes(u.name.toLowerCase()));
                if (foundUser) {
                    const userCards = (db.cards || []).filter(c => c.responsibleId === foundUser.id && !c.columnId?.includes('done'));
                    if (userCards.length > 0) {
                        response = `**${foundUser.name}** té **${userCards.length} tasques** actives ara mateix:\n\n` +
                            userCards.slice(0, 5).map(c => `• ${c.title}`).join('\n');
                    } else {
                        response = `**${foundUser.name}** no sembla tenir feines pendents en aquest moment. Acció completada!`;
                    }
                } else {
                    response = "De quin membre de l'equip vols consultar la feina? (Neus, Montse, Omar, Alba...)";
                }
            }
            else {
                const query = lowerInput.replace(/busca|qui es|troba|el contacte de/g, '').trim();
                const found = contacts.filter(c => c.name.toLowerCase().includes(query) || (c.company && c.company.toLowerCase().includes(query)));
                if (found.length > 0) {
                    response = `He trobat ${found.length} contactes:\n\n` +
                        found.slice(0, 3).map(c => `**${c.name}** (${c.company || 'Particular'})\n📧 ${c.email || 'N/A'}\n📞 ${c.phone || 'N/A'}`).join('\n\n');
                } else {
                    response = `No he trobat cap contacte que coincideixi amb "${query}". Vols que l'afegeixi jo mateix?`;
                }
            }

            setTimeout(() => {
                setAiMessages(prev => [...prev, { role: 'assistant', text: response }]);
                setIsAiTyping(false);
            }, 800);
        } catch (err) {
            setIsAiTyping(false);
        }
    };

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const filteredContacts = contacts.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(filter.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(filter.toLowerCase())) ||
            (c.company && c.company.toLowerCase().includes(filter.toLowerCase()));
        const matchesLetter = !selectedLetter || c.name.toUpperCase().startsWith(selectedLetter);
        return matchesSearch && matchesLetter;
    }).sort((a, b) => a.name.localeCompare(b.name));

    const handleFilterProjects = (clientName) => {
        setSelectedClient(clientName);
        navigate('/');
    };

    const handleClientReport = async (clientName) => {
        if (!confirm(`¿Generar reporte en Google Sheets para el cliente ${clientName}?`)) return;
        try {
            const res = await api.exportToSheets();
            if (res.success) alert(`Reporte para ${clientName} iniciado en Google Sheets.`);
        } catch (err) { alert("Error al conectar con Google Sheets"); }
    };

    return (
        <div className="flex flex-col h-full gap-8">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-1">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-brand-orange">
                        <Book size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-brand-black tracking-tighter uppercase leading-none">Orden del Día</h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Agenda de Contactos Clientes & Proveedores</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Listado
                    </button>
                    <button
                        onClick={() => setViewMode('chat')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'chat' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Asistente IA
                    </button>
                </div>
            </header>

            {viewMode === 'chat' ? (
                <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-[500px]">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 leading-none mb-1">Agenda Inteligente</h3>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Encuentra cualquier contacto o histórico</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                        {aiMessages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[80%] shadow-sm ${m.role === 'user' ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-700'}`}>
                                    <p className="whitespace-pre-line">{m.text}</p>
                                </div>
                            </div>
                        ))}
                        {isAiTyping && (
                            <div className="flex gap-1 p-2">
                                <div className="w-1 h-1 bg-brand-orange/40 rounded-full animate-bounce" />
                                <div className="w-1 h-1 bg-brand-orange/40 rounded-full animate-bounce delay-100" />
                                <div className="w-1 h-1 bg-brand-orange/40 rounded-full animate-bounce delay-200" />
                            </div>
                        )}
                    </div>

                    <div className="p-8 border-t border-gray-50 bg-white">
                        <form onSubmit={handleAiSend} className="max-w-4xl mx-auto relative group">
                            <input
                                type="text"
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder="Escribe tu búsqueda aquí... (ej: Que tareas tiene Neus?)"
                                className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[2rem] text-sm font-bold outline-none focus:ring-2 focus:ring-brand-orange/20 pr-20 transition-all group-hover:bg-white group-hover:shadow-xl"
                            />
                            <button type="submit" className="absolute right-4 top-4 bottom-4 bg-brand-orange text-white w-12 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="Buscar por nombre, correo o empresa..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-orange/10 outline-none transition-all"
                            />
                        </div>
                        <button onClick={handleOpenAdd} className="bg-brand-black text-white px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-brand-orange transition-all flex items-center gap-2 shadow-lg shadow-black/10">
                            <Plus size={16} /> AÑADIR CONTACTO
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-1">
                        <button onClick={() => setSelectedLetter(null)} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${!selectedLetter ? 'bg-brand-orange text-white shadow-lg shadow-orange-500/20' : 'bg-white text-gray-400 border border-gray-100'}`}>TOTS</button>
                        {alphabet.map(l => (
                            <button key={l} onClick={() => setSelectedLetter(l)} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${selectedLetter === l ? 'bg-brand-orange text-white shadow-lg shadow-orange-500/20' : 'bg-white text-gray-400 border border-gray-100 hover:border-brand-orange/30'}`}>{l}</button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredContacts.map(contact => (
                            <div key={contact.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:border-brand-orange/30 transition-all group relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-[2.5rem] flex items-center justify-center transition-colors group-hover:bg-brand-orange/5`}><User className="text-gray-200 group-hover:text-brand-orange/20" size={32} /></div>
                                <span className={`inline-block mb-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${contact.tag === 'Cliente' ? 'bg-blue-50 text-blue-600 border border-blue-100' : contact.tag === 'Proveedor' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>{contact.tag}</span>
                                <h3 className="text-xl font-black text-gray-800 mb-1 group-hover:text-brand-orange transition-colors truncate pr-16">{contact.name}</h3>
                                {contact.company && <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{contact.company}</p>}
                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500"><div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white shadow-sm transition-all"><Mail size={14} className="text-gray-300" /></div><span className="truncate">{contact.email || 'No disponible'}</span></div>
                                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500"><div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white shadow-sm transition-all"><Phone size={14} className="text-gray-300" /></div><span>{contact.phone || 'No disponible'}</span></div>
                                </div>
                                {contact.tag === 'Cliente' && (
                                    <div className="flex flex-col gap-2 pt-6 mb-6 border-t border-gray-50">
                                        <button onClick={() => handleFilterProjects(contact.name)} className="flex items-center justify-between px-4 py-3 bg-blue-50/50 hover:bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Ver Proyectos <LayoutDashboard size={14} /></button>
                                        <button onClick={() => handleClientReport(contact.name)} className="flex items-center justify-between px-4 py-3 bg-green-50/50 hover:bg-green-50 text-green-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Informe Sheets <Table size={14} /></button>
                                    </div>
                                )}
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                                    <button onClick={(e) => handleOpenEdit(contact, e)} className="flex-1 py-3 bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-orange transition-all shadow-lg shadow-black/10">Editar</button>
                                    <button onClick={(e) => handleDeleteContact(contact.id, contact.name, e)} className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-black/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleSave} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-brand-black text-white">
                            <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-sm">{editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-white/60 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nombre Completo</label><input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-orange/20 outline-none font-bold text-sm" /></div>
                                <div className="col-span-2"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Empresa</label><input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-orange/20 outline-none font-bold text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Correo</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-orange/20 outline-none font-bold text-xs" /></div>
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Teléfono</label><input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-orange/20 outline-none font-bold text-xs" /></div>
                            </div>
                            <button type="submit" className="w-full bg-brand-black text-white font-black py-4 rounded-2xl hover:bg-brand-orange transition-all shadow-xl shadow-black/10 uppercase tracking-[0.2em] text-xs">{editingContact ? 'Guardar Cambios' : 'Añadir Contacto'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AgendaGPT;
