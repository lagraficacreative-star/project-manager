import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { Mail, RefreshCw, ArrowRight, CheckCircle, Search, Archive, Trash2, Plus, Send, Inbox as InboxIcon, Tag, Filter, X, Folder, ShieldCheck, Ban } from 'lucide-react';
import CardModal from './CardModal';
import EmailComposer from './EmailComposer';

const Inbox = ({ selectedUsers, currentUser }) => {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [users, setUsers] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'managed', 'sent', 'trash', 'spam'
    const [activeFolder, setActiveFolder] = useState('INBOX');
    const [repliedIds, setRepliedIds] = useState([]);

    const [showEmailComposer, setShowEmailComposer] = useState(false);
    const [emailComposerData, setEmailComposerData] = useState({ to: '', subject: '', body: '', memberId: '' });

    const [showSelector, setShowSelector] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);

    const [emailToConvert, setEmailToConvert] = useState(null);
    const [prefilledCard, setPrefilledCard] = useState(null);
    const [boards, setBoards] = useState([]);
    const [targetBoardId, setTargetBoardId] = useState(null);
    const [targetColumnId, setTargetColumnId] = useState(null);

    const [includeInComments, setIncludeInComments] = useState(false);
    const [processedIds, setProcessedIds] = useState([]);
    const [deletedIds, setDeletedIds] = useState([]);
    const [spamIds, setSpamIds] = useState([]);

    const [showCardPicker, setShowCardPicker] = useState(false);
    const [cards, setCards] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [emailFilter, setEmailFilter] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadUsers();
        loadBoards();
        loadProcessed();
        loadDeleted();
        loadSpam();
        loadCards();
        loadRepliedStatus();
        loadContacts();
    }, []);

    useEffect(() => {
        if (users.length > 0) {
            fetchEmails();
        }
    }, [users, selectedUsers, activeFolder]);

    const loadUsers = async () => {
        const u = await api.getUsers();
        setUsers(u);
    };

    const loadContacts = async () => {
        const c = await api.getContacts();
        setContacts(c || []);
    };

    const loadProcessed = async () => {
        const ids = await api.getProcessedEmails();
        setProcessedIds(ids.map(String));
    };

    const loadDeleted = async () => {
        const ids = await api.getDeletedEmails();
        setDeletedIds(ids.map(String));
    };

    const loadSpam = async () => {
        const ids = api.getSpamEmails ? await api.getSpamEmails() : [];
        setSpamIds(ids.map(String));
    };

    const loadRepliedStatus = async () => {
        const ids = await api.getRepliedEmails();
        setRepliedIds(ids);
    };

    const loadCards = async () => {
        const data = await api.getData();
        setCards(data.cards || []);
    };

    const loadBoards = async () => {
        const b = await api.getBoards();
        setBoards(b);
        if (b.length > 0) {
            setTargetBoardId(b[0].id);
            if (b[0].columns.length > 0) setTargetColumnId(b[0].columns[0].id);
        }
    };

    const fetchEmails = async () => {
        setLoading(true);
        try {
            const data = await api.getEmails(currentUser.id, activeFolder);
            setEmails(data || []);
        } catch (error) {
            console.error('Fetch emails failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectEmail = (email) => {
        setSelectedEmail(email);
    };

    const handleConvertToCard = (email) => {
        setEmailToConvert(email);
        setShowSelector(true);
    };

    const handleContinueToCard = () => {
        setPrefilledCard({
            title: emailToConvert.subject,
            descriptionBlocks: [
                { id: 'desc_1', type: 'text', text: `Email de: ${emailToConvert.from}\n\n${emailToConvert.body}` }
            ],
            labels: ['Email']
        });
        setShowSelector(false);
        setShowCardModal(true);
    };

    const handleSaveCard = async (cardData) => {
        setIsSaving(true);
        try {
            const result = await api.createCard(cardData);
            if (emailToConvert && result) {
                await api.markEmailProcessed(emailToConvert.messageId, emailToConvert.subject, currentUser.name);
                await api.moveEmail(currentUser.id, emailToConvert.messageId, activeFolder, 'Gestionados');

                if (includeInComments) {
                    await api.addCommentToCard(result.id, `--- EMAIL IMPORTADO ---\nDe: ${emailToConvert.from}\nAsunto: ${emailToConvert.subject}\n\n${emailToConvert.body}`, currentUser.id);
                }
                loadProcessed();
                fetchEmails();
            }
            setShowCardModal(false);
            setEmailToConvert(null);
        } catch (error) {
            console.error('Save card failed', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddToCard = (email) => {
        setEmailToConvert(email);
        setShowCardPicker(true);
    };

    const handleAddToCardFinish = async (card) => {
        setIsSaving(true);
        try {
            const commentText = `--- NUEVA ACTUALIZACIÓN POR EMAIL ---\nDe: ${emailToConvert.from}\nAsunto: ${emailToConvert.subject}\n\n${emailToConvert.body}`;
            await api.addCommentToCard(card.id, commentText, currentUser.id);
            await api.markEmailProcessed(emailToConvert.messageId, emailToConvert.subject, currentUser.name);
            await api.moveEmail(currentUser.id, emailToConvert.messageId, activeFolder, 'Gestionados');

            loadProcessed();
            fetchEmails();
            setShowCardPicker(false);
            setEmailToConvert(null);
        } catch (error) {
            console.error('Add to card failed', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEmail = async (emailId) => {
        if (!confirm('¿Mover a papelera?')) return;
        try {
            await api.moveEmail(currentUser.id, emailId, activeFolder, 'Papelera');
            fetchEmails();
            if (selectedEmail?.messageId === emailId) setSelectedEmail(null);
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const handleSpamEmail = async (emailId) => {
        if (!confirm('¿Marcar como SPAM?')) return;
        try {
            await api.moveEmail(currentUser.id, emailId, activeFolder, 'Spam');
            fetchEmails();
            if (selectedEmail?.messageId === emailId) setSelectedEmail(null);
        } catch (error) {
            console.error('Spam failed', error);
        }
    };

    const handleRestoreEmail = async (emailId) => {
        try {
            await api.moveEmail(currentUser.id, emailId, activeFolder, 'INBOX');
            fetchEmails();
        } catch (error) {
            console.error('Restore failed', error);
        }
    };

    const handleUnmanageEmail = async (emailId) => {
        try {
            await api.unmarkEmailProcessed(currentUser.id, emailId);
            loadProcessed();
            fetchEmails();
            if (selectedEmail?.messageId === emailId) setSelectedEmail(null);
        } catch (error) {
            console.error('Unmanage failed', error);
        }
    };

    const getContactTag = (from) => {
        if (!from) return null;
        const lowerFrom = from.toLowerCase();
        const contact = contacts.find(c => {
            if (!c.email) return false;
            return lowerFrom.includes(c.email.toLowerCase());
        });
        return contact ? { name: contact.tag, company: contact.company } : null;
    };

    const filteredEmails = useMemo(() => {
        return emails.filter(e => {
            const subject = (e.subject || '').toLowerCase();
            const from = (e.from || '').toLowerCase();
            const uniqueId = `${currentUser.id}-${e.messageId}`;

            const isGencatNotif = (from.includes('gencat') || from.includes('contractacio')) && (subject.includes('notificació') || subject.includes('notificación'));
            if (activeTab === 'licitaciones' && !isGencatNotif) return false;

            const isReplied = repliedIds.includes(uniqueId);
            if (activeTab === 'replied' && !isReplied) return false;

            const isProcessed = processedIds.includes(String(e.messageId));
            if (activeTab === 'managed' && !isProcessed) return false;

            if (activeTab === 'inbox') {
                if (isReplied || isGencatNotif || isProcessed) return false;
            }

            if (emailFilter) {
                const search = emailFilter.toLowerCase();
                const matches = from.includes(search) || subject.includes(search) || (e.body || '').toLowerCase().includes(search);
                if (!matches) return false;
            }
            return true;
        });
    }, [emails, emailFilter, activeTab, repliedIds, processedIds, currentUser.id]);

    const handleEmptyTrash = async () => {
        if (!confirm('¿Borrar permanentemente todos los correos de la papelera?')) return;
        setIsSaving(true);
        try {
            for (const email of emails) {
                await api.deleteEmailLocal(email.messageId);
            }
            fetchEmails();
            alert('Papelera vaciada (localmente).');
        } catch (error) {
            console.error('Empty trash failed', error);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="flex flex-col h-full bg-brand-lightgray animate-in fade-in duration-500">
            <div className="flex-1 flex overflow-hidden">
                <div className="w-64 border-r border-gray-100 bg-gray-50/50 flex flex-col shrink-0">
                    <div className="p-8">
                        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-6">Categorías</h3>
                        <nav className="space-y-1">
                            <NavItem active={activeTab === 'inbox'} icon={<InboxIcon size={18} />} label="Pendientes" onClick={() => { setActiveTab('inbox'); setActiveFolder('INBOX'); }} />
                            <NavItem active={activeTab === 'licitaciones'} icon={<ShieldCheck size={18} />} label="Licitaciones" onClick={() => { setActiveTab('licitaciones'); setActiveFolder('INBOX'); }} color="orange" />
                            <NavItem active={activeTab === 'replied'} icon={<Send size={18} />} label="Respondidos" onClick={() => { setActiveTab('replied'); setActiveFolder('Respondidos'); }} color="blue" />
                            <NavItem active={activeTab === 'managed'} icon={<Archive size={18} />} label="Archivados" onClick={() => { setActiveTab('managed'); setActiveFolder('Gestionados'); }} color="green" />
                        </nav>

                        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mt-10 mb-6">Sistema</h3>
                        <nav className="space-y-1">
                            <NavItem active={activeTab === 'all'} icon={<Mail size={18} />} label="Entrada Real" onClick={() => { setActiveTab('all'); setActiveFolder('INBOX'); }} />
                            <NavItem active={activeTab === 'sent'} icon={<Send size={18} />} label="Enviados" onClick={() => { setActiveTab('sent'); setActiveFolder('Enviados'); }} />
                            <NavItem active={activeTab === 'spam'} icon={<Ban size={18} />} label="Correo Spam" onClick={() => { setActiveTab('spam'); setActiveFolder('Spam'); }} />
                            <NavItem active={activeTab === 'trash'} icon={<Trash2 size={18} />} label="Papelera" onClick={() => { setActiveTab('trash'); setActiveFolder('Papelera'); }} color="red" />
                        </nav>

                        {activeTab === 'trash' && (
                            <button onClick={handleEmptyTrash} className="w-full mt-10 py-3 bg-red-100/50 text-red-600 text-[9px] font-black uppercase rounded-2xl border border-red-200 hover:bg-red-600 hover:text-white transition-all">
                                Vaciar Papelera
                            </button>
                        )}
                    </div>
                </div>

                <div className="w-[380px] flex flex-col bg-white border-r border-gray-100 shrink-0">
                    <div className="p-8 border-b border-gray-100 bg-white">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-orange rounded-2xl text-white shadow-lg shadow-orange-500/20">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-brand-black uppercase tracking-tight">
                                        {activeTab === 'licitaciones' ? 'Filtro Licitaciones' : 'Buzón Studio'}
                                    </h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{currentUser.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setEmailComposerData({ to: '', subject: '', body: '', memberId: currentUser.id });
                                        setShowEmailComposer(true);
                                    }}
                                    className="px-6 py-4 bg-brand-black text-white rounded-2xl hover:bg-brand-orange transition-all shadow-xl shadow-black/10 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <Plus size={20} /> Nuevo Mail
                                </button>
                                <button onClick={fetchEmails} className="p-4 hover:bg-gray-100 text-gray-400 transition-all rounded-2xl border border-gray-100">
                                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar en esta carpeta..."
                                value={emailFilter}
                                onChange={(e) => setEmailFilter(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-brand-orange/5 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                        {loading && emails.length === 0 ? (
                            <div className="p-20 text-center animate-pulse"><RefreshCw size={40} className="text-brand-orange/20 mx-auto mb-4 animate-spin" /><p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sincronizando...</p></div>
                        ) : filteredEmails.length === 0 ? (
                            <div className="p-20 text-center flex flex-col items-center"><div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 border border-dashed border-gray-200"><CheckCircle size={40} className="text-gray-100" /></div><p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Todo bajo control</p></div>
                        ) : filteredEmails.map(email => {
                            const tag = getContactTag(email.from);
                            const isSelected = selectedEmail?.messageId === email.messageId;
                            return (
                                <div key={email.messageId} onClick={() => handleSelectEmail(email)} className={`p-6 cursor-pointer transition-all hover:bg-gray-50 relative group border-l-4 ${isSelected ? 'bg-orange-50/50 border-l-brand-orange' : 'border-l-transparent'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[11px] font-black text-brand-black truncate max-w-[200px] mb-0.5">{email.from}</span>
                                            {tag && <div className="flex items-center gap-1.5"><Tag size={10} className="text-blue-500" /><span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{tag.name}</span></div>}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[9px] font-bold text-gray-300 whitespace-nowrap">{new Date(email.date).toLocaleDateString()}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={(e) => { e.stopPropagation(); handleConvertToCard(email); }} className="p-1 px-2 bg-orange-100 text-brand-orange rounded-full text-[8px] font-black uppercase hover:bg-brand-orange hover:text-white transition-colors">+ Ficha</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleAddToCard(email); }} className="p-1 px-2 bg-blue-100 text-blue-600 rounded-full text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-colors">Vincular</button>
                                                <button onClick={(e) => { e.stopPropagation(); setEmailComposerData({ to: email.from, subject: `RE: ${email.subject}`, body: `\n\n--- Mensaje original ---\nDe: ${email.from}\nAsunto: ${email.subject}\n\n${email.body}`, memberId: currentUser.id, replyToId: email.messageId }); setShowEmailComposer(true); }} className="p-1 px-2 bg-gray-100 text-gray-600 rounded-full text-[8px] font-black uppercase hover:bg-brand-black hover:text-white transition-colors">Responder</button>
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className={`text-sm font-bold truncate mb-2 ${isSelected ? 'text-brand-orange' : 'text-gray-800'}`}>{email.subject}</h4>
                                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mb-3">{email.body}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-gray-50/20">
                    {selectedEmail ? (
                        <>
                            <div className="p-8 border-b border-gray-100 flex flex-col gap-8 bg-white shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-3xl bg-brand-orange text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-orange-500/20">{selectedEmail.from[0]}</div>
                                        <div>
                                            <h3 className="text-xl font-black text-brand-black leading-tight uppercase tracking-tighter">{selectedEmail.subject}</h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">{selectedEmail.from}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDeleteEmail(selectedEmail.messageId)} className="p-4 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-2xl transition-all"><Trash2 size={20} /></button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => {
                                            setEmailComposerData({ to: selectedEmail.from, subject: `RE: ${selectedEmail.subject}`, body: `\n\n--- Mensaje original ---\n${selectedEmail.body}`, memberId: currentUser.id, replyToId: selectedEmail.messageId });
                                            setShowEmailComposer(true);
                                        }}
                                        className="flex-1 px-8 py-5 bg-brand-orange text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20"
                                    >
                                        Responder Ahora
                                    </button>
                                    <button onClick={() => handleConvertToCard(selectedEmail)} className="px-8 py-5 bg-brand-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
                                        Crear Ficha
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 text-gray-600 text-base leading-relaxed whitespace-pre-wrap font-medium">
                                    {selectedEmail.body}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-30">
                            <Mail size={80} className="text-gray-400 mb-8" />
                            <h3 className="text-2xl font-black text-brand-black uppercase">Selecciona un correo</h3>
                        </div>
                    )}
                </div>
            </div>

            {showCardPicker && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl border border-white/20 flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-8 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-brand-black uppercase tracking-tight">Vincular a Ficha Existente</h3>
                                <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">Busca la ficha por título o cliente</p>
                            </div>
                            <button onClick={() => setShowCardPicker(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={20} /></button>
                        </div>

                        <div className="relative mb-6 shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Escribe para buscar..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-orange/5 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar p-1">
                            {cards
                                .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                .slice(0, 10)
                                .map(card => (
                                    <div
                                        key={card.id}
                                        onClick={() => handleAddToCardFinish(card)}
                                        className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-brand-orange hover:bg-orange-50/30 cursor-pointer transition-all flex items-center justify-between group"
                                    >
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{boards.find(b => b.id === card.boardId)?.title}</p>
                                            <h4 className="text-sm font-black text-brand-black group-hover:text-brand-orange transition-colors">{card.title}</h4>
                                        </div>
                                        <ArrowRight size={18} className="text-gray-300 group-hover:text-brand-orange group-hover:translate-x-1 transition-all" />
                                    </div>
                                ))
                            }
                            {cards.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                <div className="p-10 text-center opacity-30">
                                    <Search size={40} className="mx-auto mb-4" />
                                    <p className="text-xs font-black uppercase">No se han encontrado fichas</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showSelector && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl border border-white/20">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-brand-black uppercase tracking-tight">Destino de la Ficha</h3>
                            <button onClick={() => setShowSelector(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={20} /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tablero</label>
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-orange/5 transition-all"
                                    value={targetBoardId}
                                    onChange={(e) => {
                                        const bId = e.target.value;
                                        setTargetBoardId(bId);
                                        const b = boards.find(x => x.id === bId);
                                        if (b && b.columns.length > 0) setTargetColumnId(b.columns[0].id);
                                    }}
                                >
                                    {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Columna</label>
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-orange/5 transition-all"
                                    value={targetColumnId}
                                    onChange={(e) => setTargetColumnId(e.target.value)}
                                >
                                    {boards.find(b => b.id === targetBoardId)?.columns.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeInComments}
                                    onChange={(e) => setIncludeInComments(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-2 border-brand-orange text-brand-orange focus:ring-brand-orange transition-all"
                                />
                                <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest group-hover:text-brand-orange transition-colors">Incluir correo en comentarios</span>
                            </label>

                            <button
                                onClick={handleContinueToCard}
                                className="w-full py-5 bg-brand-black text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-orange transition-all shadow-xl shadow-black/10 active:scale-95"
                            >
                                Siguiente paso
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CardModal
                isOpen={showCardModal}
                onClose={() => setShowCardModal(false)}
                card={prefilledCard}
                boardId={targetBoardId}
                columnId={targetColumnId}
                onSave={handleSaveCard}
                currentUser={currentUser}
            />

            <EmailComposer
                key={emailComposerData.replyToId || 'new'}
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

const NavItem = ({ active, icon, label, onClick, color = 'orange' }) => {
    const activeColors = {
        orange: 'bg-orange-50 text-brand-orange',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600'
    };
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest ${active ? activeColors[color] : 'text-gray-400 hover:bg-gray-100/50 hover:text-gray-600'}`}
        >
            <span className={active ? '' : 'opacity-40'}>{icon}</span>
            {label}
        </button>
    );
};

export default Inbox;
