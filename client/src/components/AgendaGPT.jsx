import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Send, Search, Phone, Mail, Bot, Upload, Plus, X, Trash2, Edit2 } from 'lucide-react';
import { api } from '../api';

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const AgendaGPT = ({ selectedUsers }) => {
    const { filterType } = useParams();
    const [messages, setMessages] = useState([
        { id: 1, role: 'assistant', text: 'Hola! Sóc el teu assistent de contactes de LaGràfica. Vols saber el telèfon o correu d\'algun client o proveïdor?' }
    ]);
    const [input, setInput] = useState('');
    const [contacts, setContacts] = useState([]);
    const [activeTab, setActiveTab] = useState('ia'); // 'ia' or 'list'
    const [filter, setFilter] = useState('');
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', tag: 'Client' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (filterType) {
            setActiveTab('list');
        }
    }, [filterType]);

    const loadAllContacts = async () => {
        const usersData = await api.getUsers();
        const dbContacts = await api.getContacts();

        const mockClients = [
            { id: 'client_paeria', name: 'Ajuntament de Lleida', email: 'contacte@paeria.cat', phone: '973 700 300', tag: 'Client' },
            { id: 'client_animac', name: 'Animac', email: 'info@animac.cat', phone: '973 700 325', tag: 'Client' }
        ];
        const mockSuppliers = [
            { id: 'sup_nominalia', name: 'Nominalia', email: 'soporte@nominalia.com', phone: '93 288 40 62', tag: 'Proveïdor' }
        ];
        const team = usersData.map(u => ({ id: u.id, name: u.name, email: `${u.id}@lagrafica.com`, phone: 'Intern', tag: 'Equip' }));

        setContacts([...team, ...mockClients, ...mockSuppliers, ...dbContacts]);
    };

    useEffect(() => {
        loadAllContacts();
    }, []);

    const handleOpenAdd = () => {
        setEditingContact(null);
        setFormData({ name: '', email: '', phone: '', tag: 'Client' });
        setShowModal(true);
    };

    const handleOpenEdit = (contact, e) => {
        if (e) e.stopPropagation();
        if (contact.id.toString().startsWith('client_') || contact.id.toString().startsWith('sup_')) {
            alert("Aquest contacte és de mostra i no es pot editar.");
            return;
        }
        setEditingContact(contact);
        setFormData({
            name: contact.name,
            email: contact.email || '',
            phone: contact.phone || '',
            tag: contact.tag || 'Client'
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
            setFormData({ name: '', email: '', phone: '', tag: 'Client' });
        } catch (error) {
            console.error("Error saving contact", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteContact = async (id, name, e) => {
        if (e) e.stopPropagation();
        if (id.toString().startsWith('client_') || id.toString().startsWith('sup_')) {
            alert("Aquest contacte és de mostra i no es pot esborrar.");
            return;
        }
        if (!confirm(`Segur que vols esborrar el contacte "${name}"?`)) return;
        try {
            await api.deleteContact(id);
            await loadAllContacts();
        } catch (error) {
            console.error("Error deleting contact", error);
        }
    };

    const handleImportB2Brouter = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const imported = lines.slice(1).filter(l => l.trim()).map(line => {
                const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const contact = {};
                headers.forEach((h, i) => { contact[h] = values[i]; });
                return {
                    name: contact['Nombre'] || contact['Name'] || contact['Razon Social'] || values[0],
                    email: contact['Email'] || contact['Correo'] || values[1] || '',
                    phone: contact['Teléfono'] || contact['Phone'] || values[2] || '',
                    tag: 'Client'
                };
            });
            if (imported.length > 0) {
                const result = await api.importContacts(imported);
                if (result.success) {
                    alert(`S'han importat ${result.count} clients correctament.`);
                    loadAllContacts();
                }
            }
        };
        reader.readAsText(file);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const userText = input.trim();
        if (!userText) return;

        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);
        setInput('');

        setTimeout(() => {
            const lowerInput = userText.toLowerCase();

            let found = [];
            if (lowerInput.includes('email') || lowerInput.includes('correo') || lowerInput.includes('mail')) {
                const namePart = lowerInput.replace(/email|correo|mail|de|la|el/g, '').trim();
                found = contacts.filter(c => c.name.toLowerCase().includes(namePart) && c.email);
            } else if (lowerInput.includes('tel') || lowerInput.includes('telefon') || lowerInput.includes('llamar')) {
                const namePart = lowerInput.replace(/tel|telefon|telefono|llamar|el|de/g, '').trim();
                found = contacts.filter(c => c.name.toLowerCase().includes(namePart) && c.phone);
            } else {
                found = contacts.filter(c => c.name.toLowerCase().includes(lowerInput));
            }

            let responseText = '';
            if (found.length > 0) {
                responseText = `He trobat ${found.length} contacte(s):\n\n` +
                    found.map(c => `👤 **${c.name}**\n📧 ${c.email || 'N/A'}\n📞 ${c.phone || 'N/A'}\n🏷️ ${c.tag}`).join('\n\n---\n\n');
            } else {
                responseText = "Em sap greu, no he trobat cap contacte que coincideixi. Prova de preguntar pel nom del client o proveïdor.";
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: responseText }]);
        }, 600);
    };

    const getFilteredContacts = () => {
        let list = [...contacts];

        list.sort((a, b) => a.name.localeCompare(b.name));

        if (filterType === 'clients') list = list.filter(c => c.tag && c.tag.includes('Client'));
        if (filterType === 'suppliers') list = list.filter(c => c.tag && c.tag.includes('Proveïdor'));

        if (filter) {
            const f = filter.toLowerCase();
            list = list.filter(c => c.name.toLowerCase().includes(f) || (c.email && c.email.toLowerCase().includes(f)));
        }

        if (selectedLetter) {
            list = list.filter(c => c.name.trim()[0].toUpperCase() === selectedLetter);
        }

        return list;
    };

    const activeContacts = getFilteredContacts();

    return (
        <div className="h-[calc(100vh-80px)] p-4 md:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400 hover:text-brand-orange transition-all">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                            <Bot className="text-brand-orange" size={24} /> Agenda Intel·ligent
                        </h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestió de Contactes i IA</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                    >
                        <Plus size={16} /> Nou Contacte
                    </button>
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
                        <Upload size={14} /> Importar B2B
                        <input type="file" accept=".csv" className="hidden" onChange={handleImportB2Brouter} />
                    </label>
                </div>
            </header>

            <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden relative">
                <div className={`w-full md:w-2/3 flex flex-col border-r border-gray-50 ${activeTab === 'ia' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Contactes ({activeContacts.length})</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setActiveTab('ia')} className="md:hidden px-4 py-2 bg-brand-orange/10 text-brand-orange rounded-lg text-[10px] font-black uppercase tracking-widest">Anar a Assistent</button>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-brand-orange/10 focus:border-brand-orange/20 transition-all"
                                placeholder="Buscar per nom o empresa..."
                                value={filter}
                                onChange={(e) => {
                                    setFilter(e.target.value);
                                    if (e.target.value) setSelectedLetter(null);
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-1 items-center justify-center py-2 bg-white/50 rounded-2xl border border-gray-100/50">
                            <button
                                onClick={() => setSelectedLetter(null)}
                                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${!selectedLetter ? 'bg-brand-black text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                            >TOTS</button>
                            {alphabet.map(letter => (
                                <button
                                    key={letter}
                                    onClick={() => {
                                        setSelectedLetter(letter === selectedLetter ? null : letter);
                                        setFilter('');
                                    }}
                                    className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${selectedLetter === letter ? 'bg-brand-orange text-white' : 'text-gray-400 hover:bg-orange-50 hover:text-brand-orange'}`}
                                >
                                    {letter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeContacts.map((c, i) => (
                                <div key={i} className="bg-white border border-gray-100 p-5 rounded-3xl hover:border-brand-orange/30 hover:shadow-xl transition-all group relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 rounded-full opacity-10 group-hover:opacity-20 transition-opacity 
                                        ${c.tag === 'Equip' ? 'bg-purple-500' : c.tag?.includes('Proveïdor') ? 'bg-green-500' : 'bg-blue-500'}`} />

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md
                                            ${c.tag === 'Equip' ? 'bg-purple-500' : c.tag?.includes('Proveïdor') ? 'bg-green-500' : 'bg-blue-500'}`}>
                                            {c.name[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0 pr-12">
                                            <h4 className="font-black text-gray-800 text-sm truncate uppercase tracking-tight group-hover:text-brand-orange transition-colors">{c.name}</h4>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">{c.tag}</span>
                                        </div>

                                        {c.tag !== 'Equip' && (
                                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={(e) => handleOpenEdit(c, e)}
                                                    className="p-2 text-gray-300 hover:text-brand-orange hover:bg-orange-50 rounded-xl"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteContact(c.id, c.name, e)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {c.email && (
                                            <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-[11px] font-bold text-gray-400 hover:text-brand-orange transition-colors">
                                                <Mail size={12} className="shrink-0" /> <span className="truncate">{c.email}</span>
                                            </a>
                                        )}
                                        {c.phone && (
                                            <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-[11px] font-bold text-gray-400 hover:text-brand-orange transition-colors">
                                                <Phone size={12} className="shrink-0" /> {c.phone}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={`w-full md:w-1/3 flex flex-col bg-gray-50/30 ${activeTab !== 'ia' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-gray-50 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-brand-orange/10 flex items-center justify-center">
                                <Bot size={18} className="text-brand-orange" />
                            </div>
                            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Assistent IA</h3>
                        </div>
                        <button onClick={() => setActiveTab('list')} className="md:hidden p-2 text-brand-orange hover:bg-orange-50 rounded-xl transition-all">
                            <ChevronLeft size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm text-sm font-bold leading-relaxed
                                    ${msg.role === 'user' ? 'bg-brand-orange text-white rounded-tr-none' : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'}
                                `}>
                                    <p className="whitespace-pre-line">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
                        <div className="relative flex items-center gap-2">
                            <input
                                className="flex-1 pl-4 pr-12 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all"
                                placeholder="Busca per nom o demana un telèfon..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button type="submit" disabled={!input.trim()} className="absolute right-1 p-2 bg-brand-orange text-white rounded-xl shadow-md hover:bg-orange-600 disabled:opacity-30 transition-all">
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal: Add/Edit Contact */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                                    {editingContact ? 'Editar Contacte' : 'Nou Contacte'}
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Dades de l'agenda</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tipus</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, tag: 'Client' })}
                                        className={`py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all ${formData.tag === 'Client' ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}
                                    >CLIENT</button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, tag: 'Proveïdor' })}
                                        className={`py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all ${formData.tag === 'Proveïdor' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}
                                    >PROVEÏDOR</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nom / Empresa</label>
                                <input
                                    className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-brand-orange/10 focus:border-brand-orange/20 transition-all"
                                    placeholder="Ex: Paeria de Lleida"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Correu</label>
                                    <input
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-brand-orange/10 transition-all"
                                        placeholder="email@exemple.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Telèfon</label>
                                    <input
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-brand-orange/10 transition-all"
                                        placeholder="600 000 000"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving || !formData.name}
                                    className="w-full py-5 bg-brand-orange text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-orange-600 shadow-xl shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? 'Guardant...' : 'GUARDAR CANVIS'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaGPT;
