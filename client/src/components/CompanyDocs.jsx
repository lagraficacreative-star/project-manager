import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
    Folder, FileText, Upload, Plus, ChevronRight, Trash2, File,
    ArrowLeft, Save, Table, Link as LinkIcon, MessageSquare,
    ExternalLink, Globe, Send, Search, Calendar, CheckCircle,
    Circle, X, Bot, Sparkles, TrendingUp, DollarSign, Wallet, RefreshCw, Lock,
    Edit2, PlusCircle, Check, Square, Calculator, Briefcase, Gavel
} from 'lucide-react';
import FolderGrid from './FolderGrid';

const CompanyDocs = ({ selectedUsers, currentUser, isManagementUnlocked, unlockManagement, AUTHORIZED_EMAILS }) => {
    const [password, setPassword] = useState('');
    const [showError, setShowError] = useState(false);
    const [docs, setDocs] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
    const [path, setPath] = useState([{ id: null, name: 'Inici' }]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'embed'
    const [embedUrl, setEmbedUrl] = useState(null);
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('categories'); // 'categories', 'drive', 'docs'

    // Folder creation state
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const [config, setConfig] = useState({
        sections: [],
        main_drive_link: "https://drive.google.com/drive/folders/161cXkl6zy81CcDW-_c6QVgUmcuUsguHF?usp=drive_link",
        notepad: "",
        urgent_checklist: []
    });
    const [isEditingConfig, setIsEditingConfig] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const currentFolder = docs.find(d => d.id === currentFolderId);

    useEffect(() => {
        loadDocs();
        loadConfig();
    }, []);

    const loadConfig = async () => {
        const fullData = await api.getData();
        if (fullData.docs_config) {
            setConfig(fullData.docs_config);
        }
    };

    const saveConfig = async (newConfig) => {
        setIsSaving(true);
        try {
            await api.updateData({ docs_config: newConfig });
            setConfig(newConfig);
        } catch (error) {
            console.error("Failed to save config", error);
        } finally {
            setIsSaving(false);
        }
    };

    const getIcon = (iconName) => {
        const icons = { DollarSign, Table, FileText, Globe, Folder, Wallet };
        const IconComponent = icons[iconName] || FileText;
        return <IconComponent size={24} />;
    };

    const handleAddSection = () => {
        const newSection = {
            id: 'f_custom_' + Date.now(),
            label: 'Nou Apartat',
            icon: 'Folder',
            color: 'orange',
            drive_link: ''
        };
        const newSections = [...config.sections, newSection];
        saveConfig({ ...config, sections: newSections });
    };

    const handleDeleteSection = (idx) => {
        if (!confirm("Segur que vols esborrar aquest apartat?")) return;
        const newSections = config.sections.filter((_, i) => i !== idx);
        saveConfig({ ...config, sections: newSections });
    };

    const handleUpdateSection = (idx, field, value) => {
        const newSections = [...config.sections];
        newSections[idx][field] = value;
        saveConfig({ ...config, sections: newSections });
    };

    const handleUpdateNotepad = (value) => {
        setConfig(prev => ({ ...prev, notepad: value }));
        if (window.notepadTimeout) clearTimeout(window.notepadTimeout);
        window.notepadTimeout = setTimeout(() => {
            saveConfig({ ...config, notepad: value });
        }, 1000);
    };

    const handleAddCheckItem = (e) => {
        e.preventDefault();
        const text = e.target.item.value.trim();
        if (!text) return;
        const newItem = { text, completed: false };
        const newChecklist = [...config.urgent_checklist, newItem];
        saveConfig({ ...config, urgent_checklist: newChecklist });
        e.target.reset();
    };

    const handleToggleCheck = (idx) => {
        const newChecklist = [...config.urgent_checklist];
        newChecklist[idx].completed = !newChecklist[idx].completed;
        saveConfig({ ...config, urgent_checklist: newChecklist });
    };

    const handleDeleteCheckItem = (idx) => {
        const newChecklist = config.urgent_checklist.filter((_, i) => i !== idx);
        saveConfig({ ...config, urgent_checklist: newChecklist });
    };

    const loadDocs = async () => {
        setLoading(true);
        try {
            await api.syncGoogle();
            const data = await api.getDocuments();
            setDocs(data);
        } catch (error) {
            console.error("Failed to load docs", error);
        } finally {
            setLoading(false);
        }
    };

    const navigateTo = (folderId, folderName) => {
        setCurrentFolderId(folderId);
        setViewMode('grid');
        setAiResponse(null);
        if (folderId === null) {
            setPath([{ id: null, name: 'Inici' }]);
        } else {
            const existingIdx = path.findIndex(p => p.id === folderId);
            if (existingIdx >= 0) {
                setPath(path.slice(0, existingIdx + 1));
            } else {
                setPath([...path, { id: folderId, name: folderName }]);
            }
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        await api.createDocument({
            name: newFolderName,
            type: 'folder',
            parentId: currentFolderId
        });
        setShowNewFolder(false);
        setNewFolderName('');
        loadDocs();
    };

    const handleUpload = async (e) => {
        if (!e.target.files.length) return;
        const file = e.target.files[0];
        try {
            const result = await api.uploadFile(file);
            await api.createDocument({
                name: file.name,
                type: 'file',
                parentId: currentFolderId,
                url: result.url
            });
            loadDocs();
        } catch (error) {
            alert("Error al pujar fitxer");
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Segur que vols esborrar aquest element?")) return;
        await api.deleteDocument(id);
        loadDocs();
    };

    const handleAiSearch = async (e) => {
        e.preventDefault();
        if (!aiQuery.trim()) return;
        setIsAiLoading(true);
        try {
            const db = await api.getData();
            const tenders = await api.getTenders();
            const query = aiQuery.toLowerCase();

            if (query.includes('suma') || query.includes('balanç') || query.includes('total') || query.includes('presupuesto') || query.includes('facturaci')) {
                const totalTenders = tenders.reduce((acc, t) => acc + (parseFloat(t.amount?.replace(/[^0-9.]/g, '')) || 0), 0);
                const wonTenders = tenders.filter(t => t.result === 'won').reduce((acc, t) => acc + (parseFloat(t.amount?.replace(/[^0-9.]/g, '')) || 0), 0);

                const allCards = db.cards || [];
                const totalBudgets = allCards.reduce((acc, c) => acc + (parseFloat(c.economic?.budget?.replace(/[^0-9.]/g, '')) || 0), 0);
                const totalCosts = allCards.reduce((acc, c) => acc + (parseFloat(c.economic?.cost?.replace(/[^0-9.]/g, '')) || 0), 0);

                setAiResponse({
                    text: `Resum d'informació econòmica i de gestió:`,
                    stats: [
                        { label: 'Total Licitacions', value: `${totalTenders.toLocaleString()}€`, icon: <TrendingUp size={16} /> },
                        { label: 'Total Pressupostos', value: `${totalBudgets.toLocaleString()}€`, icon: <DollarSign size={16} /> },
                        { label: 'Balanç Net Est.', value: `${(totalBudgets - totalCosts).toLocaleString()}€`, icon: <Wallet size={16} /> }
                    ]
                });
            } else {
                const found = docs.filter(d => d.name.toLowerCase().includes(query) || (d.description && d.description.toLowerCase().includes(query)));
                setAiResponse({
                    text: found.length > 0
                        ? `He trobat ${found.length} documents relacionats amb la teva cerca.`
                        : `No he trobat documents específics, però pots buscar a la carpeta de 'Balanços' o 'Empresa'.`,
                    docs: found.slice(0, 3)
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAiLoading(false);
        }
    };

    const getBreadcrumbs = () => {
        const result = [];
        let current = docs.find(d => d.id === currentFolderId);
        while (current) {
            result.unshift(current);
            current = docs.find(d => d.id === current.parentId);
        }
        return result;
    };

    const getCurrentItems = () => {
        let items = docs.filter(d => d.parentId === currentFolderId);
        if (searchTerm) {
            items = items.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return items;
    };

    const handleOpenEmbed = (url) => {
        setEmbedUrl(url);
        setViewMode('embed');
    };

    const handleUnlock = (e) => {
        e.preventDefault();
        if (password === 'lagrafica2025') {
            if (!AUTHORIZED_EMAILS || !AUTHORIZED_EMAILS.includes(currentUser.email)) {
                alert("Acceso denegado: Tu usuario no tiene permisos para esta sección.");
                setPassword('');
                return;
            }
            unlockManagement(true);
        } else {
            setShowError(true);
            setTimeout(() => setShowError(false), 2000);
        }
    };

    if (!isManagementUnlocked) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-brand-orange/10 rounded-[2rem] flex items-center justify-center text-brand-orange mb-8">
                    <Lock size={40} />
                </div>
                <h2 className="text-3xl font-black text-brand-black uppercase tracking-tighter mb-4">Sección Reservada</h2>
                <p className="text-gray-400 text-sm font-medium max-w-sm mb-10 leading-relaxed">Esta sección contiene documentos sensibles de gestión. Por favor, introduce la contraseña para continuar.</p>

                <form onSubmit={handleUnlock} className="w-full max-w-sm space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña de gestión..."
                        className={`w-full px-6 py-4 bg-gray-50 border ${showError ? 'border-red-500 ring-4 ring-red-50' : 'border-gray-100 focus:ring-4 focus:ring-brand-orange/5'} rounded-2xl text-center font-bold outline-none transition-all`}
                        autoFocus
                    />
                    <button type="submit" className="w-full bg-brand-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-brand-orange transition-all active:scale-95">
                        DESBLOQUEAR ACCESO
                    </button>
                    {showError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-bounce">Contraseña incorrecta</p>}
                </form>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            {/* Header / Breadcrumbs */}
            <header className="bg-white border-b border-gray-50 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-brand-orange text-white rounded-2xl shadow-lg shadow-orange-500/20">
                            <Folder size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-brand-black uppercase tracking-tight leading-none">
                                {currentFolderId ? (currentFolder?.name || 'Carregant...') : "Gestió d'Empresa"}
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-brand-orange cursor-pointer" onClick={() => navigateTo(null)}>Inici</span>
                                {getBreadcrumbs().map((b, i) => (
                                    <React.Fragment key={b.id}>
                                        <ChevronRight size={10} className="text-gray-300" />
                                        <span className={`text-[10px] font-black uppercase tracking-widest cursor-pointer ${i === getBreadcrumbs().length - 1 ? 'text-brand-orange' : 'text-gray-400 hover:text-brand-orange'}`} onClick={() => navigateTo(b.id, b.name)}>
                                            {b.name}
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={loadDocs} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl hover:border-brand-orange font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualitzar Arxius
                    </button>
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                        <input
                            type="text"
                            placeholder="Cerca ràpida..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-brand-orange/20 transition-all"
                        />
                    </div>
                    <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-2 px-6 py-3 bg-brand-black text-white rounded-2xl hover:bg-brand-orange font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 whitespace-nowrap">
                        <Plus size={16} /> Nova Carpeta
                    </button>
                    <a href={config.main_drive_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl hover:border-brand-orange font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap">
                        <ExternalLink size={14} /> Google Drive
                    </a>
                    <button onClick={() => setIsEditingConfig(!isEditingConfig)} className={`p-3 rounded-2xl transition-all ${isEditingConfig ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-400 hover:text-brand-orange'}`}>
                        <Edit2 size={16} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Dashboard Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-50/30">

                    {/* Tabs Header */}
                    <div className="flex items-center gap-8 border-b border-gray-100 px-6 mb-8 mt-2">
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'categories' ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Categorías
                            {activeTab === 'categories' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange rounded-full animate-in fade-in slide-in-from-bottom-2 duration-300" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('drive')}
                            className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'drive' ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Carpetas Drive
                            {activeTab === 'drive' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange rounded-full animate-in fade-in slide-in-from-bottom-2 duration-300" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('docs')}
                            className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'docs' ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Documentos
                            {activeTab === 'docs' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange rounded-full animate-in fade-in slide-in-from-bottom-2 duration-300" />}
                        </button>
                    </div>

                    {activeTab === 'drive' && (
                        <div className="animate-in fade-in duration-500 min-h-[500px]">
                            <FolderGrid mode="management" customFolders={docs_config.sections} />
                        </div>
                    )}

                    {activeTab === 'categories' && (
                        <div className="space-y-10 max-w-6xl mx-auto animate-in fade-in duration-500">
                            {/* AI Search Section */}
                            <section className="bg-brand-black rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-5"><Bot size={200} /></div>
                                <div className="relative z-10 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Bot className="text-brand-orange" size={24} />
                                        <h3 className="text-lg font-black uppercase italic tracking-tighter">Assistent Documental IA</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium max-w-md italic">
                                        "Demana'm la suma de les licitacions, el balanç de l'any o busca un contracte específic."
                                    </p>
                                    <form onSubmit={handleAiSearch} className="relative max-w-2xl">
                                        <input
                                            value={aiQuery}
                                            onChange={(e) => setAiQuery(e.target.value)}
                                            className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all"
                                            placeholder="Ex: Suma de les licitacions d'aquest any..."
                                        />
                                        <button disabled={isAiLoading} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-orange rounded-xl hover:bg-orange-600 transition-all">
                                            {isAiLoading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                                        </button>
                                    </form>

                                    {aiResponse && (
                                        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-3xl animate-in slide-in-from-top-4 duration-300">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Sparkles className="text-brand-orange" size={16} />
                                                <p className="text-xs font-black uppercase text-slate-300">{aiResponse.text}</p>
                                            </div>
                                            {aiResponse.stats && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    {aiResponse.stats.map((s, i) => (
                                                        <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                            <div className="flex items-center gap-2 text-brand-orange mb-2">
                                                                {s.icon} <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                                                            </div>
                                                            <p className="text-xl font-black italic">{s.value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {aiResponse.docs && (
                                                <div className="space-y-2">
                                                    {aiResponse.docs.map(d => (
                                                        <div key={d.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer" onClick={() => navigateTo(d.parentId, d.name)}>
                                                            <span className="text-sm font-bold">{d.name}</span>
                                                            <ChevronRight size={14} className="text-white/20" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Main Categories Section */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {config.sections.map((section, idx) => (
                                    <div key={section.id} className="relative group/cat">
                                        <DocCategory
                                            label={section.label}
                                            icon={getIcon(section.icon)}
                                            color={section.color}
                                            onClick={() => section.drive_link ? window.open(section.drive_link, '_blank') : navigateTo(section.id, section.label)}
                                        />
                                        {isEditingConfig && (
                                            <div className="absolute -top-2 -right-2 flex gap-1">
                                                <button onClick={() => handleDeleteSection(idx)} className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-all"><X size={12} /></button>
                                            </div>
                                        )}
                                        {isEditingConfig && (
                                            <input
                                                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[80%] px-2 py-1 bg-white/90 border border-gray-200 rounded text-[8px] font-bold outline-none"
                                                placeholder="Link Drive..."
                                                value={section.drive_link || ''}
                                                onChange={(e) => handleUpdateSection(idx, 'drive_link', e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                                {isEditingConfig && (
                                    <button onClick={handleAddSection} className="p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-300 hover:border-brand-orange hover:text-brand-orange transition-all">
                                        <PlusCircle size={24} />
                                        <span className="text-[10px] font-black uppercase">Afegir Apartat</span>
                                    </button>
                                )}
                            </div>

                            {/* Notepad and Urgent Checklist */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <section className="md:col-span-2 bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10 flex flex-col min-h-[500px]">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-brand-black text-white rounded-2xl">
                                                <FileText size={20} />
                                            </div>
                                            <h3 className="text-lg font-black uppercase tracking-tight">Bloc de Notes (Word)</h3>
                                        </div>
                                        {isSaving && <RefreshCw size={16} className="text-brand-orange animate-spin" />}
                                    </div>
                                    <textarea
                                        className="flex-1 w-full p-8 bg-gray-50/50 rounded-[2rem] border-none outline-none text-sm font-medium leading-relaxed resize-none custom-scrollbar"
                                        placeholder="Comença a escriure les teves notes aquí..."
                                        value={config.notepad}
                                        onChange={(e) => handleUpdateNotepad(e.target.value)}
                                    />
                                </section>

                                <section className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10 flex flex-col">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 bg-red-100 text-red-500 rounded-2xl">
                                            <CheckCircle size={20} />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-tight">Notes Urgents</h3>
                                    </div>
                                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                        {config.urgent_checklist.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl group">
                                                <button onClick={() => handleToggleCheck(idx)} className="text-gray-300 hover:text-brand-orange transition-colors">
                                                    {item.completed ? <CheckCircle size={18} className="text-green-500" /> : <Square size={18} />}
                                                </button>
                                                <span className={`flex-1 text-xs font-bold ${item.completed ? 'text-gray-300 line-through' : 'text-slate-700'}`}>{item.text}</span>
                                                <button onClick={() => handleDeleteCheckItem(idx)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {config.urgent_checklist.length === 0 && <p className="text-[10px] text-gray-300 font-black uppercase text-center py-10">No hi ha notes urgents</p>}
                                    </div>
                                    <form onSubmit={handleAddCheckItem} className="mt-6 flex gap-2">
                                        <input
                                            name="item"
                                            placeholder="Nova nota urgent..."
                                            className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-brand-orange/20"
                                        />
                                        <button className="p-3 bg-brand-black text-white rounded-xl hover:bg-brand-orange transition-all"><Plus size={18} /></button>
                                    </form>
                                </section>
                            </div>
                        </div>
                    )}

                    {activeTab === 'docs' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {currentFolderId === null ? (
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black text-brand-black uppercase tracking-widest">Totes les Unitats</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {docs.filter(d => d.parentId === null && d.type === 'folder').map(folder => (
                                            <div key={folder.id} onClick={() => navigateTo(folder.id, folder.name)} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand-orange/20 transition-all cursor-pointer group">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="p-3 bg-gray-50 text-gray-400 rounded-2xl group-hover:bg-brand-orange/10 group-hover:text-brand-orange transition-all">
                                                        <Folder size={24} />
                                                    </div>
                                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Unitat</p>
                                                </div>
                                                <h4 className="font-black text-brand-black uppercase tracking-tight group-hover:text-brand-orange transition-colors">{folder.name}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold mt-2">Arxius de gestió i control</p>
                                            </div>
                                        ))}
                                        {showNewFolder && (
                                            <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-brand-orange/30 animate-pulse flex flex-col justify-center">
                                                <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} placeholder="Nom de la carpeta..." className="w-full bg-transparent border-none text-sm font-bold focus:ring-0" />
                                                <div className="flex gap-2 mt-4">
                                                    <button onClick={handleCreateFolder} className="flex-1 py-2 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase">Crear</button>
                                                    <button onClick={() => setShowNewFolder(false)} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-xl font-bold text-[10px] uppercase">No</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-8 px-2">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => navigateTo(null)} className="p-2 md:p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 text-brand-black transition-all active:scale-90">
                                                <ArrowLeft size={20} />
                                            </button>
                                            <h2 className="text-xl font-black text-brand-black uppercase tracking-tight">{currentFolder.name}</h2>
                                        </div>
                                        <div className="relative">
                                            <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <button className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-white rounded-2xl hover:bg-orange-600 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">
                                                <Upload size={16} /> Pujar Fitxer
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                                        {getCurrentItems().map(item => (
                                            <div key={item.id} className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand-orange/20 transition-all cursor-pointer relative overflow-hidden" onClick={() => item.type === 'folder' ? navigateTo(item.id, item.name) : handleOpenEmbed(item.url || '#')}>
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={`p-3 rounded-2xl transition-all ${item.type === 'folder' ? 'bg-orange-50 text-brand-orange' : 'bg-blue-50 text-blue-500'}`}>
                                                        {item.type === 'folder' ? <Folder size={20} /> : <FileText size={20} />}
                                                    </div>
                                                    <button onClick={(e) => handleDelete(item.id, e)} className="p-2 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <h4 className="font-black text-brand-black text-xs uppercase truncate mb-1">{item.name}</h4>
                                                <p className="text-[9px] text-gray-300 font-black uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar Info/Robot Area */}
                <div className="w-full md:w-80 border-l border-gray-50 p-8 space-y-8 bg-white hidden xl:block">
                    {/* Cloud Stats */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Informació del Núvol</h4>
                        <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-brand-orange shadow-sm">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Estat del Sistema</p>
                                    <p className="text-sm font-black text-brand-black uppercase">Optimitzat (IA)</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
                                    <span>Espai Drive</span>
                                    <span>45% ocupat</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-orange transition-all" style={{ width: '45%' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shared Drive Shortcut */}
                    <div className="bg-brand-black p-8 rounded-[2rem] text-white shadow-xl space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-xl"><Globe size={18} className="text-brand-orange" /></div>
                            <h4 className="text-xs font-black uppercase tracking-widest">Google Drive</h4>
                        </div>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">Accedeix a tota la documentació empresarial des d'un sol lloc.</p>
                        <a href={config.main_drive_link} target="_blank" rel="noreferrer" className="block w-full py-4 bg-brand-orange text-center rounded-2xl font-black text-xs uppercase hover:bg-white hover:text-brand-black transition-all shadow-lg active:scale-95">
                            Obrir la Carpeta
                        </a>
                    </div>
                </div>
            </div>

            {/* Embed Viewer Overlay */}
            {viewMode === 'embed' && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in zoom-in-95 duration-200">
                    <header className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewMode('grid')} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all">
                                <ArrowLeft size={24} />
                            </button>
                            <h3 className="font-black text-brand-black uppercase tracking-tight">Visualitzador de Documents</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <a href={embedUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase text-brand-orange hover:underline flex items-center gap-2">
                                Obrir en Pestanya Nova <ExternalLink size={14} />
                            </a>
                        </div>
                    </header>
                    <div className="flex-1 bg-gray-50 flex items-center justify-center">
                        <iframe
                            src={embedUrl}
                            className="w-full h-full border-none"
                            title="Visualitzador"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const DocCategory = ({ label, icon, color, onClick }) => {
    const colors = {
        green: 'bg-green-50 text-green-600 border-green-100 shadow-green-500/5',
        blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5',
        orange: 'bg-orange-50 text-brand-orange border-orange-100 shadow-orange-500/5',
        red: 'bg-red-50 text-red-600 border-red-100 shadow-red-500/5',
    };
    return (
        <div onClick={onClick} className={`p-8 rounded-[2.5rem] border flex flex-col items-center text-center gap-4 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xl ${colors[color] || colors.orange}`}>
            <div className="p-4 bg-white rounded-2xl shadow-sm">{icon}</div>
            <h4 className="text-xs font-black uppercase tracking-widest">{label}</h4>
        </div>
    );
};

export default CompanyDocs;
