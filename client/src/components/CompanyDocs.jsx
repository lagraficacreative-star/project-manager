import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Folder, ExternalLink, ShieldAlert, Lock, Plus, Trash2, Save, FileText, CheckSquare, Square } from 'lucide-react';

// ... (NotesBlock code remains the same, do not repeat it here if not changing)

const ChecklistBlock = () => {
    const categories = ['Empresa', 'Gestoria', 'RRHH', 'Clients', 'Pressupostos'];
    const [activeTab, setActiveTab] = useState('Empresa');
    const [checklists, setChecklists] = useState(() => {
        const saved = localStorage.getItem('companyChecklists');
        return saved ? JSON.parse(saved) : {};
    });
    const [newItem, setNewItem] = useState('');

    const handleAddItem = (e) => {
        if (e.key === 'Enter' && newItem.trim()) {
            const updated = {
                ...checklists,
                [activeTab]: [...(checklists[activeTab] || []), { id: Date.now(), text: newItem.trim(), done: false }]
            };
            setChecklists(updated);
            localStorage.setItem('companyChecklists', JSON.stringify(updated));
            setNewItem('');
        }
    };

    const toggleItem = (id) => {
        const updated = {
            ...checklists,
            [activeTab]: checklists[activeTab].map(item => item.id === id ? { ...item, done: !item.done } : item)
        };
        setChecklists(updated);
        localStorage.setItem('companyChecklists', JSON.stringify(updated));
    };

    const deleteItem = (id) => {
        const updated = {
            ...checklists,
            [activeTab]: checklists[activeTab].filter(item => item.id !== id)
        };
        setChecklists(updated);
        localStorage.setItem('companyChecklists', JSON.stringify(updated));
    };

    const items = checklists[activeTab] || [];

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-[500px]">
            <div className="flex items-center gap-2 text-gray-700 mb-6">
                <CheckSquare size={20} className="text-brand-orange" />
                <h3 className="font-bold text-sm uppercase">Checklists Operatius</h3>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeTab === cat ? 'bg-brand-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Input */}
            <input
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                placeholder={`Afegir tasca a ${activeTab}... (Enter)`}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={handleAddItem}
            />

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {items.length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-8 italic">No hi ha tasques pendents en aquest apartat.</div>
                )}
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div
                            className="flex items-center gap-3 cursor-pointer flex-1"
                            onClick={() => toggleItem(item.id)}
                        >
                            <div className={`transition-colors ${item.done ? 'text-green-500' : 'text-gray-300'}`}>
                                {item.done ? <CheckSquare size={18} /> : <Square size={18} />}
                            </div>
                            <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.text}</span>
                        </div>
                        <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};


const NotesBlock = () => {
    const [notes, setNotes] = useState(() => localStorage.getItem('companyNotes') || '');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        localStorage.setItem('companyNotes', notes);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-700">
                    <FileText size={20} className="text-brand-orange" />
                    <h3 className="font-bold text-sm uppercase">Bloc de Notes</h3>
                </div>
                <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${saved ? 'bg-green-100 text-green-700' : 'bg-brand-black text-white hover:bg-brand-orange'}`}
                >
                    <Save size={14} />
                    {saved ? 'Guardat!' : 'Guardar'}
                </button>
            </div>
            <textarea
                className="flex-1 w-full p-4 bg-yellow-50/50 rounded-xl border border-yellow-100 text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-yellow-200 resize-none"
                placeholder="Escriu aquí notes, recordatoris o informació important..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />
            <p className="text-[10px] text-gray-400 mt-2 text-center">Es guarda al navegador localment.</p>
        </div>
    );
};

const CompanyDocs = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [folders, setFolders] = useState([
        { id: 1, name: 'Fiscalidad 2026', url: 'https://drive.google.com/drive/' },
        { id: 2, name: 'Contratos Clientes', url: 'https://drive.google.com/drive/' },
        { id: 3, name: 'Recursos Humanos', url: 'https://drive.google.com/drive/' },
    ]);
    const [newFolder, setNewFolder] = useState({ name: '', url: '' });
    const [isAdding, setIsAdding] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'admin123') { // Simple mock password
            setIsAuthenticated(true);
        } else {
            alert('Contrasenya incorrecta');
        }
    };

    const handleAddFolder = (e) => {
        e.preventDefault();
        if (newFolder.name && newFolder.url) {
            setFolders([...folders, { id: Date.now(), ...newFolder }]);
            setNewFolder({ name: '', url: '' });
            setIsAdding(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-brand-lightgray flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-brand-black rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Accés Restringit</h1>
                    <p className="text-gray-500 mb-6 text-sm">Aquesta àrea conté documentació sensible de l'empresa.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            placeholder="Contrasenya d'accés"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange text-center tracking-widest"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="w-full bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors">
                            ACCEDIR
                        </button>
                    </form>
                    <Link to="/" className="block mt-6 text-sm text-gray-400 hover:text-brand-black">Tornar al Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-lightgray p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                            <ChevronLeft size={16} /> Tornar
                        </Link>
                        <h1 className="text-2xl font-bold text-brand-black uppercase">Documentació Empresa</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: FOLDERS */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-700">Carpetes i Arxius</h2>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg hover:shadow-xl transition-all"
                            >
                                <Plus size={16} /> Nova Carpeta
                            </button>
                        </div>

                        {isAdding && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 animate-in fade-in slide-in-from-top-4">
                                <h3 className="text-sm font-bold uppercase text-gray-500 mb-4">Afegir Nova Carpeta</h3>
                                <form onSubmit={handleAddFolder} className="flex gap-4">
                                    <input
                                        className="flex-1 p-3 border border-gray-200 rounded-lg text-sm"
                                        placeholder="Nom de la carpeta (ex: Factures 2026)"
                                        value={newFolder.name}
                                        onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                                        autoFocus
                                    />
                                    <input
                                        className="flex-1 p-3 border border-gray-200 rounded-lg text-sm"
                                        placeholder="Enllaç a Google Drive / Dropbox"
                                        value={newFolder.url}
                                        onChange={(e) => setNewFolder({ ...newFolder, url: e.target.value })}
                                    />
                                    <button type="submit" className="bg-brand-orange text-white px-6 font-bold rounded-lg hover:bg-orange-600">Guardar</button>
                                    <button type="button" onClick={() => setIsAdding(false)} className="text-gray-400 px-4 hover:text-gray-600">Cancelar</button>
                                </form>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {folders.map(folder => (
                                <div key={folder.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-orange/30 transition-all group relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                                            <Folder size={24} />
                                        </div>
                                        <a
                                            href={folder.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-gray-300 hover:text-brand-orange hover:bg-orange-50 rounded-lg transition-colors"
                                        >
                                            <ExternalLink size={20} />
                                        </a>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">{folder.name}</h3>
                                    <p className="text-xs text-gray-400">Enllaç extern segur</p>

                                    <button
                                        onClick={() => setFolders(folders.filter(f => f.id !== folder.id))}
                                        className="absolute bottom-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}

                        </div>
                    </div>

                    {/* Checklists Section */}
                    <div className="mt-8">
                        <ChecklistBlock />
                    </div>
                </div>

                {/* RIGHT COLUMN: TOOLS */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <h2 className="text-lg font-bold text-gray-700">Eines de Gestió</h2>

                    {/* Management Chat Widget */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 min-h-[250px] flex flex-col relative group">
                        <div className="bg-white p-4 border-b border-gray-100 flex items-center gap-3 z-10">
                            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Google_Chat_icon_%282020%29.svg/1024px-Google_Chat_icon_%282020%29.svg.png" alt="GC" className="w-5 h-5" />
                            </div>
                            <h2 className="text-sm font-bold text-gray-800">Xat de Gestió</h2>
                        </div>
                        <div className="absolute inset-0 pt-16 px-4 space-y-3 opacity-30 pointer-events-none bg-gray-50">
                            <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                                <div className="bg-white p-2 rounded-lg w-32 h-8"></div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <div className="bg-blue-100 p-2 rounded-lg w-40 h-10"></div>
                                <div className="w-6 h-6 rounded-full bg-blue-200"></div>
                            </div>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pt-10 bg-white/60 backdrop-blur-[2px] transition-all group-hover:bg-white/40">
                            <button
                                onClick={() => window.open('https://chat.google.com', 'GestioChat', 'width=600,height=700,menubar=no,toolbar=no,location=no,status=no')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-xl hover:shadow-blue-500/30 flex items-center gap-2 transform hover:scale-105"
                            >
                                <ExternalLink size={18} />
                                Obrir Xat Gestió
                            </button>
                        </div>
                    </div>

                    {/* Notes Block */}
                    <NotesBlock />
                </div>
            </div>
        </div>
    );
};

export default CompanyDocs;
