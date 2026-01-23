import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Send, Search, Phone, Mail, Bot, Upload, Plus, X, Trash2, Edit2 } from 'lucide-react';
import { api } from '../api';

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const AgendaGPT = ({ selectedUsers, currentUser }) => {
    const { filterType } = useParams();
    const [messages, setMessages] = useState([
        { id: 1, role: 'assistant', text: '¡Hola! Soy tu asistente de contactos de LaGràfica. ¿Quieres saber el teléfono o correo de algún cliente o proveedor?' }
    ]);
    const [input, setInput] = useState('');
    const [contacts, setContacts] = useState([]);
    const [activeTab, setActiveTab] = useState('ia');
    const [filter, setFilter] = useState('');
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', tag: 'Cliente' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (filterType) {
            setActiveTab('list');
        }
    }, [filterType]);

    const loadAllContacts = async () => {
        try {
            const usersData = await api.getUsers();
            const dbContacts = await api.getContacts();

            const mockClients = [
                { id: 'client_paeria', name: 'Ajuntament de Lleida', email: 'contacte@paeria.cat', phone: '973 700 300', tag: 'Cliente' },
                { id: 'client_animac', name: 'Animac', email: 'info@animac.cat', phone: '973 700 325', tag: 'Cliente' }
            ];
            const mockSuppliers = [
                { id: 'sup_nominalia', name: 'Nominalia', email: 'soporte@nominalia.com', phone: '93 288 40 62', tag: 'Proveedor' }
            ];
            const team = usersData.map(u => ({ id: u.id, name: u.name, email: `${u.id}@lagrafica.com`, phone: 'Interno', tag: 'Equipo' }));

            setContacts([...team, ...mockClients, ...mockSuppliers, ...dbContacts]);
        } catch (err) {
            console.error("Failed to load contacts", err);
        }
    };

    useEffect(() => {
        loadAllContacts();
    }, []);

    const handleOpenAdd = () => {
        setEditingContact(null);
        setFormData({ name: '', email: '', phone: '', tag: 'Cliente' });
        setShowModal(true);
    };

    const handleOpenEdit = (contact, e) => {
        if (e) e.stopPropagation();
        if (contact.id.toString().startsWith('client_') || contact.id.toString().startsWith('sup_')) {
            alert("Este contacto es de muestra y no se puede editar.");
            return;
        }
        setEditingContact(contact);
        setFormData({
            name: contact.name,
            email: contact.email || '',
            phone: contact.phone || '',
            tag: contact.tag || 'Cliente'
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name) return;
        setIsSaving(true);
        try {
            if (editingContact) {
                await api.updateContact(editingContact.id, formData);
            } else {
                await api.createContact(formData);
            }
            await loadAllContacts();
            setShowModal(false);
            setFormData({ name: '', email: '', phone: '', tag: 'Cliente' });
        } catch (error) {
            console.error("Error saving contact", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteContact = async (id, name, e) => {
        if (e) e.stopPropagation();
        if (id.toString().startsWith('client_') || id.toString().startsWith('sup_')) {
            alert("Este contacto es de muestra y no se puede borrar.");
            return;
        }
        if (!confirm(`¿Seguro que quieres borrar el contacto "${name}"?`)) return;
        try {
            await api.deleteContact(id);
            await loadAllContacts();
        } catch (err) {
            alert("Error al borrar contacto");
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages([...messages, { id: Date.now(), role: 'user', text: userMsg }]);
        setInput('');

        setTimeout(() => {
            const found = contacts.filter(c =>
                c.name.toLowerCase().includes(userMsg.toLowerCase()) ||
                (c.tag && c.tag.toLowerCase().includes(userMsg.toLowerCase()))
            );

            let reply = "";
            if (found.length > 0) {
                reply = `He encontrado **${found.length} contactos**:\n\n` +
                    found.slice(0, 3).map(c => `• **${c.name}** (${c.tag}): ${c.phone || 'Sin tel'} / ${c.email || 'Sin mail'}`).join('\n') +
                    (found.length > 3 ? `\n...y ${found.length - 3} más.` : '');
            } else {
                reply = "Lo siento, no he encontrado ningún contacto con ese nombre o categoría. Prueba con otro nombre o revisa la lista completa.";
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply }]);
        }, 600);
    };

    const filteredContacts = contacts.filter(c => {
        const matchesType = !filterType ||
            (filterType === 'clients' && c.tag === 'Cliente') ||
            (filterType === 'suppliers' && c.tag === 'Proveedor');

        const matchesSearch = c.name.toLowerCase().includes(filter.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(filter.toLowerCase()));

        const matchesLetter = !selectedLetter || c.name.toUpperCase().startsWith(selectedLetter);

        return matchesType && matchesSearch && matchesLetter;
    });

    return (
        <div className="flex flex-col gap-8 pb-10 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-brand-black tracking-tighter uppercase leading-none">Mi <span className="text-brand-orange">Agenda</span></h2>
                    <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Contactos & Inteligencia</h1>
                </div>
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                    <button
                        onClick={() => setActiveTab('ia')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'ia' ? 'bg-brand-black text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Asistente IA
                    </button>
                    <button
                        onClick={() => { setActiveTab('list'); setSelectedLetter(null); }}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'list' ? 'bg-brand-black text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Lista de Contactos
                    </button>
                </div>
            </div>

            {activeTab === 'ia' ? (
                <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100 flex flex-col h-[600px]">
                    <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2 custom-scrollbar">
                        {messages.map(m => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-4 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center shadow-lg ${m.role === 'user' ? 'bg-brand-black text-white' : 'bg-brand-orange text-white'}`}>
                                        {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                    </div>
                                    <div className={`p-5 rounded-3xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-gray-100 text-gray-800 rounded-tr-none' : 'bg-white border border-gray-100 shadow-sm rounded-tl-none'}`}>
                                        <p className="whitespace-pre-wrap">{m.text}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleSend} className="relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Busca un contacto o pide información..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] py-5 px-8 outline-none focus:ring-4 focus:ring-brand-orange/10 focus:bg-white placeholder:text-gray-400 text-sm font-medium transition-all shadow-inner"
                        />
                        <button type="submit" className="absolute right-3 top-3 bottom-3 bg-brand-orange text-white px-8 rounded-2xl hover:bg-orange-600 transition-all font-black text-xs tracking-widest uppercase shadow-lg shadow-orange-500/20 active:scale-95">
                            CONSULTAR
                        </button>
                    </form>
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
                                placeholder="Buscar por nombre o correo..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-orange/10 outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={handleOpenAdd}
                            className="bg-brand-black text-white px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-brand-orange transition-all flex items-center gap-2 shadow-lg shadow-black/10"
                        >
                            <Plus size={16} /> AÑADIR CONTACTO
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-1">
                        <button
                            onClick={() => setSelectedLetter(null)}
                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${!selectedLetter ? 'bg-brand-orange text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
                        >
                            TOTS
                        </button>
                        {alphabet.map(l => (
                            <button
                                key={l}
                                onClick={() => setSelectedLetter(l)}
                                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${selectedLetter === l ? 'bg-brand-orange text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:border-brand-orange/30'}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredContacts.map(contact => (
                            <div key={contact.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-brand-orange/20 transition-all group relative">
                                <span className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${contact.tag === 'Cliente' ? 'bg-blue-50 text-blue-600' :
                                        contact.tag === 'Proveedor' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                    {contact.tag}
                                </span>
                                <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center font-black text-gray-300 text-xl mb-4 group-hover:bg-orange-50 group-hover:text-brand-orange transition-colors">
                                    {contact.name[0]}
                                </div>
                                <h3 className="text-lg font-black text-brand-black mb-4 truncate">{contact.name}</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <Mail size={14} className="text-gray-300" />
                                        <span className="truncate">{contact.email || 'No disponible'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <Phone size={14} className="text-gray-300" />
                                        <span>{contact.phone || 'No disponible'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-6 pt-6 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={(e) => handleOpenEdit(contact, e)} className="flex-1 py-3 bg-gray-50 hover:bg-orange-50 text-gray-400 hover:text-brand-orange rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Editar</button>
                                    <button onClick={(e) => handleDeleteContact(contact.id, contact.name, e)} className="p-3 text-gray-300 hover:text-red-500 rounded-xl transition-all"><Trash2 size={16} /></button>
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
                            <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-sm">
                                {editingContact ? <Edit2 size={18} /> : <Plus size={18} />}
                                {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-white/60 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-orange/20 outline-none font-bold text-sm"
                                    placeholder="Nombre del contacto..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-orange/20 outline-none font-bold text-sm"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Teléfono</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-orange/20 outline-none font-bold text-sm"
                                    placeholder="600 000 000"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoría</label>
                                <div className="flex gap-2">
                                    {['Cliente', 'Proveedor'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, tag: t })}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.tag === t ? 'bg-brand-orange text-white border-brand-orange shadow-lg shadow-orange-500/20' : 'bg-white text-gray-400 border-gray-100'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-brand-black text-white font-black py-4 rounded-2xl hover:bg-brand-orange transition-all shadow-xl uppercase tracking-[0.2em] text-xs mt-4 disabled:opacity-50"
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Contacto'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AgendaGPT;
