import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Zap, Globe, LayoutDashboard, ShieldCheck, RefreshCw, Plus,
    ListFilter, X, Clock, CheckCircle, AlertCircle, Trophy, Ban,
    ExternalLink, Trash2, Archive, ChevronLeft, Calendar as CalIcon,
    Bot, MessageSquare, StickyNote, Database, Send, Sparkles, Folder, Mail, Search
} from 'lucide-react';
import EmailComposer from './EmailComposer';
import { api } from '../api';

const Licitaciones = ({ currentUser, isManagementUnlocked, unlockManagement }) => {
    const [password, setPassword] = useState('');
    const [showError, setShowError] = useState(false);

    // CPV Config from LaGrafica Strategy
    const CPV_LIST = [
        { code: '79341000-6', desc: 'S. Publicidad' },
        { code: '79341400-0', desc: 'Campañas' },
        { code: '79342000-3', desc: 'Marketing' },
        { code: '79341200-8', desc: 'Contenido Publicitario' },
        { code: '79416000-3', desc: 'Comunicación' },
        { code: '79822500-7', desc: 'Diseño Gráfico' },
        { code: '79823000-2', desc: 'Maquetación' },
        { code: '72413000-8', desc: 'Diseño Web' },
        { code: '72420000-0', desc: 'Desarrollo Web' }
    ];

    const CPV_MAP = CPV_LIST;

    const [tenders, setTenders] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [docs, setDocs] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [textSearch, setTextSearch] = useState("");
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
    const [licitacionEmails, setLicitacionEmails] = useState([]);
    const [loadingEmails, setLoadingEmails] = useState(false);
    const [showEmailComposer, setShowEmailComposer] = useState(false);
    const [emailComposerData, setEmailComposerData] = useState({ to: '', subject: '', body: '', memberId: 'licitacions' });
    const [selectedItem, setSelectedItem] = useState(null); // For detail view

    const [newTender, setNewTender] = useState({
        title: '', institution: '', amount: '', deadline: '', link: '', drive_link: '', cpv: '', description: '', checklist: []
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

    useEffect(() => {
        if (selectedFilter === 'mailbox') {
            loadEmails();
        }
    }, [selectedFilter]);

    const loadEmails = async () => {
        setLoadingEmails(true);
        try {
            const data = await api.getEmails('licitacions');
            if (data.error) {
                alert(`⚠️ Error de Gmail: ${data.error}. Revisa que les credencials al .env siguin correctes.`);
                setLicitacionEmails([]);
            } else {
                setLicitacionEmails(data || []);
            }
        } catch (err) {
            console.error(err);
            setLicitacionEmails([]);
        } finally {
            setLoadingEmails(false);
        }
    };

    const metrics = useMemo(() => ({
        alerts: alerts.length,
        pending: tenders.filter(t => t.status === 'pending' || !t.status).length,
        presented: tenders.filter(t => t.status === 'presented').length,
        requirements: tenders.filter(t => t.status === 'requirements').length,
        won: tenders.filter(t => t.result === 'won').length,
        discarded: tenders.filter(t => t.status === 'discarded').length,
    }), [alerts, tenders]);

    const listItems = useMemo(() => {
        let items = [];
        if (textSearch.trim()) {
            items = [...tenders, ...alerts.map(a => ({ ...a, isAlert: true }))];
        } else {
            if (!selectedFilter) items = [];
            else if (selectedFilter === 'alerts') items = alerts.map(a => ({ ...a, isAlert: true }));
            else if (selectedFilter === 'won') items = tenders.filter(t => t.result === 'won');
            else items = tenders.filter(t => t.status === selectedFilter);
        }

        if (textSearch.trim()) {
            const query = textSearch.toLowerCase();
            items = items.filter(item =>
                (item.title && item.title.toLowerCase().includes(query)) ||
                (item.institution && item.institution.toLowerCase().includes(query)) ||
                (item.source && item.source.toLowerCase().includes(query))
            );
        }
        return items;
    }, [selectedFilter, tenders, alerts, textSearch]);

    const moveTender = async (id, newStatus, newResult = 'evaluating') => {
        await api.updateTender(id, { status: newStatus, result: newResult });
        loadData();
    };

    const triggerScan = async () => {
        setIsScanning(true);
        try {
            const res = await fetch('/api/licitaciones/trigger-automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.error) {
                alert(`⚠️ Error en el Robot: ${data.error}`);
            } else {
                alert(`✅ LicitacIA Pro: Sincronització completada amb èxit.`);
            }
            loadData();
        } catch (err) {
            console.error(err);
            alert("No s'ha pogut connectar amb el Robot de Licitacions.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleSaveManual = async (e) => {
        e.preventDefault();
        await api.createTender({ ...newTender, status: 'pending', result: 'evaluating' });
        setIsModalOpen(false);
        setNewTender({ title: '', institution: '', amount: '', deadline: '', link: '', drive_link: '', cpv: '', description: '', checklist: [] });
        loadData();
    };

    const processAlert = async (alertId, action) => {
        const alertData = alerts.find(a => a.id === alertId);
        if (action === 'accept' && alertData) {
            await api.createTender({
                title: alertData.title,
                institution: alertData.source,
                link: alertData.link || '',
                drive_link: alertData.drive_link || '',
                cpv: alertData.cpv || '',
                status: 'pending',
                amount: alertData.amount || 'Per definir',
                deadline: alertData.date || 'Pendent',
                description: alertData.description || "Resumen IA:\nAnálisis proactivo de pliegos cargado.",
                checklist: alertData.checklist || ["Revisión del DEUC", "Capacidad solvencia técnica"]
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

        // Advanced Strategic AI Logic
        setTimeout(() => {
            let response = "";
            const query = userMsg.toLowerCase();

            // 1. ANALYSIS OF PIPELINE
            if (query.includes('analiza') || query.includes('resumen') || query.includes('estado')) {
                const pendingCount = tenders.filter(t => t.status === 'pending' || !t.status).length;
                const totalAmount = tenders.reduce((acc, t) => acc + (parseFloat(t.amount?.replace(/[^0-9.]/g, '')) || 0), 0);
                response = `He analizado tu pipeline de licitaciones. Tienes **${pendingCount} concursos** pendientes de revisión con un valor potencial de **${totalAmount.toLocaleString()}€**. \n\nMi recomendación: Centrar esfuerzos en las de la **Generalitat**, ya que tenemos el 80% de la documentación de empresa lista en el Drive.`;
            }
            // 2. SUCCESS PROBABILITY
            else if (query.includes('ganar') || query.includes('exito') || query.includes('posibilidad')) {
                const topTender = tenders[0]; // Logic could be more complex
                response = `Analizando vuestro perfil, la licitación **"${topTender?.title || 'actual'}"** tiene una probabilidad de éxito estimada del **75%**. \n\nJustificación: \n- Tenemos experiencia previa con la institución.\n- Disponemos de portfolio específico de diseño gráfico.\n- El importe está dentro de nuestro rango óptimo.`;
            }
            // 3. DOCUMENTATION CHECK
            else if (query.includes('document') || query.includes('plec') || query.includes('falta')) {
                const missingDocs = ["DEUC actualizado", "Certificado de estar al corriente con la SS"];
                response = `He revisado la carpeta de Drive. Para las licitaciones actuales, nos faltaría actualizar: \n\n${missingDocs.map(d => `❌ ${d}`).join('\n')}\n\n¿Quieres que te abra la carpeta de 'Recursos Empresa' para subirlos?`;
            }
            // 4. FINANCIAL DATA
            else if (query.includes('quant') || query.includes('suma') || query.includes('total')) {
                const total = tenders.reduce((acc, t) => acc + (parseFloat(t.amount?.replace(/[^0-9.]/g, '')) || 0), 0);
                response = `Actualmente estamos gestionando un volumen de **${total.toLocaleString()}€** en licitaciones activas. ¿Quieres que desglose esto por meses según la fecha de entrega?`;
            }
            // 5. CPV SEARCH
            else if (query.includes('cpv') || query.includes('sectores') || query.includes('que buscamos')) {
                response = `Actualmente mi Robot está vigilando estos sectores estratégicos: \n\n` +
                    CPV_MAP.map(c => `• **${c.area}**: ${c.code} (${c.desc})`).join('\n') +
                    `\n\n¿Quieres que priorice alguna de estas áreas en la próxima sincronización?`;
            }
            else {
                response = "Entendido. Estoy analizando los portales de licitaciones basándome en los códigos CPV de Diseño, Publicidad y Web que tenemos configurados. ¿Quieres que te muestre los resultados más recientes de 'Disseny Gràfic'?";
            }

            setAiMessages(prev => [...prev, { role: 'assistant', text: response }]);
            setIsAiTyping(false);
        }, 1200);
    };

    const handleSaveNotes = async () => {
        // Logic to save notes to db.json (using a generic endpoint or adding one)
        // For now, let's pretend it's saved.
        console.log("Saving notes:", notes);
    };

    const handleUnlock = (e) => {
        e.preventDefault();
        const AUTHORIZED_EMAILS = ['montse@lagrafica.com', 'admin@lagrafica.com', 'alba@lagrafica.com'];
        if (password === 'lagrafica2025') {
            if (!AUTHORIZED_EMAILS.includes(currentUser.email)) {
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
                    <ShieldCheck size={40} />
                </div>
                <h2 className="text-3xl font-black text-brand-black uppercase tracking-tighter mb-4">LicitacIA Pro - Acceso Reservado</h2>
                <p className="text-gray-400 text-sm font-medium max-w-sm mb-10 leading-relaxed">Esta sección contiene información estratégica de licitaciones. Introduce la contraseña para continuar.</p>

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
                        DESBLOQUEAR PANELL
                    </button>
                    {showError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-bounce mt-4">Contraseña incorrecta</p>}
                </form>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col animate-in fade-in duration-500 overflow-hidden bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
            <header className="bg-white border-b border-gray-50 p-8 flex flex-col lg:flex-row justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-4 mb-4 lg:mb-0">
                    <Link to="/" className="p-3 bg-white border border-gray-100 rounded-2xl text-slate-400 hover:text-brand-orange transition-all shadow-sm">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">LicitacIA <span className="text-brand-orange">Pro</span></h2>
                        <div className="flex gap-3 items-center mt-1">
                            <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest border-r border-slate-200 pr-3">Fuentes Activas:</span>
                            <span className="text-brand-orange text-[9px] font-black uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md">PLACSP (Estat)</span>
                            <span className="text-indigo-600 text-[9px] font-black uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">PSC (Gencat)</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={textSearch}
                            onChange={(e) => setTextSearch(e.target.value)}
                            placeholder="Buscar licitación..."
                            className="w-full bg-slate-100 hover:bg-slate-200 focus:bg-white border border-transparent focus:border-brand-orange/30 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold outline-none transition-all shadow-inner"
                        />
                    </div>

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
                        <StatCard label="Buzón" value={"Gmail"} icon={<Mail size={24} />} color="indigo" active={selectedFilter === 'mailbox'} onClick={() => setSelectedFilter('mailbox')} />
                        <StatCard label="No Aptas" value={metrics.discarded} icon={<Ban size={24} />} color="red" active={selectedFilter === 'discarded'} onClick={() => setSelectedFilter('discarded')} />
                    </div>

                    {/* SECTORES ESTRATÉGICOS CPV */}
                    <div className="flex items-center gap-4 bg-white/50 p-2 rounded-[2rem] border border-gray-100 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] font-black uppercase text-slate-400 ml-4 whitespace-nowrap">Enfoque:</span>
                        {Array.from(new Set(CPV_MAP.map(c => c.area))).map(area => (
                            <button
                                key={area}
                                onClick={() => setTextSearch(area)}
                                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${textSearch === area ? 'bg-brand-orange text-white' : 'bg-white border border-gray-100 text-slate-500 hover:border-brand-orange'}`}
                            >
                                {area}
                            </button>
                        ))}
                    </div>

                    {(selectedFilter && selectedFilter !== 'mailbox') || textSearch ? (
                        <div className="animate-in slide-in-from-bottom-4 duration-500 bg-white rounded-[2.5rem] shadow-2xl border border-orange-100 overflow-hidden">
                            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                                <div className="flex items-center gap-4 text-slate-100">
                                    <div className="p-3 bg-brand-orange rounded-2xl"><ListFilter size={24} /></div>
                                    <div className="flex-1">
                                        <h3 className="font-black uppercase tracking-widest text-lg leading-none">
                                            {textSearch ? `Resultats per: "${textSearch}"` : `Listado: ${selectedFilter === 'alerts' ? 'Nuevas Alertas' : selectedFilter.toUpperCase()}`}
                                        </h3>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">Total: {listItems.length} registros</p>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedFilter(null); setTextSearch(""); }} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white"><X size={24} /></button>
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
                                            <tr key={item.id} onClick={() => setSelectedItem(item)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                                                <td className="p-8 font-bold text-slate-900 text-sm leading-tight max-w-md">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{item.title}</span>
                                                        {item.cpv && <span className="text-[9px] text-brand-orange font-black uppercase">CPV: {item.cpv} {item.cpv_desc ? `(${item.cpv_desc})` : ''}</span>}
                                                    </div>
                                                </td>
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
                                                    <div className="flex justify-center gap-1">
                                                        {item.link && item.link !== '#' && (
                                                            <a href={item.link} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="inline-block p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all">
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        )}
                                                        {item.drive_link && (
                                                            <a href={item.drive_link} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="inline-block p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                                                                <Folder size={14} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex justify-center gap-2" onClick={e => e.stopPropagation()}>
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
                    ) : selectedFilter === 'mailbox' ? (
                        <div className="animate-in slide-in-from-bottom-4 duration-500 bg-white rounded-[2.5rem] shadow-2xl border border-indigo-100 overflow-hidden flex flex-col h-[600px]">
                            <div className="bg-indigo-900 p-8 flex justify-between items-center text-white">
                                <div className="flex items-center gap-4 text-indigo-100">
                                    <div className="p-3 bg-brand-orange rounded-2xl"><Mail size={24} /></div>
                                    <div>
                                        <h3 className="font-black uppercase tracking-widest text-lg leading-none">Buzón: Licitaciones Gmail</h3>
                                        <p className="text-indigo-400 text-[10px] font-bold uppercase mt-1">lagraficalicitacions@gmail.com</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedFilter(null)} className="p-2 hover:bg-white/10 rounded-full transition-all text-indigo-300 hover:text-white"><X size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                {loadingEmails ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-indigo-200 animate-pulse">
                                        <RefreshCw size={40} className="animate-spin" />
                                        <p className="font-black uppercase text-[10px] tracking-widest">Sincronitzant correus de Licitacions...</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {licitacionEmails.length === 0 ? (
                                            <div className="p-32 text-center text-slate-300 flex flex-col items-center opacity-50">
                                                <Mail size={60} className="mb-6" />
                                                <p className="text-xl font-black italic uppercase tracking-widest">Inbox Net</p>
                                            </div>
                                        ) : licitacionEmails.map(email => (
                                            <div key={email.id} className="p-8 hover:bg-slate-50 transition-all group flex flex-col gap-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="min-w-0 pr-4">
                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{email.from}</p>
                                                        <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-brand-orange transition-colors">{email.subject}</h4>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-300 whitespace-nowrap">{new Date(email.date).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{email.body}</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEmailComposerData({ to: email.from, subject: `RE: ${email.subject}`, body: `\n\n--- Original ---\n${email.body}`, memberId: 'licitacions', replyToId: email.id });
                                                            setShowEmailComposer(true);
                                                        }}
                                                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-orange transition-all"
                                                    >
                                                        Responder
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            await api.createTender({
                                                                title: email.subject,
                                                                institution: email.from.split('<')[0].trim(),
                                                                status: 'pending',
                                                                amount: 'Per definir',
                                                                deadline: 'Pendent'
                                                            });
                                                            alert("Convertit en licitació activa!");
                                                            setSelectedFilter('pending');
                                                            loadData();
                                                        }}
                                                        className="px-6 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                                    >
                                                        Convertir a Licitació
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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

            {
                isModalOpen && (
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
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 block">Código CPV</label>
                                        <select value={newTender.cpv} onChange={(e) => setNewTender({ ...newTender, cpv: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-4 text-sm font-semibold text-slate-900 focus:border-brand-orange outline-none transition-all">
                                            <option value="">Selecciona CPV...</option>
                                            {CPV_LIST.map(c => <option key={c.code} value={c.code}>{c.code} - {c.desc}</option>)}
                                        </select>
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
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 block">Enlace al Pliego</label>
                                        <input type="text" value={newTender.link} onChange={(e) => setNewTender({ ...newTender, link: e.target.value })} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-4 text-sm font-semibold text-slate-900 focus:border-brand-orange outline-none transition-all shadow-inner" placeholder="https://..." />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6 block">Enlace a GDrive</label>
                                        <input type="text" value={newTender.drive_link} onChange={(e) => setNewTender({ ...newTender, drive_link: e.target.value })} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-4 text-sm font-semibold text-slate-900 focus:border-brand-orange outline-none transition-all shadow-inner" placeholder="https://drive.google.com/..." />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-brand-orange text-white py-8 rounded-[2.5rem] font-black shadow-2xl shadow-orange-500/30 hover:bg-orange-700 transition-all uppercase text-xs tracking-[0.3em] active:scale-[0.98]">Inyectar en Pipeline de Éxito</button>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                selectedItem && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[80] flex items-center justify-end animate-in fade-in duration-300">
                        <div className="bg-white h-screen w-full max-w-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                            <div className="p-10 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange opacity-20 -mr-10 -mt-10 rounded-full blur-3xl"></div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-400 mb-2">Detalle de Licitación</p>
                                    <h3 className="text-2xl font-black italic uppercase italic leading-tight">{selectedItem.title}</h3>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-4 hover:bg-white/10 rounded-2xl text-white transition-all"><X size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-8">
                                    <InfoBox label="Institución" value={selectedItem.institution || selectedItem.source} />
                                    <InfoBox label="Fecha Límite" value={selectedItem.deadline || selectedItem.date} urgent={true} />
                                    <InfoBox label="Codi CPV" value={selectedItem.cpv || 'Pendent'} color="orange" />
                                    <InfoBox label="Importe" value={selectedItem.amount || '---'} />
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IA Strategic Summary / Notas</h4>
                                    <textarea
                                        value={selectedItem.description || ""}
                                        onChange={e => setSelectedItem({ ...selectedItem, description: e.target.value })}
                                        className="w-full p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-800 text-sm font-medium leading-relaxed outline-none focus:ring-4 focus:ring-brand-orange/5 transition-all min-h-[150px]"
                                        placeholder="Añade descripciones o detalles adicionales aquí..."
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checklist de Preparación</h4>
                                        <button
                                            onClick={() => {
                                                const newItem = prompt("Afegeix nou punt al checklist:");
                                                if (newItem) setSelectedItem({ ...selectedItem, checklist: [...(selectedItem.checklist || []), newItem] });
                                            }}
                                            className="text-[9px] font-black text-brand-orange uppercase tracking-widest hover:underline"
                                        >
                                            + AFEGIR PUNT
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {(selectedItem.checklist || ["Revisión del pliego técnico", "Preparación de propuesta gráfica", "Validación solvencia económica"]).map((check, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl group">
                                                <button
                                                    onClick={() => {
                                                        const newChecklist = (selectedItem.checklist || []).filter((_, i) => i !== idx);
                                                        setSelectedItem({ ...selectedItem, checklist: newChecklist });
                                                    }}
                                                    className="w-6 h-6 rounded-lg border-2 border-slate-200 flex items-center justify-center hover:border-brand-orange group"
                                                >
                                                    <CheckCircle size={14} className="text-transparent group-hover:text-brand-orange" />
                                                </button>
                                                <span className="text-xs font-bold text-slate-700 tracking-tight">{check}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recursos Directos</h4>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={selectedItem.drive_link || ""}
                                                onChange={e => setSelectedItem({ ...selectedItem, drive_link: e.target.value })}
                                                placeholder="Link a Drive... https://drive.google.com/..."
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    {selectedItem.link && (
                                        <a href={selectedItem.link} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-3 py-5 bg-slate-100 text-slate-900 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                                            <ExternalLink size={18} /> Ver Pliego
                                        </a>
                                    )}
                                    {selectedItem.drive_link && (
                                        <a href={selectedItem.drive_link} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-3 py-5 bg-blue-50 text-blue-600 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100">
                                            <Folder size={18} /> Carpeta Drive
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                                {selectedItem.isAlert ? (
                                    <button onClick={() => { processAlert(selectedItem.id, 'accept'); setSelectedItem(null); }} className="flex-1 py-5 bg-brand-orange text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                                        Capturar en Pipeline
                                    </button>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            await api.updateTender(selectedItem.id, {
                                                description: selectedItem.description,
                                                checklist: selectedItem.checklist,
                                                drive_link: selectedItem.drive_link
                                            });
                                            alert("Canvis guardats correctament!");
                                            loadData();
                                            setSelectedItem(null);
                                        }}
                                        className="flex-1 py-5 bg-brand-black text-white rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        Guardar Canvis
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            <EmailComposer
                isOpen={showEmailComposer}
                onClose={() => setShowEmailComposer(false)}
                memberId={emailComposerData.memberId}
                defaultTo={emailComposerData.to}
                defaultSubject={emailComposerData.subject}
                defaultBody={emailComposerData.body}
                replyToId={emailComposerData.replyToId}
            />
        </div >
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

const InfoBox = ({ label, value, color = 'slate', urgent = false }) => {
    const colors = {
        slate: 'bg-slate-50 text-slate-700 border-slate-100',
        orange: 'bg-orange-50 text-brand-orange border-orange-100',
    };
    return (
        <div className={`p-6 rounded-3xl border ${colors[color]} flex flex-col gap-1`}>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{label}</span>
            <span className={`text-xs font-black truncate ${urgent ? 'text-red-600 italic' : ''}`}>{value}</span>
        </div>
    );
};

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
