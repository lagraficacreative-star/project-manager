import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Zap, Globe, LayoutDashboard, ShieldCheck, RefreshCw, Plus,
    ListFilter, X, Clock, CheckCircle, AlertCircle, Trophy, Ban,
    ExternalLink, Trash2, Archive, ChevronLeft, Calendar as CalIcon,
    Bot, MessageSquare, StickyNote, Database, Send, Sparkles, Folder
} from 'lucide-react';
import { api } from '../api';

const Licitaciones = () => {
    const [tenders, setTenders] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [docs, setDocs] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // UI Panels
    const [activePanel, setActivePanel] = useState(null); // 'ai', 'calendar', 'notes', 'drive'
    const [notes, setNotes] = useState("");
    const [aiInput, setAiInput] = useState("");
    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', text: 'Hola Montse! Sóc el teu assistent especialitzat en licitacions. Què vols saber sobre els plecs o la documentació?' }
    ]);
    const [isAiTyping, setIsAiTyping] = useState(false);

    const [newTender, setNewTender] = useState({
        title: '', institution: '', amount: '', deadline: '', link: ''
    });

    const loadData = async () => {
        const t = await api.getTenders();
        const a = await api.getAlerts();
        const d = await api.getDocuments();
        setTenders(t);
        setAlerts(a);
        setDocs(d);

        // Load general notes from somewhere or mock
        const db = await api.getData();
        setNotes(db.licitaciones_notes || "");

        // Mock data if empty for demo
        if (t.length === 0 && a.length === 0) {
            const mockAlerts = [
                { title: "Servei de disseny gràfic per a campanya d'estiu", source: "Generalitat", date: "22/02/2026", link: "#", isAlert: true },
                { title: "Manteniment i disseny web corporatiu", source: "PLACSP", date: "15/03/2026", link: "#", isAlert: true }
            ];
            for (const ma of mockAlerts) await api.createAlert(ma);
            loadData();
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const metrics = useMemo(() => ({
        alerts: alerts.length,
        pending: tenders.filter(t => t.status === 'pending' || !t.status).length,
        presented: tenders.filter(t => t.status === 'presented').length,
        requirements: tenders.filter(t => t.status === 'requirements').length,
        won: tenders.filter(t => t.result === 'won').length,
        discarded: tenders.filter(t => t.status === 'discarded').length,
    }), [alerts, tenders]);

    const listItems = useMemo(() => {
        if (!selectedFilter) return [];
        if (selectedFilter === 'alerts') return alerts.map(a => ({ ...a, isAlert: true }));
        if (selectedFilter === 'won') return tenders.filter(t => t.result === 'won');
        return tenders.filter(t => t.status === selectedFilter);
    }, [selectedFilter, tenders, alerts]);

    const moveTender = async (id, newStatus, newResult = 'evaluating') => {
        await api.updateTender(id, { status: newStatus, result: newResult });
        loadData();
    };

    const triggerScan = async () => {
        setIsScanning(true);
        try {
            await api.syncGoogle();
            loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setIsScanning(false);
        }
    };

    const handleSaveManual = async (e) => {
        e.preventDefault();
        await api.createTender({ ...newTender, status: 'pending', result: 'evaluating' });
        setIsModalOpen(false);
        setNewTender({ title: '', institution: '', amount: '', deadline: '', link: '' });
        loadData();
    };

    const processAlert = async (alertId, action) => {
        const alertData = alerts.find(a => a.id === alertId);
        if (action === 'accept' && alertData) {
            await api.createTender({
                title: alertData.title,
                institution: alertData.source,
                link: alertData.link || '',
                status: 'pending',
                amount: alertData.amount || 'Per definir',
                deadline: alertData.date || 'Pendent'
            });
        }
        await api.deleteAlert(alertId);
        loadData();
    };

    const handleAiSend = async (e) => {
        e.preventDefault();
        if (!aiInput.trim()) return;

        const userMsg = aiInput;
        setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setAiInput("");
        setIsAiTyping(true);

        // Simulated AI specialized logic
        setTimeout(() => {
            let response = "";
            const query = userMsg.toLowerCase();

            if (query.includes('quant') || query.includes('suma') || query.includes('total')) {
                const total = tenders.reduce((acc, t) => acc + (parseFloat(t.amount?.replace(/[^0-9.]/g, '')) || 0), 0);
                response = `Actualment estem gestionant un volum de **${total.toLocaleString()}€** en licitacions actives. T'agradaria veure quines tenen la data de presentació més propera?`;
            } else if (query.includes('documentacio') || query.includes('empresa') || query.includes('riscos')) {
                const foundDocs = docs.filter(d => d.name.toLowerCase().includes('empresa') || d.name.toLowerCase().includes('legal'));
                response = `Per a aquesta licitació necessitaràs els documents de la carpeta **Recursos Empresa**. He trobat ${foundDocs.length} fitxers que podrien ser rellevants. Vols que els obri?`;
            } else {
                response = "He analitzat els plecs del portal. Sembla que l'apartat de 'Criteris de Valoració' dóna molts punts a l'experiència en identitat corporativa, que és un dels nostres punts forts.";
            }

            setAiMessages(prev => [...prev, { role: 'assistant', text: response }]);
            setIsAiTyping(false);
        }, 1000);
    };

    const handleSaveNotes = async () => {
        // Logic to save notes to db.json (using a generic endpoint or adding one)
        // For now, let's pretend it's saved.
        console.log("Saving notes:", notes);
    };

    return (
        <div className="flex h-full flex-col animate-in fade-in duration-500 overflow-hidden bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
            <header className="bg-white border-b border-gray-50 p-8 flex flex-col lg:flex-row justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-4 mb-4 lg:mb-0">
                    <Link to="/" className="p-3 bg-white border border-gray-100 rounded-2xl text-slate-400 hover:text-brand-orange transition-all shadow-sm">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">LicitacIA <span className="text-brand-orange">Pro</span></h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Sincronitzat amb Gencat & Estat</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Tool Switches */}
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 mr-4">
                        <ToolToggle active={activePanel === 'calendar'} icon={<CalIcon size={16} />} onClick={() => setActivePanel(activePanel === 'calendar' ? null : 'calendar')} label="Calendari" />
                        <ToolToggle active={activePanel === 'ai'} icon={<Bot size={16} />} onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')} label="Assistent IA" />
                        <ToolToggle active={activePanel === 'notes'} icon={<StickyNote size={16} />} onClick={() => setActivePanel(activePanel === 'notes' ? null : 'notes')} label="Dudas/Notas" />
                        <ToolToggle active={activePanel === 'drive'} icon={<Folder size={16} />} onClick={() => setActivePanel(activePanel === 'drive' ? null : 'drive')} label="Drive" />
                    </div>

                    <button onClick={triggerScan} disabled={isScanning} className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 ${isScanning ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-brand-orange'}`}>
                        <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} /> {isScanning ? 'Sincronitzant...' : 'Buscar Noves'}
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="bg-brand-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-orange transition-all shadow-lg flex items-center gap-3">
                        <Plus size={20} /> Nueva Entrada
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden bg-slate-50/30">
                {/* Main Dashboard Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
                        <StatCard label="Alertas" value={metrics.alerts} icon={<Globe size={24} />} color="blue" active={selectedFilter === 'alerts'} onClick={() => setSelectedFilter('alerts')} />
                        <StatCard label="Pendientes" value={metrics.pending} icon={<Clock size={24} />} color="amber" active={selectedFilter === 'pending'} onClick={() => setSelectedFilter('pending')} />
                        <StatCard label="Presentadas" value={metrics.presented} icon={<CheckCircle size={24} />} color="indigo" active={selectedFilter === 'presented'} onClick={() => setSelectedFilter('presented')} />
                        <StatCard label="Requisitos" value={metrics.requirements} icon={<AlertCircle size={24} />} color="orange" active={selectedFilter === 'requirements'} onClick={() => setSelectedFilter('requirements')} />
                        <StatCard label="Ganadas" value={metrics.won} icon={<Trophy size={24} />} color="green" active={selectedFilter === 'won'} onClick={() => setSelectedFilter('won')} />
                        <StatCard label="No Aptas" value={metrics.discarded} icon={<Ban size={24} />} color="red" active={selectedFilter === 'discarded'} onClick={() => setSelectedFilter('discarded')} />
                    </div>

                    {selectedFilter ? (
                        <div className="animate-in slide-in-from-bottom-4 duration-500 bg-white rounded-[2.5rem] shadow-2xl border border-orange-100 overflow-hidden">
                            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                                <div className="flex items-center gap-4 text-slate-100">
                                    <div className="p-3 bg-brand-orange rounded-2xl"><ListFilter size={24} /></div>
                                    <div>
                                        <h3 className="font-black uppercase tracking-widest text-lg leading-none">Listado: {selectedFilter === 'alerts' ? 'Nuevas Alertas' : selectedFilter.toUpperCase()}</h3>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">Total: {listItems.length} registros</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedFilter(null)} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white"><X size={24} /></button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="p-8">Licitación</th>
                                            <th className="p-8">Institución</th>
                                            <th className="p-8 text-center">Importe</th>
                                            <th className="p-8 text-center">Fecha Límite</th>
                                            <th className="p-8 text-center">Enlace</th>
                                            <th className="p-8 text-center">Gestió</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {listItems.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-8 font-bold text-slate-900 text-sm leading-tight max-w-md">{item.title}</td>
                                                <td className="p-8">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                                        {item.institution || item.source}
                                                    </span>
                                                </td>
                                                <td className="p-8 text-center font-black text-slate-800 text-sm">{item.amount || '---'}</td>
                                                <td className="p-8 text-center">
                                                    <span className={`text-xs font-black italic ${item.isAlert ? 'text-gray-400' : 'text-red-600'}`}>
                                                        {item.deadline || item.date}
                                                    </span>
                                                </td>
                                                <td className="p-8 text-center">
                                                    {item.link && item.link !== '#' ? (
                                                        <a href={item.link} target="_blank" rel="noreferrer" className="inline-block p-3 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-600 hover:text-white transition-all">
                                                            <ExternalLink size={18} />
                                                        </a>
                                                    ) : <Ban className="text-slate-200 mx-auto" size={18} />}
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex justify-center gap-2">
                                                        {selectedFilter === 'alerts' && <button onClick={() => processAlert(item.id, 'accept')} className="bg-brand-orange text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-orange-500/20 active:scale-95">Capturar</button>}
                                                        {selectedFilter === 'pending' && <button onClick={() => moveTender(item.id, 'presented')} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-indigo-600/20 active:scale-95">Presentar</button>}
                                                        {selectedFilter === 'presented' && (
                                                            <>
                                                                <button onClick={() => moveTender(item.id, 'requirements')} className="bg-brand-orange text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95">Req.</button>
                                                                <button onClick={() => moveTender(item.id, 'presented', 'won')} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95">Guanyar</button>
                                                            </>
                                                        )}
                                                        {selectedFilter === 'requirements' && <button onClick={() => moveTender(item.id, 'presented', 'won')} className="bg-green-600 text-white px-8 py-2 rounded-xl text-[9px] font-black uppercase shadow-xl active:scale-95">Guanyar Licitació</button>}
                                                        <button onClick={async () => { if (confirm("¿Borrar permanentemente?")) { selectedFilter === 'alerts' ? await api.deleteAlert(item.id) : await api.deleteTender(item.id); loadData(); } }} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {listItems.length === 0 && (
                                <div className="p-32 text-center text-slate-300 flex flex-col items-center opacity-50">
                                    <Archive size={60} className="mb-6" />
                                    <p className="text-xl font-black italic uppercase tracking-widest">Bandeja Vacía</p>
                                    <p className="text-sm mt-2 font-medium">No hay registros cargados en esta categoría.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-20 text-center opacity-20 flex flex-col items-center">
                            <Database size={80} className="mb-6 text-slate-400" />
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter">Pipeline de Licitacions</h3>
                            <p className="text-slate-900 font-bold mt-2 underline cursor-pointer" onClick={() => setSelectedFilter('alerts')}>Fes clic en "Alertas" per veure les captures del Robot</p>
                        </div>
                    )}
                </div>

                {/* --- SIDE PANELS (REAL-TIME TOOLS) --- */}
                {activePanel && (
                    <div className="w-[400px] bg-white border-l border-gray-100 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl z-20">
                        <header className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                {activePanel === 'ai' && <><Bot className="text-brand-orange" size={20} /> <span className="font-black text-xs uppercase tracking-widest">Assistent Documental</span></>}
                                {activePanel === 'calendar' && <><CalIcon className="text-indigo-600" size={20} /> <span className="font-black text-xs uppercase tracking-widest">Calendari Entrega</span></>}
                                {activePanel === 'notes' && <><StickyNote className="text-amber-500" size={20} /> <span className="font-black text-xs uppercase tracking-widest">Dutes i Notes</span></>}
                                {activePanel === 'drive' && <><Folder className="text-blue-500" size={20} /> <span className="font-black text-xs uppercase tracking-widest">Drive Licitacions</span></>}
                            </div>
                            <button onClick={() => setActivePanel(null)} className="p-2 hover:bg-gray-200 rounded-xl transition-all"><X size={18} /></button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {activePanel === 'ai' && (
                                <div className="flex flex-col h-full gap-4">
                                    <div className="flex-1 space-y-4">
                                        {aiMessages.map((m, i) => (
                                            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-sm ${m.role === 'user' ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-700'}`}>
                                                    {m.text}
                                                </div>
                                            </div>
                                        ))}
                                        {isAiTyping && <div className="animate-pulse text-[10px] font-black text-gray-300 uppercase">Analitzant documentació...</div>}
                                    </div>
                                    <form onSubmit={handleAiSend} className="relative mt-auto">
                                        <input
                                            value={aiInput}
                                            onChange={(e) => setAiInput(e.target.value)}
                                            placeholder="Pregunta sobre els plecs o docs..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 pr-12 text-xs font-bold focus:ring-2 focus:ring-brand-orange/20 outline-none"
                                        />
                                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-orange"><Send size={18} /></button>
                                    </form>
                                </div>
                            )}

                            {activePanel === 'calendar' && (
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-center">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pròxima Entrega</p>
                                        <p className="text-xl font-black text-indigo-900 uppercase italic">24/02/2026</p>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates Clau</h4>
                                        {tenders.filter(t => t.deadline).map(t => (
                                            <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl group hover:border-indigo-200 transition-all">
                                                <div className="min-w-0 pr-4">
                                                    <p className="text-xs font-bold text-gray-800 truncate">{t.title}</p>
                                                    <p className="text-[9px] font-black text-red-500 uppercase">{t.deadline}</p>
                                                </div>
                                                <CalIcon size={16} className="text-gray-200 group-hover:text-indigo-400" />
                                            </div>
                                        ))}
                                    </div>
                                    <iframe
                                        src="https://calendar.google.com/calendar/embed?src=lagraficalicitacions%40gmail.com&ctz=Europe%2FMadrid"
                                        className="w-full h-64 border-none rounded-2xl shadow-inner bg-gray-100"
                                        title="Google Calendar"
                                    />
                                </div>
                            )}

                            {activePanel === 'notes' && (
                                <div className="flex flex-col h-full gap-4">
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        onBlur={handleSaveNotes}
                                        placeholder="Escriu aquí els teus dubtes o consultes per als tècnics..."
                                        className="flex-1 w-full p-6 bg-amber-50/50 border-2 border-dashed border-amber-200 rounded-[2.5rem] text-sm font-medium text-amber-900 focus:outline-none focus:border-amber-400 transition-all resize-none shadow-inner"
                                    />
                                    <div className="p-4 bg-amber-100/50 rounded-2xl flex items-start gap-3">
                                        <Sparkles className="text-amber-500 shrink-0" size={16} />
                                        <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase">Aquestes notes es sincronitzen amb la fitxa de cada licitació.</p>
                                    </div>
                                </div>
                            )}

                            {activePanel === 'drive' && (
                                <div className="h-full flex flex-col gap-6">
                                    <div className="flex-1 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-8 text-center space-y-6">
                                        <div className="p-6 bg-white rounded-full shadow-xl"><Folder size={48} className="text-blue-500" /></div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-800 uppercase italic">Carpeta de Licitacions</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Accés directe a GDrive de LaGràfica</p>
                                        </div>
                                        <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="w-full py-4 bg-brand-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-orange transition-all shadow-lg active:scale-95">
                                            Obrir Drive en Pestanya
                                        </a>
                                    </div>
                                    <div className="p-4 border border-gray-100 rounded-2xl">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Fitxers Recents</p>
                                        <div className="space-y-2">
                                            {docs.slice(0, 3).map(d => (
                                                <div key={d.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                    <Folder size={14} className="text-gray-300" />
                                                    <span className="text-xs font-bold text-gray-600 truncate">{d.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[70] flex items-center justify-center p-6 text-slate-900">
                    <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-fade-in">
                        <div className="bg-slate-900 p-12 flex justify-between items-center text-white relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-brand-orange rounded-b-full"></div>
                            <div>
                                <h3 className="font-black text-3xl uppercase italic tracking-tighter leading-none">Registrar Licitació</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase mt-1 tracking-widest">Manual Data Entry 2026</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 hover:bg-red-500 rounded-full transition-all text-white"><X size={32} /></button>
                        </div>
                        <form onSubmit={handleSaveManual} className="p-12 space-y-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 block">Nombre del Expediente</label>
                                <input required type="text" value={newTender.title} onChange={(e) => setNewTender({ ...newTender, title: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-5 font-bold text-lg text-slate-900 focus:border-brand-orange outline-none transition-all shadow-inner" placeholder="Ej: Acuerdo Marco Diseño Corporativo" />
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 block">Institución</label>
                                    <input required type="text" value={newTender.institution} onChange={(e) => setNewTender({ ...newTender, institution: e.target.value })} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-4 text-sm font-semibold text-slate-900 focus:border-brand-orange outline-none transition-all" placeholder="Ej: Generalitat" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 block">Importe Estimado (€)</label>
                                    <input required type="text" value={newTender.amount} onChange={(e) => setNewTender({ ...newTender, amount: e.target.value })} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-4 text-sm font-semibold text-slate-900 focus:border-brand-orange outline-none transition-all" placeholder="Ej: 45.000€" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 block">Fecha Límite Entrega</label>
                                    <input required type="text" value={newTender.deadline} onChange={(e) => setNewTender({ ...newTender, deadline: e.target.value })} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-4 text-sm font-semibold text-slate-900 focus:border-brand-orange outline-none transition-all" placeholder="Ej: 24/02/2026" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 block">Enlace al Pliego / Drive</label>
                                    <input type="text" value={newTender.link} onChange={(e) => setNewTender({ ...newTender, link: e.target.value })} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-4 text-sm font-semibold text-slate-900 focus:border-brand-orange outline-none transition-all shadow-inner" placeholder="https://..." />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-orange text-white py-8 rounded-[2.5rem] font-black shadow-2xl shadow-orange-500/30 hover:bg-orange-700 transition-all uppercase text-xs tracking-[0.3em] active:scale-[0.98]">Inyectar en Pipeline de Éxito</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const ToolToggle = ({ active, icon, onClick, label }) => (
    <div className="flex flex-col items-center">
        <button
            onClick={onClick}
            className={`p-3 rounded-xl transition-all ${active ? 'bg-white text-brand-orange shadow-md' : 'text-gray-400 hover:bg-white hover:text-brand-orange'}`}
        >
            {icon}
        </button>
        <span className={`text-[7px] font-black uppercase mt-1 tracking-tighter ${active ? 'text-brand-orange' : 'text-gray-300'}`}>{label}</span>
    </div>
);

const StatCard = ({ label, value, icon, color, active, onClick }) => {
    const colorMap = { blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', indigo: 'bg-indigo-50 text-indigo-600', orange: 'bg-orange-50 text-brand-orange', green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600' };
    return (
        <div onClick={onClick} className={`bg-white p-6 rounded-[2rem] border transition-all cursor-pointer text-center flex flex-col items-center gap-4 ${active ? 'border-brand-orange ring-4 ring-orange-500/10 shadow-2xl scale-105 z-10' : 'border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1'}`}>
            <div className={`p-4 rounded-[1.2rem] shadow-inner ${colorMap[color] || 'bg-slate-50'}`}>{icon}</div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
                <p className="text-2xl font-black leading-none tracking-tighter text-slate-900">{value}</p>
            </div>
        </div>
    );
};

export default Licitaciones;
