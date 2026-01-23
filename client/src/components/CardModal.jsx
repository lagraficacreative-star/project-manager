import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { X, Calendar, User, AlignLeft, Flag, CheckSquare, MessageSquare, Plus, Clock, FileText, Trash2, ChevronRight, Link as LinkIcon, Paperclip, Lock, ShieldCheck, DollarSign, Play, Square, History, Cloud, FileDown, Mail, Edit2 } from 'lucide-react';
import EmailComposer from './EmailComposer';

const CardModal = ({ isOpen, onClose, card, columnId, boardId, onSave, onDelete, currentUser }) => {
    if (!isOpen) return null;

    // Email Composer
    const [showEmailComposer, setShowEmailComposer] = useState(false);
    const [emailComposerData, setEmailComposerData] = useState({ to: '', subject: '', body: '' });

    // Tabs
    const [activeTab, setActiveTab] = useState('general');
    const [users, setUsers] = useState([]);

    // Core Data
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [responsibleId, setResponsibleId] = useState('');
    const [assigneeIds, setAssigneeIds] = useState([]);

    // Resources
    const [links, setLinks] = useState([]);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [attachments, setAttachments] = useState([]); // [{id, filename, url}]

    // Time Tracking (Phase 3)
    const [timeLogs, setTimeLogs] = useState([]); // [{id, start, end, duration, user}]
    const [activeTimerStart, setActiveTimerStart] = useState(null); // ISO string
    const [elapsedTime, setElapsedTime] = useState(0);

    // Advanced Data
    const [descriptionBlocks, setDescriptionBlocks] = useState([]);
    const [newDescText, setNewDescText] = useState('');
    const [checklists, setChecklists] = useState([]);
    const [newChecklistTitle, setNewChecklistTitle] = useState('');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [editingDescId, setEditingDescId] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingChecklistId, setEditingChecklistId] = useState(null);
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingLinkId, setEditingLinkId] = useState(null);
    const [tempEditText, setTempEditText] = useState('');

    // Economic
    const [economic, setEconomic] = useState({
        client: '',
        budget: '',
        cost: '', // New Field
        provider: '',
        description: '',
        attachments: [] // [{id, filename, url}]
    });

    const [isEconomicAuthenticated, setIsEconomicAuthenticated] = useState(false);
    const [economicPassword, setEconomicPassword] = useState('');

    // Refs
    const attachmentInputRef = useRef(null);
    const economicAttachmentRef = useRef(null);
    const descEditorRef = useRef(null);
    const descCreateRef = useRef(null);

    const execCommand = (cmd) => {
        document.execCommand(cmd, false, null);
    };

    useEffect(() => {
        loadUsers();
        if (card) {
            initializeFromCard(card);
        } else {
            resetForm();
        }
    }, [card, isOpen]);

    // Timer Interval
    useEffect(() => {
        let interval;
        if (activeTimerStart) {
            // Update immediately
            const start = new Date(activeTimerStart).getTime();
            setElapsedTime(Date.now() - start);

            interval = setInterval(() => {
                setElapsedTime(Date.now() - start);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [activeTimerStart]);

    const loadUsers = async () => {
        try {
            const data = await api.getUsers();
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.warn("API returned non-array for users:", data);
                setUsers([]);
            }
        } catch (error) {
            console.error("Failed to load users:", error);
            setUsers([]);
        }
    };

    const initializeFromCard = (c) => {
        setTitle(c.title || '');
        setPriority(c.priority || 'medium');
        setDueDate(c.dueDate || '');
        setResponsibleId(c.responsibleId || c.assignee || '');
        setAssigneeIds(c.assigneeIds || []);
        setLinks(c.links || []);
        setAttachments(c.attachments || []);

        // Time Tracking
        setTimeLogs(c.timeLogs || []);
        setActiveTimerStart(c.activeTimerStart || null);

        setDescriptionBlocks(c.descriptionBlocks || []);
        setChecklists(c.checklists || []);
        setComments(c.comments || []);
        setEconomic(c.economic || { client: '', budget: '', cost: '', provider: '', description: '', attachments: [] });
    };

    const resetForm = () => {
        setTitle('');
        setPriority('medium');
        setDueDate('');
        setResponsibleId('');
        setAssigneeIds([]);
        setLinks([]);
        setAttachments([]);
        setTimeLogs([]);
        setActiveTimerStart(null);
        setDescriptionBlocks([]);
        setChecklists([]);
        setComments([]);
        setEconomic({ client: '', budget: '', cost: '', provider: '', description: '', attachments: [] });
        setActiveTab('general');
    };

    const getCardData = () => ({
        title,
        priority,
        dueDate,
        responsibleId,
        assigneeIds,
        links,
        attachments,
        timeLogs,
        activeTimerStart,
        descriptionBlocks,
        checklists,
        comments,
        economic,
        boardId,
        columnId: card ? card.columnId : columnId
    });

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!title.trim()) {
            alert("Por favor, introduce un título para la tarjeta.");
            return;
        }

        await onSave(getCardData());
        onClose();
    };

    // --- LOGIC HANDLERS ---

    const toggleTimer = async () => {
        const now = new Date();
        let updatedLogs = [...timeLogs];
        let updatedStart = activeTimerStart;

        if (activeTimerStart) {
            // STOP TIMER
            const start = new Date(activeTimerStart);
            const duration = now.getTime() - start.getTime();
            updatedLogs.push({
                id: Date.now(),
                user: 'Montse', // Mock User
                start: activeTimerStart,
                end: now.toISOString(),
                duration
            });
            updatedStart = null;
        } else {
            // START TIMER
            updatedStart = now.toISOString();
        }

        // Update Local State
        setTimeLogs(updatedLogs);
        setActiveTimerStart(updatedStart);

        // PERSIST IMMEDIATELY
        // We construct the object manually to ensure we send the calculated values
        const dataToSave = {
            ...getCardData(),
            timeLogs: updatedLogs,
            activeTimerStart: updatedStart
        };
        await onSave(dataToSave);
    };

    const formatTime = (ms) => {
        if (!ms) return "00:00:00";
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const getTotalTime = () => {
        const logsTotal = timeLogs.reduce((acc, log) => acc + log.duration, 0);
        return logsTotal + (activeTimerStart ? elapsedTime : 0);
    };

    const toggleAssignee = (uid) => {
        setAssigneeIds(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const addLink = () => {
        if (!newLinkUrl.trim()) return;
        let type = 'url';
        if (newLinkUrl.includes('drive.google')) type = 'drive';
        if (newLinkUrl.includes('dropbox')) type = 'dropbox';
        setLinks(prev => [...prev, { id: Date.now(), type, url: newLinkUrl, title: newLinkUrl }]);
        setNewLinkUrl('');
    };

    const startEditingLink = (link) => {
        setEditingLinkId(link.id);
        setTempEditText(link.title || link.url);
    };

    const saveLinkEdit = (id) => {
        setLinks(prev => prev.map(l => l.id === id ? { ...l, title: tempEditText } : l));
        setEditingLinkId(null);
        setTempEditText('');
    };
    const removeLink = (id) => setLinks(prev => prev.filter(l => l.id !== id));

    // --- UPLOAD HANDLER ---
    const handleFileUpload = async (e, section) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        try {
            const result = await api.uploadFile(file); // { url, filename }
            const newAttachment = {
                id: Date.now(),
                filename: result.filename,
                url: result.url
            };
            if (section === 'general') {
                setAttachments(prev => [...prev, newAttachment]);
            } else if (section === 'economic') {
                setEconomic(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("Error al subir archivo");
        }
        e.target.value = null; // Reset input
    };

    const removeAttachment = (id) => setAttachments(prev => prev.filter(a => a.id !== id));

    const removeEconomicAttachment = (id) => {
        setEconomic(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== id) }));
    };

    const addDescriptionBlock = () => {
        const text = descCreateRef.current?.innerHTML;
        if (!text || text === '<br>') return;
        setDescriptionBlocks(prev => [...prev, { id: Date.now(), text, author: currentUser.name, date: new Date().toISOString() }]);
        if (descCreateRef.current) descCreateRef.current.innerHTML = '';
    };

    const addChecklist = () => {
        if (!newChecklistTitle.trim()) return;
        setChecklists(prev => [...prev, { id: Date.now(), title: newChecklistTitle, items: [] }]);
        setNewChecklistTitle('');
    };
    const addChecklistItem = (checklistId, text) => {
        setChecklists(prev => prev.map(cl => cl.id === checklistId ? { ...cl, items: [...cl.items, { id: Date.now(), text, done: false }] } : cl));
    };
    const toggleCheckitem = (checklistId, itemId) => {
        setChecklists(prev => prev.map(cl => cl.id === checklistId ? { ...cl, items: cl.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : cl));
    };

    const addComment = () => {
        if (!newComment.trim()) return;
        setComments(prev => [...prev, { id: Date.now(), text: newComment, author: 'Montse', date: new Date().toISOString() }]);
        setNewComment('');
    };

    const deleteDescriptionBlock = (id) => {
        if (confirm("¿Seguro que quieres borrar este bloque de descripción?")) {
            setDescriptionBlocks(prev => prev.filter(b => b.id !== id));
        }
    };

    const startEditingDescription = (block) => {
        setEditingDescId(block.id);
        setTempEditText(block.text);
    };

    const saveDescriptionEdit = (id) => {
        const text = descEditorRef.current?.innerHTML;
        setDescriptionBlocks(prev => prev.map(b => b.id === id ? { ...b, text } : b));
        setEditingDescId(null);
        setTempEditText('');
    };

    const deleteComment = (id) => {
        if (confirm("¿Eliminar este comentario?")) {
            setComments(prev => prev.filter(c => c.id !== id));
        }
    };

    const startEditingComment = (comment) => {
        setEditingCommentId(comment.id);
        setTempEditText(comment.text);
    };

    const saveCommentEdit = (id) => {
        setComments(prev => prev.map(c => c.id === id ? { ...c, text: tempEditText } : c));
        setEditingCommentId(null);
        setTempEditText('');
    };

    const deleteChecklist = (id) => {
        if (confirm("¿Borrar toda la lista?")) {
            setChecklists(prev => prev.filter(cl => cl.id !== id));
        }
    };

    const deleteChecklistItem = (checklistId, itemId) => {
        setChecklists(prev => prev.map(cl => cl.id === checklistId ? { ...cl, items: cl.items.filter(i => i.id !== itemId) } : cl));
    };

    const startEditingCheckitem = (item) => {
        setEditingItemId(item.id);
        setTempEditText(item.text);
    };

    const saveCheckitemEdit = (checklistId, itemId) => {
        setChecklists(prev => prev.map(cl => cl.id === checklistId ? { ...cl, items: cl.items.map(i => i.id === itemId ? { ...i, text: tempEditText } : i) } : cl));
        setEditingItemId(null);
        setTempEditText('');
    };

    const startEditingChecklistTitle = (cl) => {
        setEditingChecklistId(cl.id);
        setTempEditText(cl.title);
    };

    const saveChecklistTitleEdit = (id) => {
        setChecklists(prev => prev.map(cl => cl.id === id ? { ...cl, title: tempEditText } : cl));
        setEditingChecklistId(null);
        setTempEditText('');
    };

    const deleteTimeLog = (id) => {
        if (confirm("¿Eliminar este registro de tiempo?")) {
            setTimeLogs(prev => prev.filter(log => log.id !== id));
        }
    };

    const handleReplyEmail = (comment) => {
        setEmailComposerData({
            to: comment.senderEmail || '',
            subject: `Re: ${title}`,
            body: `\n\n--- Missatge original ---\nDe: ${comment.senderEmail}\nData: ${comment.timestamp || comment.date}\n\n${comment.text}`
        });
        setShowEmailComposer(true);
    };

    const handleExportNotes = () => {
        if (descriptionBlocks.length === 0) {
            alert("No hay notas para exportar.");
            return;
        }

        const headers = "Autor,Fecha,Contenido\n";
        const csvContent = descriptionBlocks.map(block => {
            const date = new Date(block.date).toLocaleString().replace(',', '');
            const text = block.text.replace(/"/g, '""').replace(/\n/g, ' ');
            return `"${block.author}","${date}","${text}"`;
        }).join("\n");

        const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `notas_${title.replace(/\s+/g, '_')}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const TabButton = ({ id, icon: Icon, label }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === id
                ? 'bg-brand-orange/10 text-brand-orange'
                : 'text-gray-500 hover:text-brand-black hover:bg-gray-50'
                }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden overflow-x-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Título de la tarjeta"
                            className="w-full text-xl md:text-2xl font-bold placeholder-gray-300 border-none focus:ring-0 p-0 text-brand-black bg-transparent"
                            autoFocus
                        />
                        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                            {/* Timer Widget */}
                            <div className={`flex items-center gap-3 px-3 md:px-4 py-2 rounded-full border ${activeTimerStart ? 'border-brand-orange bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                                <span className={`text-lg md:text-xl font-mono font-bold ${activeTimerStart ? 'text-brand-orange' : 'text-gray-600'}`}>
                                    {formatTime(activeTimerStart ? elapsedTime : getTotalTime())}
                                </span>
                                <button
                                    onClick={toggleTimer}
                                    className={`p-1.5 rounded-full transition-colors ${activeTimerStart ? 'bg-brand-orange text-white hover:bg-orange-600' : 'bg-gray-200 text-gray-700 hover:bg-brand-black hover:text-white'}`}
                                >
                                    {activeTimerStart ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                                </button>
                            </div>

                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-brand-black">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <TabButton id="general" icon={User} label="Detalles" />
                        <TabButton id="docs" icon={MessageSquare} label="Docs & Comentarios" />

                        <TabButton id="economic" icon={Lock} label="Económico" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">

                    {/* TAB: GENERAL (DETALLES) */}
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                            <div className="md:col-span-8 space-y-6">

                                {/* Team Members (Moved from Right Column) */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <User size={16} className="text-brand-orange" /> Equipo Asignado
                                        </label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setAssigneeIds(users.map(u => u.id))} className="text-[10px] text-brand-orange font-bold hover:underline">Todos</button>
                                            <button onClick={() => setAssigneeIds([])} className="text-[10px] text-gray-400 hover:text-gray-600">Ninguno</button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 bg-white p-3 rounded-lg border border-gray-100">
                                        {users.map(u => (
                                            <label key={u.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all border ${assigneeIds.includes(u.id) ? 'bg-orange-50 border-brand-orange text-brand-orange shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={assigneeIds.includes(u.id)}
                                                    onChange={() => toggleAssignee(u.id)}
                                                    className="hidden"
                                                />
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${u.id === 'montse' ? 'bg-brand-orange' : 'bg-gray-400'}`}>
                                                    {u.name[0]}
                                                </div>
                                                <span className="text-xs font-bold">{u.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-brand-orange" /> Responsable Principal
                                    </label>
                                    <select
                                        value={responsibleId}
                                        onChange={(e) => setResponsibleId(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                                    >
                                        <option value="">Seleccionar responsable...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Priority, Date & CLIENT */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <Flag size={16} className="text-brand-orange" /> Prioridad
                                        </label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                                        >
                                            <option value="low">Baja</option>
                                            <option value="medium">Media</option>
                                            <option value="high">Alta</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <Calendar size={16} className="text-brand-orange" /> Fecha límite
                                        </label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-3">
                                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <User size={16} className="text-brand-orange" /> Cliente
                                        </label>
                                        <input
                                            type="text"
                                            value={economic.client}
                                            onChange={(e) => setEconomic({ ...economic, client: e.target.value })}
                                            placeholder="Nombre del cliente..."
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                                        />
                                    </div>
                                </div>

                                {/* Description Section (Moved Here) */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <AlignLeft size={16} className="text-brand-orange" /> Descripción
                                        </label>
                                        <button
                                            onClick={handleExportNotes}
                                            title="Exportar notas a Excel/CSV"
                                            className="text-xs flex items-center gap-1 text-gray-500 hover:text-green-600 bg-gray-50 hover:bg-green-50 px-2 py-1 rounded-md transition-colors"
                                        >
                                            <FileDown size={12} /> Exportar Excel
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {descriptionBlocks.map((block, idx) => (
                                            <div key={block.id || idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative group">
                                                <div className="flex items-center justify-between mb-2 text-[10px] text-brand-gray border-b border-gray-50 pb-1">
                                                    <div className="flex items-center gap-2">
                                                        <User size={10} /> <span className="font-semibold">{block.author}</span>
                                                        <span className="mx-1">•</span>
                                                        <Clock size={10} /> <span>{new Date(block.date).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => startEditingDescription(block)} className="p-1 text-xs text-gray-400 hover:text-brand-orange">Editar</button>
                                                        <button onClick={() => deleteDescriptionBlock(block.id)} className="p-1 text-xs text-gray-400 hover:text-red-500">Borrar</button>
                                                    </div>
                                                </div>

                                                {editingDescId === block.id ? (
                                                    <div className="space-y-2">
                                                        <div className="flex gap-1 mb-1">
                                                            <button onClick={() => execCommand('bold')} className="p-1 text-[10px] font-bold bg-gray-100 rounded">B</button>
                                                            <button onClick={() => execCommand('italic')} className="p-1 text-[10px] italic bg-gray-100 rounded">I</button>
                                                            <button onClick={() => execCommand('underline')} className="p-1 text-[10px] underline bg-gray-100 rounded">U</button>
                                                        </div>
                                                        <div
                                                            ref={descEditorRef}
                                                            contentEditable
                                                            spellCheck="true"
                                                            lang="es"
                                                            className="w-full text-xs p-3 border border-brand-orange/30 rounded-lg focus:ring-1 focus:ring-brand-orange outline-none bg-orange-50/10 min-h-[80px]"
                                                            dangerouslySetInnerHTML={{ __html: block.text }}
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setEditingDescId(null)} className="text-[10px] font-bold text-gray-400">Cancelar</button>
                                                            <button onClick={() => saveDescriptionEdit(block.id)} className="text-[10px] font-bold text-brand-orange">Guardar</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-800 leading-relaxed rich-text-content" dangerouslySetInnerHTML={{ __html: block.text }} />
                                                )}
                                            </div>
                                        ))}

                                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                                            <div className="flex gap-2 mb-2">
                                                <button onClick={() => execCommand('bold')} className="p-1.5 text-xs font-bold hover:bg-gray-100 rounded transition-colors" title="Negrita">B</button>
                                                <button onClick={() => execCommand('italic')} className="p-1.5 text-xs italic hover:bg-gray-100 rounded transition-colors" title="Cursiva">I</button>
                                                <button onClick={() => execCommand('underline')} className="p-1.5 text-xs underline hover:bg-gray-100 rounded transition-colors" title="Subrayado">U</button>
                                            </div>
                                            <div
                                                ref={descCreateRef}
                                                contentEditable
                                                spellCheck="true"
                                                lang="es"
                                                placeholder="Añadir nueva descripción con estilos..."
                                                className="w-full min-h-[100px] p-3 border border-gray-100 rounded-lg focus:ring-2 focus:ring-brand-orange/20 text-xs mb-3 outline-none"
                                            />
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={addDescriptionBlock}
                                                    className="bg-brand-black text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-orange transition-all"
                                                >
                                                    Añadir Nota
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* This column is now empty or can be removed if no other content is intended for it */}
                            <div className="md:col-span-4 space-y-6">

                                {/* Timer Section */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        <History size={16} className="text-brand-orange" /> Registro de Tiempo
                                    </h3>
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                        {activeTimerStart && (
                                            <div className="flex justify-between items-center text-sm p-2 bg-orange-50 rounded-lg border border-orange-100 animate-pulse">
                                                <span className="font-bold text-brand-orange flex items-center gap-2">• En curso...</span>
                                                <span className="font-mono text-brand-black">{formatTime(elapsedTime)}</span>
                                            </div>
                                        )}
                                        {timeLogs.slice().reverse().map(log => (
                                            <div key={log.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg group">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-800">{log.user}</span>
                                                    <span className="text-xs text-gray-400">{new Date(log.start).toLocaleDateString()} {new Date(log.start).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-gray-600">{formatTime(log.duration)}</span>
                                                    <button onClick={() => deleteTimeLog(log.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {timeLogs.length === 0 && !activeTimerStart && (
                                            <div className="text-center text-xs text-gray-400 italic py-2">No hay registros de tiempo.</div>
                                        )}
                                    </div>
                                    <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-600">Total Acumulado</span>
                                        <span className="text-lg font-mono font-bold text-brand-black">{formatTime(getTotalTime())}</span>
                                    </div>
                                </div>

                                {/* Links & Attachments Section */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        <LinkIcon size={16} className="text-brand-orange" /> Enlaces y Recursos
                                    </h3>

                                    {/* Link Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newLinkUrl}
                                            onChange={(e) => setNewLinkUrl(e.target.value)}
                                            placeholder="Pegar enlace (Drive, Dropbox...)"
                                            className="flex-1 p-2 text-sm border border-gray-200 rounded-lg"
                                            onKeyDown={(e) => e.key === 'Enter' && addLink()}
                                        />
                                        <button onClick={addLink} className="p-2 bg-gray-100 rounded-lg hover:bg-brand-orange hover:text-white transition-colors">
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    {/* Links List */}
                                    <div className="space-y-2">
                                        {links.map(link => (
                                            <div key={link.id} className="flex items-center gap-2 text-sm p-2 bg-brand-lightgray rounded-lg group">
                                                <div className="text-brand-orange shrink-0">
                                                    {link.type === 'drive' ? 'Google Drive' : link.type === 'dropbox' ? 'Dropbox' : <LinkIcon size={14} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {editingLinkId === link.id ? (
                                                        <input
                                                            autoFocus
                                                            value={tempEditText}
                                                            onChange={(e) => setTempEditText(e.target.value)}
                                                            onBlur={() => saveLinkEdit(link.id)}
                                                            onKeyDown={(e) => e.key === 'Enter' && saveLinkEdit(link.id)}
                                                            className="w-full bg-white border border-brand-orange rounded px-2 py-0.5 text-xs outline-none"
                                                        />
                                                    ) : (
                                                        <a href={link.url} target="_blank" rel="noreferrer" className="block truncate hover:underline text-brand-black">
                                                            {link.title || link.url}
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => startEditingLink(link)} className="p-1 text-gray-400 hover:text-brand-orange"><Edit2 size={12} /></button>
                                                    <button onClick={() => removeLink(link.id)} className="p-1 text-gray-400 hover:text-red-500">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-gray-100 pt-3">
                                        {/* HIDDEN INPUTS */}
                                        <input
                                            type="file"
                                            ref={attachmentInputRef}
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, 'general')}
                                        />

                                        <button onClick={() => attachmentInputRef.current.click()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-orange transition-colors">
                                            <Paperclip size={16} /> Añadir Adjunto (Real Upload)
                                        </button>
                                        <div className="mt-2 space-y-1">
                                            {attachments.map(att => (
                                                <div key={att.id} className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200 shadow-sm">
                                                    <a href={att.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:text-brand-orange hover:underline">{att.filename}</a>
                                                    <button onClick={() => removeAttachment(att.id)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Checklists Section */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <CheckSquare size={16} className="text-brand-orange" /> Checklists
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newChecklistTitle}
                                                onChange={(e) => setNewChecklistTitle(e.target.value)}
                                                placeholder="Nombre de la lista..."
                                                className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                                                onKeyDown={(e) => e.key === 'Enter' && addChecklist()}
                                            />
                                            <button type="button" onClick={addChecklist} className="bg-brand-lightgray px-4 rounded-lg hover:bg-brand-orange hover:text-white transition-colors">
                                                <Plus size={20} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6">
                                            {checklists.map(cl => (
                                                <div key={cl.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm group/checklist">
                                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                                                        {editingChecklistId === cl.id ? (
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <input
                                                                    autoFocus
                                                                    value={tempEditText}
                                                                    onChange={(e) => setTempEditText(e.target.value)}
                                                                    onBlur={() => saveChecklistTitleEdit(cl.id)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && saveChecklistTitleEdit(cl.id)}
                                                                    className="flex-1 text-sm font-bold border-b border-brand-orange outline-none"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="cursor-pointer hover:text-brand-orange" onClick={() => startEditingChecklistTitle(cl)}>{cl.title}</span>
                                                                <button onClick={() => deleteChecklist(cl.id)} className="opacity-0 group-hover/checklist:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <span className="text-xs font-normal text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full ml-auto">
                                                            {cl.items.filter(i => i.done).length}/{cl.items.length}
                                                        </span>
                                                    </h3>

                                                    <div className="space-y-2 mb-4">
                                                        {cl.items.map(item => (
                                                            <div key={item.id} className="group flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.done}
                                                                    onChange={() => toggleCheckitem(cl.id, item.id)}
                                                                    className="w-4 h-4 text-brand-orange rounded border-gray-300 focus:ring-brand-orange"
                                                                />
                                                                {editingItemId === item.id ? (
                                                                    <input
                                                                        autoFocus
                                                                        value={tempEditText}
                                                                        onChange={(e) => setTempEditText(e.target.value)}
                                                                        onBlur={() => saveCheckitemEdit(cl.id, item.id)}
                                                                        onKeyDown={(e) => e.key === 'Enter' && saveCheckitemEdit(cl.id, item.id)}
                                                                        className="flex-1 text-sm border-b border-brand-orange outline-none bg-transparent"
                                                                    />
                                                                ) : (
                                                                    <>
                                                                        <span
                                                                            onClick={() => startEditingCheckitem(item)}
                                                                            className={`text-sm flex-1 cursor-pointer ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                                                                        >
                                                                            {item.text}
                                                                        </span>
                                                                        <button onClick={() => deleteChecklistItem(cl.id, item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all">
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Añadir elemento..."
                                                            className="w-full p-2 text-sm border-b border-transparent focus:border-brand-orange bg-transparent focus:ring-0 placeholder-gray-400"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                                    addChecklistItem(cl.id, e.target.value);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}




                    {/* TAB: DOCUMENTS & COMMENTS */}
                    {/* TAB: DOCUMENTS & COMMENTS */}
                    {activeTab === 'docs' && (
                        <div className="flex flex-col h-full space-y-6">

                            {/* Cloud Resources Section (Mock Phase 4) */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <h3 className="font-bold text-brand-black flex items-center gap-2">
                                    <Cloud size={18} className="text-blue-500" /> Recursos en la Nube
                                </h3>

                                <div className="space-y-2">
                                    {links.length === 0 && <p className="text-sm text-gray-400 italic">No hay enlaces adjuntos.</p>}
                                    {links.map(link => {
                                        const isDrive = link.url.includes('drive.google') || link.url.includes('docs.google');
                                        const isDropbox = link.url.includes('dropbox');

                                        return (
                                            <div key={link.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-brand-orange/30 transition-all">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm
                                                    ${isDrive ? 'bg-green-500' : isDropbox ? 'bg-blue-600' : 'bg-gray-400'}`}>
                                                    <LinkIcon size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <a href={link.url} target="_blank" rel="noreferrer" className="block text-sm font-medium text-gray-900 truncate hover:text-brand-orange hover:underline">
                                                        {link.title || link.url}
                                                    </a>
                                                    <div className="text-[10px] text-gray-400 truncate">{link.url}</div>
                                                </div>
                                                <button
                                                    onClick={() => setLinks(links.filter(l => l.id !== link.id))}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add Link Form */}
                                <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <input
                                        type="text"
                                        placeholder="Pegar enlace (Drive, Dropbox, etc)..."
                                        className="flex-1 bg-transparent text-sm p-1 focus:outline-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                const url = e.target.value.trim();
                                                const title = url.includes('drive') ? 'Google Drive Link' : url.includes('dropbox') ? 'Dropbox Link' : 'Enlace Externo';
                                                setLinks([...links, { id: Date.now(), title, url }]);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <button className="text-gray-400 hover:text-brand-orange">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <MessageSquare size={16} /> Comentarios
                                </h3>
                                {comments.length === 0 && <p className="text-sm text-gray-400 italic">No hay comentarios aún.</p>}
                                {comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 group">
                                        <div className="w-8 h-8 rounded-full bg-brand-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                                            {comment.author.charAt(0)}
                                        </div>
                                        <div className={`p-3 rounded-lg rounded-tl-none border shadow-sm flex-1 relative ${comment.author === 'Sistema (Email)' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-xs font-bold ${comment.author === 'Sistema (Email)' ? 'text-green-700' : 'text-gray-900'}`}>{comment.author}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(comment.date).toLocaleString()}</span>
                                            </div>

                                            {editingCommentId === comment.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        autoFocus
                                                        value={tempEditText}
                                                        onChange={(e) => setTempEditText(e.target.value)}
                                                        className="w-full text-sm p-2 border border-brand-orange/30 rounded focus:ring-1 focus:ring-brand-orange outline-none"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setEditingCommentId(null)} className="text-[10px] font-bold text-gray-400">Cancelar</button>
                                                        <button onClick={() => saveCommentEdit(comment.id)} className="text-[10px] font-bold text-brand-orange">Guardar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>

                                                    {comment.isEmail && comment.senderEmail && (
                                                        <button
                                                            onClick={() => handleReplyEmail(comment)}
                                                            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 transition-all shadow-sm"
                                                        >
                                                            <Mail size={12} /> RESPONDRE CORREU
                                                        </button>
                                                    )}

                                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => startEditingComment(comment)} className="p-1 text-gray-300 hover:text-brand-orange" title="Editar"><Edit2 size={12} /></button>
                                                        <button
                                                            onClick={() => deleteComment(comment.id)}
                                                            className="p-1 text-gray-300 hover:text-red-500"
                                                            title="Eliminar comentario"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-gray-200 mt-auto">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Escribe un comentario..."
                                        className="flex-1 p-2 bg-transparent text-sm focus:outline-none"
                                        onKeyDown={(e) => e.key === 'Enter' && addComment()}
                                    />
                                    <button onClick={addComment} disabled={!newComment.trim()} className="text-brand-orange hover:bg-brand-orange/10 p-2 rounded-lg transition-colors">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: ECONOMIC (PROTECTED) */}
                    {activeTab === 'economic' && (
                        <div className="h-full">
                            {!isEconomicAuthenticated ? (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 bg-brand-lightgray rounded-xl border-2 border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                        <Lock size={32} className="text-gray-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-gray-800">Contenido Protegido</h3>
                                        <p className="text-sm text-gray-500">Introduce la contraseña para ver la información económica.</p>
                                    </div>
                                    <div className="flex gap-2 w-full max-w-xs">
                                        <input
                                            type="password"
                                            value={economicPassword}
                                            onChange={(e) => setEconomicPassword(e.target.value)}
                                            placeholder="Contraseña"
                                            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm text-center"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && economicPassword === 'lagrafica2025') {
                                                    setIsEconomicAuthenticated(true);
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                if (economicPassword === 'lagrafica2025') setIsEconomicAuthenticated(true);
                                                else alert('Contraseña incorrecta');
                                            }}
                                            className="bg-brand-orange text-white px-4 rounded-lg font-bold text-sm"
                                        >
                                            Ver
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                        <h3 className="font-bold text-brand-orange flex items-center gap-2">
                                            <ShieldCheck size={20} /> Datos Económicos
                                        </h3>
                                        <div className="text-xs text-green-500 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                                            <Lock size={12} /> Acceso Autorizado
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Cliente</label>
                                            <input
                                                type="text"
                                                value={economic.client}
                                                onChange={(e) => setEconomic({ ...economic, client: e.target.value })}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                placeholder="Razón Social..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Presupuesto</label>
                                            <div className="relative">
                                                <DollarSign size={14} className="absolute left-3 top-3 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={economic.budget}
                                                    onChange={(e) => setEconomic({ ...economic, budget: e.target.value })}
                                                    className="w-full p-2 pl-8 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Coste Proveedor</label>
                                            <div className="relative">
                                                <DollarSign size={14} className="absolute left-3 top-3 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={economic.cost}
                                                    onChange={(e) => setEconomic({ ...economic, cost: e.target.value })}
                                                    className="w-full p-2 pl-8 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Proveedor</label>
                                            <input
                                                type="text"
                                                value={economic.provider}
                                                onChange={(e) => setEconomic({ ...economic, provider: e.target.value })}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                placeholder="Nombre proveedor..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Notas Privadas</label>
                                        <textarea
                                            value={economic.description}
                                            onChange={(e) => setEconomic({ ...economic, description: e.target.value })}
                                            className="w-full p-3 bg-yellow-50/50 border border-yellow-100 rounded-lg text-sm h-24 focus:ring-yellow-400"
                                            placeholder="Detalles confidenciales..."
                                        />
                                    </div>

                                    <div className="border-t border-gray-100 pt-4">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Adjuntos (Facturas/Presupuestos)</label>
                                        <div className="flex flex-wrap gap-2">
                                            <input
                                                type="file"
                                                ref={economicAttachmentRef}
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, 'economic')}
                                            />
                                            <button onClick={() => economicAttachmentRef.current.click()} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                                                <Paperclip size={14} /> Subir Factura (Real)
                                            </button>
                                        </div>
                                        <div className="mt-2 space-y-1">
                                            {economic.attachments && economic.attachments.map(att => (
                                                <div key={att.id} className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200 shadow-sm">
                                                    <a href={att.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:text-brand-orange hover:underline">{att.filename}</a>
                                                    <button onClick={() => removeEconomicAttachment(att.id)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10">
                    <div className="flex gap-2">
                        {card && onDelete && (
                            <button onClick={() => onDelete(card.id)} className="px-5 py-2 text-sm font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all flex items-center gap-2">
                                <Trash2 size={16} />
                                Borrar Tarjeta
                            </button>
                        )}
                        <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all">
                            Cerrar (Sin Guardar)
                        </button>
                        <button onClick={handleSubmit} className="px-5 py-2 text-sm font-medium text-white bg-brand-black hover:bg-brand-orange rounded-lg shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2">
                            <CheckSquare size={16} />
                            Guardar Cambios
                        </button>
                    </div>
                </div>

            </div>
            {/* Email Composer */}
            <EmailComposer
                isOpen={showEmailComposer}
                onClose={() => setShowEmailComposer(false)}
                memberId={currentUser.id}
                defaultTo={emailComposerData.to}
                defaultSubject={emailComposerData.subject}
                defaultBody={emailComposerData.body}
            />
        </div>
    );
};

export default CardModal;
