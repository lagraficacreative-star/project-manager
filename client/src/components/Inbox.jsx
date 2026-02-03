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

    // Phase 2 Picker States
    const [pickerBoardId, setPickerBoardId] = useState('');
    const [pickerColumnId, setPickerColumnId] = useState('');
    const [pickerResponsibleId, setPickerResponsibleId] = useState('');
    const [selectedPickerCard, setSelectedPickerCard] = useState(null);

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
            // If active folder is Trash, we fetch INBOX to filter locally
            const folderToFetch = activeFolder === 'Papelera' ? 'INBOX' : activeFolder;
            fetchEmails(folderToFetch);
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

    const fetchEmails = async (folderOverride) => {
        setLoading(true);
        try {
            const folder = folderOverride || activeFolder;
            const data = await api.getEmails(currentUser.id, folder);
            if (data && data.error) {
                console.error('API Error:', data.error);
                setEmails([]);
            } else {
                setEmails(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Fetch emails failed', error);
            setEmails([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectEmail = async (email) => {
        setSelectedEmail(email);
        if (email.isPartial) {
            try {
                const bodyData = await api.getEmailBody(currentUser.id, email.messageId, activeFolder);
                if (bodyData && !bodyData.error) {
                    const fullEmail = { ...email, body: bodyData.body, htmlBody: bodyData.htmlBody, isPartial: false };
                    setSelectedEmail(fullEmail);
                    // Update in list too
                    setEmails(prev => prev.map(e => e.messageId === email.messageId ? fullEmail : e));
                }
            } catch (err) {
                console.error("Error fetching email body", err);
            }
        }
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
            labels: ['Email'],
            responsibleId: currentUser.id, // Auto-assign to the member who received the email
            sourceEmailDate: emailToConvert.date
        });
        setShowSelector(false);
        setShowCardModal(true);
    };

    const handleSaveCard = async (cardData) => {
        setIsSaving(true);
        try {
            const result = await api.createCard(cardData);
            if (emailToConvert && result) {
                await api.markEmailProcessed(emailToConvert.messageId, emailToConvert.subject, currentUser.name, emailToConvert.persistentId);
                await api.moveEmail(currentUser.id, emailToConvert.messageId, activeFolder, 'Archivados');

                if (includeInComments) {
                    await api.addCommentToCard(result.id, `--- EMAIL IMPORTADO ---\nDe: ${emailToConvert.from}\nAsunto: ${emailToConvert.subject}\n\n${emailToConvert.body}`, currentUser.id);
                }
                loadProcessed();
                fetchEmails();
                setSelectedEmail(null);
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
        setSelectedPickerCard(null);
        // Reset picker states
        setPickerBoardId('');
        setPickerColumnId('');
        setPickerResponsibleId('');
    };

    const handleAddToCardFinish = async (card) => {
        setIsSaving(true);
        try {
            // Phase 2: Update card location/assignment if changed in picker
            if (pickerBoardId || pickerColumnId || pickerResponsibleId) {
                const updatedData = {
                    ...card,
                    boardId: pickerBoardId || card.boardId,
                    columnId: pickerColumnId || card.columnId,
                    responsibleId: pickerResponsibleId || card.responsibleId
                };
                await api.updateCard(card.id, updatedData);
            }

            const commentText = `--- NUEVA ACTUALIZACIÓN POR EMAIL ---\nDe: ${emailToConvert.from}\nAsunto: ${emailToConvert.subject}\n\n${emailToConvert.body}`;
            await api.addCommentToCard(card.id, commentText, currentUser.id);
            await api.markEmailProcessed(emailToConvert.messageId, emailToConvert.subject, currentUser.name, emailToConvert.persistentId);
            await api.moveEmail(currentUser.id, emailToConvert.messageId, activeFolder, 'Archivados');

            loadProcessed();
            fetchEmails();
            setSelectedEmail(null);
            setShowCardPicker(false);
            setEmailToConvert(null);
            // Reset picker states
            setSelectedPickerCard(null);
            setPickerBoardId('');
            setPickerColumnId('');
            setPickerResponsibleId('');
        } catch (error) {
            console.error('Add to card failed', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEmail = async (emailId) => {
        if (!confirm('¿Mover a papelera local? (No se borrará de Nominalia)')) return;
        try {
            await api.deleteEmailLocal(emailId);
            loadDeleted();
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

    const handleArchiveEmail = async (emailId, subject, persistentId) => {
        try {
            await api.markEmailProcessed(emailId, subject || 'Sin asunto', currentUser.name, persistentId);
            await api.moveEmail(currentUser.id, emailId, activeFolder, 'Archivados');
            loadProcessed();
            fetchEmails();
            if (selectedEmail?.messageId === emailId) setSelectedEmail(null);
        } catch (error) {
            console.error('Archive failed', error);
        }
    };

    const handleRestoreEmail = async (emailId) => {
        try {
            await api.restoreEmailLocal(emailId);
            loadDeleted();
        } catch (error) {
            console.error('Restore failed', error);
        }
    };

    const handleUnmanageEmail = async (emailId, persistentId) => {
        try {
            await api.unmarkEmailProcessed(currentUser.id, emailId, persistentId);
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

            const isReplied = repliedIds.includes(uniqueId) || e.isAnswered;
            if (activeTab === 'replied' && !isReplied) return false;

            const isProcessed = processedIds.includes(String(e.messageId)) || (e.persistentId && processedIds.includes(String(e.persistentId)));
            const isLocalDeleted = deletedIds.includes(String(e.messageId));

            // Virtual Trash Logic
            if (activeTab === 'trash') {
                return isLocalDeleted;
            } else if (isLocalDeleted) {
                return false;
            }

            if (activeTab === 'managed') {
                // In managed tab, we show everything in the folder OR things explicitly processed
                if (activeFolder === 'INBOX' && !isProcessed) return false;
            }

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
    }, [emails, emailFilter, activeTab, repliedIds, processedIds, deletedIds, currentUser.id]);

    const handleEmptyTrash = async () => {
        if (!confirm('¿Borrar permanentemente todos los correos de la papelera?')) return;
        setIsSaving(true);
        try {
            await api.emptyTrash(currentUser.id, 'Papelera');
            fetchEmails();
            alert('Papelera vaciada correctamente.');
        } catch (error) {
            console.error('Empty trash failed', error);
            alert('Error al vaciar la papelera.');
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
                            <NavItem active={activeTab === 'replied'} icon={<Send size={18} />} label="Respondidos" onClick={() => { setActiveTab('replied'); setActiveFolder('Archivados'); }} color="blue" />
                            <NavItem active={activeTab === 'managed'} icon={<Archive size={18} />} label="Archivados" onClick={() => { setActiveTab('managed'); setActiveFolder('Archivados'); }} color="green" />
                        </nav>

                        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mt-10 mb-6">Sistema</h3>
                        <nav className="space-y-1">
                            <NavItem active={activeTab === 'all'} icon={<Mail size={18} />} label="Bandeja Entrada" onClick={() => { setActiveTab('all'); setActiveFolder('INBOX'); }} />
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
                            const isProcessed = processedIds.includes(String(email.messageId)) || (email.persistentId && processedIds.includes(String(email.persistentId)));
                            const isSelected = selectedEmail?.messageId === email.messageId;

                            // Visual Indicator logic
                            let statusColor = 'border-l-transparent';
                            let statusLabel = null;

                            if (activeFolder === 'Archivados') {
                                statusColor = 'border-l-green-500 bg-green-50/10';
                                statusLabel = <div className="p-1 bg-green-100 text-green-600 rounded-lg text-[7px] font-black uppercase tracking-widest leading-none">Archivado</div>;
                            } else if (isProcessed) {
                                statusColor = 'border-l-yellow-400 bg-yellow-50/10';
                                statusLabel = <div className="p-1 bg-yellow-100 text-yellow-600 rounded-lg text-[7px] font-black uppercase tracking-widest leading-none">En proceso</div>;
                            } else {
                                statusColor = 'border-l-red-400 bg-red-50/10';
                                statusLabel = <div className="p-1 bg-red-100 text-red-600 rounded-lg text-[7px] font-black uppercase tracking-widest leading-none">No documentado</div>;
                            }

                            const isReplied = (repliedIds.includes(String(email.messageId)) || (email.persistentId && repliedIds.includes(String(email.persistentId))) || email.isAnswered);
                            const repliedLabel = isReplied ? <div className="p-1 bg-blue-100 text-blue-600 rounded-lg text-[7px] font-black uppercase tracking-widest leading-none">Respondido</div> : null;

                            return (
                                <div
                                    key={email.messageId}
                                    onClick={() => handleSelectEmail(email)}
                                    className={`p-6 cursor-pointer transition-all hover:bg-gray-50 relative group border-l-4 ${isSelected ? 'bg-orange-50/50 border-l-brand-orange' : statusColor}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[11px] font-black text-brand-black truncate max-w-[150px]">{email.from}</span>
                                                {statusLabel}
                                                {isReplied && <div className="p-1 bg-blue-100 text-blue-600 rounded-lg text-[7px] font-black uppercase tracking-widest leading-none">Respondido</div>}
                                            </div>
                                            {tag && <div className="flex items-center gap-1.5"><Tag size={10} className="text-blue-500" /><span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{tag.name}</span></div>}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[9px] font-bold text-gray-300 whitespace-nowrap">{new Date(email.date).toLocaleDateString()}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                {!isProcessed && <button onClick={(e) => { e.stopPropagation(); handleConvertToCard(email); }} className="p-1 px-2 bg-orange-100 text-brand-orange rounded-full text-[8px] font-black uppercase hover:bg-brand-orange hover:text-white transition-colors">+ Ficha</button>}
                                                {!isProcessed && <button onClick={(e) => { e.stopPropagation(); handleAddToCard(email); }} className="p-1 px-2 bg-blue-100 text-blue-600 rounded-full text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-colors">Vincular</button>}
                                                <button onClick={(e) => { e.stopPropagation(); setEmailComposerData({ to: email.from, subject: `RE: ${email.subject}`, body: `\n\n--- Mensaje original ---\nDe: ${email.from}\nAsunto: ${email.subject}\n\n${email.body}`, memberId: currentUser.id, replyToId: email.messageId }); setShowEmailComposer(true); }} className="p-1 px-2 bg-gray-100 text-gray-600 rounded-full text-[8px] font-black uppercase hover:bg-brand-black hover:text-white transition-colors">Responder</button>
                                                {activeTab === 'trash' ? (
                                                    <button onClick={(e) => { e.stopPropagation(); handleRestoreEmail(email.messageId); }} className="p-1 px-2 bg-green-100 text-green-600 rounded-full text-[8px] font-black uppercase hover:bg-green-600 hover:text-white transition-colors" title="Restaurar">Restaurar</button>
                                                ) : (
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteEmail(email.messageId); }} className="p-1 px-2 bg-red-100 text-red-600 rounded-full text-[8px] font-black uppercase hover:bg-red-600 hover:text-white transition-colors" title="Eliminar localmente">
                                                        <Trash2 size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className={`text-sm font-bold truncate mb-2 ${isSelected ? 'text-brand-orange' : 'text-gray-800'}`}>{email.subject}</h4>
                                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mb-3">
                                        {email.isPartial ? <span className="italic opacity-50">{email.body}</span> : email.body}
                                    </p>
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
                                        <div className={`w-16 h-16 rounded-3xl text-white flex items-center justify-center font-black text-2xl shadow-xl ${processedIds.includes(String(selectedEmail.messageId)) ? 'bg-green-500 shadow-green-500/20' : 'bg-brand-orange shadow-orange-500/20'}`}>{selectedEmail.from[0]}</div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-black text-brand-black leading-tight uppercase tracking-tighter">{selectedEmail.subject}</h3>
                                                {(processedIds.includes(String(selectedEmail.messageId)) || (selectedEmail.persistentId && processedIds.includes(String(selectedEmail.persistentId)))) && (
                                                    <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100 flex items-center gap-1.5"><CheckCircle size={12} /> Procesado</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">{selectedEmail.from}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setEmailComposerData({
                                                    to: selectedEmail.from,
                                                    subject: `RE: ${selectedEmail.subject}`,
                                                    body: `\n\n--- Mensaje original ---\n${selectedEmail.body}`,
                                                    memberId: currentUser.id,
                                                    replyToId: selectedEmail.messageId
                                                });
                                                setShowEmailComposer(true);
                                            }}
                                            className="p-4 bg-brand-orange text-white rounded-2xl hover:bg-orange-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6"
                                        >
                                            <Send size={18} /> Responder
                                        </button>
                                        <button
                                            onClick={() => (processedIds.includes(String(selectedEmail.messageId)) || (selectedEmail.persistentId && processedIds.includes(String(selectedEmail.persistentId)))) ? handleUnmanageEmail(selectedEmail.messageId, selectedEmail.persistentId) : api.markEmailProcessed(selectedEmail.messageId, selectedEmail.subject, currentUser.name, selectedEmail.persistentId).then(loadProcessed)}
                                            className={`p-4 rounded-2xl transition-all ${(processedIds.includes(String(selectedEmail.messageId)) || (selectedEmail.persistentId && processedIds.includes(String(selectedEmail.persistentId)))) ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                            title={(processedIds.includes(String(selectedEmail.messageId)) || (selectedEmail.persistentId && processedIds.includes(String(selectedEmail.persistentId)))) ? "Desmarcar como procesado" : "Marcar como procesado manual"}
                                        >
                                            <CheckCircle size={20} />
                                        </button>
                                        <button onClick={() => handleArchiveEmail(selectedEmail.messageId, selectedEmail.subject, selectedEmail.persistentId)} className="p-4 hover:bg-green-50 text-gray-300 hover:text-green-600 rounded-2xl transition-all" title="Mover a carpeta Archivados"><Archive size={20} /></button>
                                        <button onClick={() => handleDeleteEmail(selectedEmail.messageId)} className="p-4 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-2xl transition-all" title="Eliminar"><Trash2 size={20} /></button>
                                    </div>
                                </div>

                                {/* Threading Suggestion */}
                                {(() => {
                                    const cleanSubject = selectedEmail.subject.toLowerCase().replace(/re:|fwd:|fw:/g, "").trim();
                                    const potentialCards = cards.filter(c => c.title.toLowerCase().includes(cleanSubject) || cleanSubject.includes(c.title.toLowerCase())).slice(0, 1);
                                    if (potentialCards.length > 0 && !processedIds.includes(String(selectedEmail.messageId))) {
                                        return (
                                            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 duration-500">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20">
                                                        <Folder size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Sugerencia de vínculo</p>
                                                        <p className="text-[11px] font-bold text-gray-700">Parece relacionado con: <span className="text-blue-600 underline cursor-pointer" onClick={() => handleAddToCardFinish(potentialCards[0])}>{potentialCards[0].title}</span></p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleAddToCardFinish(potentialCards[0])} className="px-4 py-2 bg-blue-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-blue-700 transition-all">Vincular ahora</button>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

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
                                    {!(processedIds.includes(String(selectedEmail.messageId)) || (selectedEmail.persistentId && processedIds.includes(String(selectedEmail.persistentId)))) && (
                                        <button onClick={() => handleConvertToCard(selectedEmail)} className="px-8 py-5 bg-brand-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
                                            Crear Ficha
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                                {/* Current Message */}
                                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 text-gray-600 text-base leading-relaxed whitespace-pre-wrap font-medium">
                                    {selectedEmail.body}
                                </div>

                                {/* Thread Messages */}
                                {(() => {
                                    const thread = emails.filter(e =>
                                        e.messageId !== selectedEmail.messageId &&
                                        (
                                            (e.references && e.references.includes(selectedEmail.persistentId)) ||
                                            (selectedEmail.references && selectedEmail.references.includes(e.persistentId)) ||
                                            (e.inReplyTo === selectedEmail.persistentId) ||
                                            (selectedEmail.inReplyTo === e.persistentId) ||
                                            (e.subject.replace(/re:|fwd:|fw:/gi, "").trim() === selectedEmail.subject.replace(/re:|fwd:|fw:/gi, "").trim())
                                        )
                                    ).sort((a, b) => new Date(a.date) - new Date(b.date));

                                    if (thread.length > 0) {
                                        return (
                                            <div className="space-y-6 pt-10 border-t border-gray-100">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Hilo de la conversación</h4>
                                                {thread.map(te => (
                                                    <div key={te.messageId} className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100/50">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-black text-brand-black uppercase">{te.from}</span>
                                                                <span className="text-[8px] font-bold text-gray-300">{new Date(te.date).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-3">{te.body}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
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

                        {/* Enhanced Picker Selectors */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Mover a Tablero</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-brand-orange/10"
                                    value={pickerBoardId}
                                    onChange={(e) => {
                                        setPickerBoardId(e.target.value);
                                        const b = boards.find(x => x.id === e.target.value);
                                        if (b && b.columns.length > 0) setPickerColumnId(b.columns[0].id);
                                    }}
                                >
                                    <option value="">(Sin cambios)</option>
                                    {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Columna</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-brand-orange/10"
                                    value={pickerColumnId}
                                    onChange={(e) => setPickerColumnId(e.target.value)}
                                >
                                    <option value="">(Sin cambios)</option>
                                    {boards.find(b => b.id === pickerBoardId)?.columns.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    )) || boards.find(b => b.id === selectedPickerCard?.boardId)?.columns.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Asignar a</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-brand-orange/10"
                                    value={pickerResponsibleId}
                                    onChange={(e) => setPickerResponsibleId(e.target.value)}
                                >
                                    <option value="">(Sin cambios)</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar p-1">
                            {cards
                                .filter(c => {
                                    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
                                    // Búsqueda global: no filtramos por tablero/columna aquí
                                    return matchesSearch;
                                })
                                .slice(0, 10)
                                .map(card => (
                                    <div
                                        key={card.id}
                                        onClick={() => {
                                            setSelectedPickerCard(card);
                                            // Pre-fill selectors with current card data if they are empty
                                            setPickerBoardId(card.boardId);
                                            setPickerColumnId(card.columnId);
                                            setPickerResponsibleId(card.responsibleId || '');
                                        }}
                                        className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${selectedPickerCard?.id === card.id ? 'bg-orange-50 border-brand-orange' : 'bg-white border-gray-100 hover:border-brand-orange hover:bg-orange-50/30'}`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{boards.find(b => b.id === card.boardId)?.title}</p>
                                                <div className="w-1 h-1 rounded-full bg-gray-200" />
                                                <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest">{boards.find(b => b.id === card.boardId)?.columns.find(col => col.id === card.columnId)?.title}</p>
                                            </div>
                                            <h4 className={`text-sm font-black transition-colors ${selectedPickerCard?.id === card.id ? 'text-brand-orange' : 'text-brand-black group-hover:text-brand-orange'}`}>{card.title}</h4>
                                        </div>
                                        {selectedPickerCard?.id === card.id ? (
                                            <CheckCircle size={18} className="text-brand-orange" />
                                        ) : (
                                            <ArrowRight size={18} className="text-gray-300 group-hover:text-brand-orange group-hover:translate-x-1 transition-all" />
                                        )}
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

                        {selectedPickerCard && (
                            <div className="mt-8 pt-8 border-t border-gray-100 shrink-0">
                                <button
                                    onClick={() => handleAddToCardFinish(selectedPickerCard)}
                                    disabled={isSaving}
                                    className="w-full py-5 bg-brand-orange text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                >
                                    {isSaving ? 'Vinculando...' : 'Confirmar Vínculo y Actualizar'}
                                </button>
                            </div>
                        )}
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
