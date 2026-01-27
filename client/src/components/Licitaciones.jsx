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
        { code: '79341000-6', desc: 'S. Publicidad', area: 'Publicidad' },
        { code: '79341400-0', desc: 'Campañas', area: 'Publicidad' },
        { code: '79342000-3', desc: 'Marketing', area: 'Marketing' },
        { code: '79341200-8', desc: 'Contenido Publicitario', area: 'Publicidad' },
        { code: '79416000-3', desc: 'Comunicación', area: 'Comunicación' },
        { code: '79822500-7', desc: 'Diseño Gráfico', area: 'Diseño' },
        { code: '79823000-2', desc: 'Maquetación', area: 'Diseño' },
        { code: '72413000-8', desc: 'Diseño Web', area: 'Web' },
        { code: '72420000-0', desc: 'Desarrollo Web', area: 'Web' }
    ];

    const [tenders, setTenders] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [docs, setDocs] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [textSearch, setTextSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // UI Panels
    const [activePanel, setActivePanel] = useState(null);
    const [notes, setNotes] = useState('');
    const [aiInput, setAiInput] = useState('');
    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', text: '¡Hola Montse! Soy tu asistente especializado en licitaciones. ¿Qué quieres saber sobre los pliegos o la documentación?' }
    ]);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [licitacionEmails, setLicitacionEmails] = useState([]);
    const [loadingEmails, setLoadingEmails] = useState(false);
    const [showEmailComposer, setShowEmailComposer] = useState(false);
    const [emailComposerData, setEmailComposerData] = useState({ to: '', subject: '', body: '', memberId: 'licitacions' });
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedMail, setSelectedMail] = useState(null);
    const [activeMailTab, setActiveMailTab] = useState('inbox');
    const [activeMailFolder, setActiveMailFolder] = useState('INBOX');
    const [repliedIds, setRepliedIds] = useState([]);

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

        const db = await api.getData();
        setNotes(db.licitaciones_notes || '');

        if (t.length === 0 && a.length === 0) {
            const mockAlerts = [
                { title: "Servicio de diseño gráfico para campaña de verano", source: 'Generalitat', date: '22/02/2026', link: '#', isAlert: true },
                { title: 'Mantenimiento y diseño web corporativo', source: 'PLACSP', date: '15/03/2026', link: '#', isAlert: true }
            ];
            for (const ma of mockAlerts) await api.createAlert(ma);
            loadData();
        }
    };

    useEffect(() => {
        loadData();
        loadRepliedStatus();
    }, []);

    const loadRepliedStatus = async () => {
        const ids = await api.getRepliedEmails();
        setRepliedIds(ids);
    };

    useEffect(() => {
        if (selectedFilter === 'mailbox') {
            loadEmails();
        }
    }, [selectedFilter, activeMailFolder]);

    const loadEmails = async () => {
        setLoadingEmails(true);
        try {
            const data = await api.getEmails('licitacions', activeMailFolder);
            if (data.error) {
                alert('⚠️ Error de Gmail: ' + data.error);
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
            else if (selectedFilter === 'mailbox') items = [];
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

    const filteredMailbox = useMemo(() => {
        return licitacionEmails.filter(email => {
            if (activeMailTab === 'replied') return repliedIds.includes(email.id);
            return true;
        });
    }, [licitacionEmails, activeMailTab, repliedIds]);

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
            if (data.error) alert('⚠️ Error: ' + data.error);
            else alert('✅ Sincronización completada.');
            loadData();
        } catch (err) {
            alert('Error conectando con el Robot.');
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
                amount: alertData.amount || 'Por definir',
                deadline: alertData.date || 'Pendiente',
                description: alertData.description || 'Resumen IA...',
                checklist: alertData.checklist || []
            });
        }
        await api.deleteAlert(alertId);
        loadData();
    };

    const handleAiSend = async (e) => {
        e.preventDefault();
        if (!aiInput.trim()) return;
        setAiMessages(prev => [...prev, { role: 'user', text: aiInput }]);
        setAiInput('');
        setIsAiTyping(true);
        setTimeout(() => {
            setAiMessages(prev => [...prev, { role: 'assistant', text: 'Analizando tu consulta...' }]);
            setIsAiTyping(false);
        }, 1200);
    };

    const handleArchiveLicitacion = async (emailId) => {
        try {
            await api.moveEmail('licitacions', emailId, activeMailFolder, 'Gestionados');
            loadEmails();
            if (selectedMail?.messageId === emailId) setSelectedMail(null);
        } catch (error) {
            console.error('Archive failed', error);
        }
    };

    const handleUnlock = (e) => {
        e.preventDefault();
        if (password === 'lagrafica2025') {
            unlockManagement(true);
        } else {
            setShowError(true);
            setTimeout(() => setShowError(false), 2000);
        }
    };

    if (!isManagementUnlocked) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10 text-center">
                <ShieldCheck size={40} className="text-brand-orange mb-8" />
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">LicitacIA Pro</h2>
                <form onSubmit={handleUnlock} className="w-full max-w-sm space-y-4">
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña..." className="w-full px-6 py-4 bg-gray-50 border rounded-2xl text-center font-bold" />
                    <button type="submit" className="w-full bg-brand-black text-white py-4 rounded-2xl font-black uppercase">Desbloquear</button>
                    {showError && <p className="text-red-500 text-xs font-black uppercase">Incorrecta</p>}
                </form>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
            <header className="bg-white border-b border-gray-50 p-8 flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-brand-orange transition-all"><ChevronLeft size={20} /></Link>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">LicitacIA <span className="text-brand-orange">Pro</span></h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 mr-4">
                        <ToolToggle active={activePanel === 'calendar'} icon={<CalIcon size={16} />} onClick={() => setActivePanel(activePanel === 'calendar' ? null : 'calendar')} label="Calendario" />
                        <ToolToggle active={activePanel === 'ai'} icon={<Bot size={16} />} onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')} label="IA" />
                        <ToolToggle active={activePanel === 'drive'} icon={<Folder size={16} />} onClick={() => setActivePanel(activePanel === 'drive' ? null : 'drive')} label="Drive" />
                    </div>
                    <button onClick={triggerScan} disabled={isScanning} className="px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 border-2 border-slate-200">
                        <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} /> {isScanning ? 'Sync...' : 'Sync'}
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="bg-brand-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px]">Nueva Entrada</button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                        <StatCard label="Alertas" value={metrics.alerts} icon={<Globe size={20} />} color="blue" active={selectedFilter === 'alerts'} onClick={() => setSelectedFilter('alerts')} />
                        <StatCard label="Pendientes" value={metrics.pending} icon={<Clock size={20} />} color="amber" active={selectedFilter === 'pending'} onClick={() => setSelectedFilter('pending')} />
                        <StatCard label="Presentadas" value={metrics.presented} icon={<CheckCircle size={20} />} color="indigo" active={selectedFilter === 'presented'} onClick={() => setSelectedFilter('presented')} />
                        <StatCard label="Ganadas" value={metrics.won} icon={<Trophy size={20} />} color="green" active={selectedFilter === 'won'} onClick={() => setSelectedFilter('won')} />
                        <StatCard label="Gmail" value="Inbox" icon={<Mail size={20} />} color="indigo" active={selectedFilter === 'mailbox'} onClick={() => setSelectedFilter('mailbox')} />
                    </div>

                    {(selectedFilter && selectedFilter !== 'mailbox') || textSearch ? (
                        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-xl">
                            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                                <h3 className="font-black uppercase tracking-widest text-sm">Listado: {selectedFilter}</h3>
                                <button onClick={() => { setSelectedFilter(null); setTextSearch(''); }}><X size={20} /></button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                        <tr>
                                            <th className="p-6">Licitación</th>
                                            <th className="p-6">Institución</th>
                                            <th className="p-6 text-center">Gestión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {listItems.map(item => (
                                            <tr key={item.id} onClick={() => setSelectedItem(item)} className="hover:bg-slate-50 cursor-pointer transition-all">
                                                <td className="p-6 font-bold text-slate-800 text-sm">{item.title}</td>
                                                <td className="p-6 font-black text-slate-400 text-[10px] uppercase">{item.institution || item.source}</td>
                                                <td className="p-6">
                                                    <div className="flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                                                        {selectedFilter === 'alerts' && <button onClick={() => processAlert(item.id, 'accept')} className="bg-brand-orange text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Capturar</button>}
                                                        <button onClick={async () => { if (confirm('Borrar?')) { selectedFilter === 'alerts' ? await api.deleteAlert(item.id) : await api.deleteTender(item.id); loadData(); } }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : selectedFilter === 'mailbox' ? (
                        <div className="bg-white rounded-[3rem] shadow-2xl border border-indigo-100 overflow-hidden flex h-[750px] animate-in slide-in-from-bottom-10 duration-500">
                            {/* Menú Lateral Buzón */}
                            <div className="w-48 bg-slate-900 p-8 text-white flex flex-col gap-4 shrink-0">
                                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Carpetas</h3>
                                <NavItemMail active={activeMailTab === 'inbox'} label="Inbox" onClick={() => { setActiveMailTab('inbox'); setActiveMailFolder('INBOX'); setSelectedMail(null); }} />
                                <NavItemMail active={activeMailTab === 'sent'} label="Enviados" onClick={() => { setActiveMailTab('sent'); setActiveMailFolder('Enviados'); setSelectedMail(null); }} />
                                <div className="mt-auto pt-8 border-t border-white/10">
                                    <button onClick={() => setSelectedFilter(null)} className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-400/10 flex items-center gap-2">
                                        <X size={14} /> Salir Buzón
                                    </button>
                                </div>
                            </div>

                            {/* Listado de Mails (Más pequeño) */}
                            <div className="w-80 flex flex-col overflow-hidden border-r border-slate-50 bg-white shrink-0">
                                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white/50">
                                    <h3 className="font-black uppercase text-[11px] tracking-widest text-slate-900">Buzón Licitaciones</h3>
                                    {loadingEmails && <RefreshCw size={14} className="animate-spin text-indigo-500" />}
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {loadingEmails && licitacionEmails.length === 0 ? (
                                        <div className="p-12 text-center animate-pulse text-[10px] font-black text-slate-300 uppercase italic">Sincronizando...</div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            {filteredMailbox.map(email => (
                                                <div
                                                    key={email.messageId}
                                                    onClick={() => setSelectedMail(email)}
                                                    className={`p-6 cursor-pointer transition-all hover:bg-indigo-50/30 border-l-4 ${selectedMail?.messageId === email.messageId ? 'bg-indigo-50/50 border-l-indigo-600' : 'border-l-transparent'}`}
                                                >
                                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 truncate">{email.from}</p>
                                                    <h4 className={`text-xs font-black leading-tight mb-2 ${selectedMail?.messageId === email.messageId ? 'text-indigo-900' : 'text-slate-800'}`}>{email.subject}</h4>
                                                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{email.body}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contenido del Mail (Más grande) */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
                                {selectedMail ? (
                                    <>
                                        <div className="p-8 border-b border-slate-100 bg-white flex flex-col gap-6 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-600/20">{selectedMail.from[0]}</div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-slate-900 leading-tight uppercase italic">{selectedMail.subject}</h3>
                                                        <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">{selectedMail.from}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleArchiveLicitacion(selectedMail.messageId)} className="p-3 hover:bg-green-50 text-slate-300 hover:text-green-600 rounded-xl transition-all" title="Archivar"><Archive size={18} /></button>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => { setEmailComposerData({ to: selectedMail.from, subject: 'RE: ' + selectedMail.subject, body: '\n\n--- Mensaje original ---\n' + selectedMail.body, memberId: 'licitacions', replyToId: selectedMail.messageId }); setShowEmailComposer(true); }}
                                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/10"
                                                >
                                                    Responder
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const confirmConvert = confirm('¿Convertir este correo en una nueva licitación?');
                                                        if (confirmConvert) {
                                                            await api.createTender({
                                                                title: selectedMail.subject,
                                                                institution: selectedMail.from,
                                                                description: selectedMail.body,
                                                                status: 'pending'
                                                            });
                                                            await api.moveEmail('licitacions', selectedMail.messageId, activeMailFolder, 'Gestionados');
                                                            alert('✅ Licitación creada y movida a Archivados');
                                                            loadData();
                                                            loadEmails();
                                                            setSelectedMail(null);
                                                        }
                                                    }}
                                                    className="py-4 px-8 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-orange transition-all"
                                                >
                                                    Convertir a Licitación
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-50 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                                {selectedMail.body}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20">
                                        <Mail size={80} className="text-slate-300 mb-8" />
                                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Selecciona un correo</h3>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : <div className="py-20 text-center opacity-20"><Database size={60} className="mx-auto mb-4" /><h3 className="text-2xl font-black uppercase">Pipeline Vacío</h3></div>}
                </div>

                {activePanel && (
                    <div className="w-[350px] bg-white border-l flex flex-col shadow-2xl z-20">
                        <header className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <span className="font-black text-xs uppercase">{activePanel}</span>
                            <button onClick={() => setActivePanel(null)}><X size={18} /></button>
                        </header>
                        <div className="flex-1 p-6 overflow-y-auto">
                            {activePanel === 'ai' && (
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 space-y-4">
                                        {aiMessages.map((m, i) => <div key={i} className={`p-3 rounded-xl text-xs ${m.role === 'user' ? 'bg-brand-orange text-white ml-8' : 'bg-gray-100 mr-8'}`}>{m.text}</div>)}
                                    </div>
                                    <form onSubmit={handleAiSend} className="mt-4 relative"><input value={aiInput} onChange={e => setAiInput(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-xs outline-none" placeholder="Pregunta..." /></form>
                                </div>
                            )}
                            {activePanel === 'drive' && <div className="text-center p-10"><Folder size={40} className="mx-auto mb-4 text-blue-500" /><a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-xs font-black uppercase text-blue-600">Abrir Drive</a></div>}
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2rem] w-full max-w-xl overflow-hidden">
                        <div className="bg-slate-900 p-8 text-white flex justify-between"><h3 className="font-black uppercase">Nueva Licitación</h3><button onClick={() => setIsModalOpen(false)}><X size={24} /></button></div>
                        <form onSubmit={handleSaveManual} className="p-8 space-y-4">
                            <input required value={newTender.title} onChange={e => setNewTender({ ...newTender, title: e.target.value })} placeholder="Título..." className="w-full p-4 bg-slate-50 border rounded-xl font-bold" />
                            <input required value={newTender.institution} onChange={e => setNewTender({ ...newTender, institution: e.target.value })} placeholder="Institución..." className="w-full p-4 bg-slate-50 border rounded-xl" />
                            <button type="submit" className="w-full bg-brand-orange text-white py-4 rounded-xl font-black uppercase">Guardar</button>
                        </form>
                    </div>
                </div>
            )}

            {selectedItem && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-end">
                    <div className="bg-white h-screen w-full max-w-xl flex flex-col shadow-2xl">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center"><h3 className="text-xl font-black uppercase italic">{selectedItem.title}</h3><button onClick={() => setSelectedItem(null)}><X size={24} /></button></div>
                        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <InfoBox label="Institución" value={selectedItem.institution || selectedItem.source} />
                                <InfoBox label="Importe" value={selectedItem.amount || '---'} />
                            </div>
                            <textarea value={selectedItem.description || ''} onChange={e => setSelectedItem({ ...selectedItem, description: e.target.value })} className="w-full h-40 p-6 bg-slate-50 border rounded-2xl text-sm" placeholder="Notas..." />
                        </div>
                        <div className="p-8 border-t bg-slate-50 flex gap-4"><button onClick={async () => { await api.updateTender(selectedItem.id, { description: selectedItem.description }); alert('¡Guardado!'); loadData(); setSelectedItem(null); }} className="flex-1 py-4 bg-brand-black text-white rounded-xl font-black uppercase">Guardar</button></div>
                    </div>
                </div>
            )}

            <EmailComposer
                isOpen={showEmailComposer}
                onClose={() => setShowEmailComposer(false)}
                memberId={emailComposerData.memberId}
                defaultTo={emailComposerData.to}
                defaultSubject={emailComposerData.subject}
                defaultBody={emailComposerData.body}
                replyToId={emailComposerData.replyToId}
            />
        </div>
    );
};

const NavItemMail = ({ active, label, onClick }) => (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase ${active ? 'bg-indigo-700 text-white shadow-lg' : 'text-indigo-400 hover:bg-white/5'}`}>{label}</button>
);

const ToolToggle = ({ active, icon, onClick, label }) => (
    <div className="flex flex-col items-center">
        <button onClick={onClick} className={`p-3 rounded-xl transition-all ${active ? 'bg-white text-brand-orange shadow-md' : 'text-gray-400 hover:bg-white'}`}>{icon}</button>
        <span className={`text-[7px] font-black uppercase mt-1 ${active ? 'text-brand-orange' : 'text-gray-300'}`}>{label}</span>
    </div>
);

const InfoBox = ({ label, value, color = 'slate', urgent = false }) => {
    const colors = { slate: 'bg-slate-50 text-slate-700 border-slate-100', orange: 'bg-orange-50 text-brand-orange border-orange-100' };
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
