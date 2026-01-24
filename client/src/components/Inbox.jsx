import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { Mail, RefreshCw, ArrowRight, CheckCircle, Search, Archive, Trash2, Plus, Send, Inbox as InboxIcon, Tag, Filter, X, Folder } from 'lucide-react';
import CardModal from './CardModal';
import EmailComposer from './EmailComposer';

const Inbox = ({ selectedUsers, currentUser }) => {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [users, setUsers] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [activeTab, setActiveTab] = useState('inbox');
    const [activeFolder, setActiveFolder] = useState('INBOX');
    const [repliedIds, setRepliedIds] = useState([]);

    const [showEmailComposer, setShowEmailComposer] = useState(false);
    const [emailComposerData, setEmailComposerData] = useState({ to: '', subject: '', body: '', memberId: '' });

    const [showSelector, setShowSelector] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);

    const [emailToConvert, setEmailToConvert] = useState(null);
    const [boards, setBoards] = useState([]);
    const [targetBoardId, setTargetBoardId] = useState(null);
    const [targetColumnId, setTargetColumnId] = useState(null);

    const [includeInComments, setIncludeInComments] = useState(false);
    const [processedIds, setProcessedIds] = useState([]);
    const [deletedIds, setDeletedIds] = useState([]);

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
            console.error("Fetch emails failed", error);
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
        setShowSelector(false);
        setShowCardModal(true);
    };

    const handleSaveCard = async (cardData) => {
        setIsSaving(true);
        try {
            const result = await api.createCard(cardData);
            if (emailToConvert && result) {
                await api.markEmailProcessed(emailToConvert.messageId, result.id);
                if (includeInComments) {
                    await api.updateCard(result.id, {
                        comments: [{
                            id: Date.now(),
                            text: `--- EMAIL IMPORTADO ---\nDe: ${emailToConvert.from}\nAsunto: ${emailToConvert.subject}\n\n${emailToConvert.body}`,
                            author: currentUser.name,
                            date: new Date().toISOString()
                        }]
                    });
                }
                loadProcessed();
            }
            setShowCardModal(false);
            setEmailToConvert(null);
        } catch (error) {
            console.error("Save card failed", error);
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
            const newComment = {
                id: Date.now(),
                text: `--- NUEVA ACTUALIZACIÓN POR EMAIL ---\nDe: ${emailToConvert.from}\nAsunto: ${emailToConvert.subject}\n\n${emailToConvert.body}`,
                author: currentUser.name,
                date: new Date().toISOString(),
                isEmail: true,
                senderEmail: emailToConvert.from
            };
            const updatedComments = [...(card.comments || []), newComment];
            await api.updateCard(card.id, { comments: updatedComments });
            await api.markEmailProcessed(emailToConvert.messageId, card.id);
            loadProcessed();
            setShowCardPicker(false);
            setEmailToConvert(null);
        } catch (error) {
            console.error("Add to card failed", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEmail = async (emailId) => {
        if (!confirm("¿Mover a papelera?")) return;
        try {
            await api.deleteEmail(emailId);
            loadDeleted();
            if (selectedEmail?.messageId === emailId) setSelectedEmail(null);
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    // --- Label Logic ---
    const getContactTag = (from) => {
        if (!from) return null;
        const lowerFrom = from.toLowerCase();
        const contact = contacts.find(c => {
            if (!c.email) return false;
            return lowerFrom.includes(c.email.toLowerCase());
        });
        return contact ? { name: contact.tag, company: contact.company } : null;
    };

    const getEmailCategory = (subject, from) => {
        const text = `${subject} ${from}`.toLowerCase();
        if (text.includes('presupuesto') || text.includes('factura') || text.includes('vencimiento')) return 'ECONÓMICO';
        if (text.includes('diseño') || text.includes('logo') || text.includes('estilo')) return 'DISEÑO';
        if (text.includes('web') || text.includes('hosting') || text.includes('dominio')) return 'WEB';
        if (text.includes('redes') || text.includes('instagram') || text.includes('facebook')) return 'REDES';
        return null;
    };

    const filteredEmails = useMemo(() => {
        return emails.filter(e => {
            if (deletedIds.includes(String(e.messageId))) return false;
            const isProcessed = processedIds.includes(String(e.messageId));
            if (activeTab === 'inbox' && isProcessed) return false;
            if (activeTab === 'archived' && !isProcessed) return false;
            if (emailFilter) {
                const search = emailFilter.toLowerCase();
                const matches = (e.from || "").toLowerCase().includes(search) ||
                    (e.subject || "").toLowerCase().includes(search) ||
                    (e.body || "").toLowerCase().includes(search);
                if (!matches) return false;
            }
            return true;
        });
    }, [emails, deletedIds, processedIds, activeTab, emailFilter]);

    const prefilledCard = emailToConvert ? {
        title: emailToConvert.subject,
        descriptionBlocks: [{ id: 1, text: emailToConvert.body, author: emailToConvert.from, date: new Date().toISOString() }],
        columnId: targetColumnId
    } : null;

    return (
        <div className="flex flex-col h-full bg-brand-lightgray animate-in fade-in duration-500">
            <div className="flex-1 flex overflow-hidden">
                <div className="w-full md:w-[450px] border-r border-gray-200 bg-white flex flex-col shadow-xl z-10">
                    <div className="p-6 border-b border-gray-100 bg-white">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-orange/10 rounded-xl text-brand-orange">
                                    <InboxIcon size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-brand-black tracking-tight uppercase leading-none">Buzón <span className="text-brand-orange">Smart</span></h2>
                            </div>
                            <button onClick={fetchEmails} className="p-3 hover:bg-orange-50 text-gray-400 hover:text-brand-orange transition-all rounded-2xl border border-transparent hover:border-orange-100">
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Filtrar correos..."
                                value={emailFilter}
                                onChange={(e) => setEmailFilter(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-brand-orange/10 transition-all placeholder:text-gray-300"
                            />
                        </div>
                        <div className="flex p-1 bg-gray-50 rounded-2xl mb-4">
                            <button onClick={() => setActiveTab('inbox')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-white text-brand-orange shadow-md border border-gray-100' : 'text-gray-400 opacity-60'}`}>Pendientes</button>
                            <button onClick={() => setActiveTab('archived')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'archived' ? 'bg-white text-brand-orange shadow-md border border-gray-100' : 'text-gray-400 opacity-60'}`}>Gestionados</button>
                        </div>
                        <div className="flex p-1 bg-100/50 rounded-2xl">
                            <button onClick={() => setActiveFolder('INBOX')} className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeFolder === 'INBOX' ? 'bg-brand-black text-white' : 'text-gray-400 hover:text-gray-600'}`}>Entrada</button>
                            <button onClick={() => setActiveFolder('Sent')} className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeFolder === 'Sent' ? 'bg-brand-black text-white' : 'text-gray-400 hover:text-gray-600'}`}>Enviados</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50 bg-white custom-scrollbar">
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
                                        <span className="text-[9px] font-bold text-gray-300 whitespace-nowrap">{new Date(email.date).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className={`text-sm font-bold truncate mb-2 ${isSelected ? 'text-brand-orange' : 'text-gray-800'}`}>{email.subject}</h4>
                                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mb-3">{email.body}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-white">
                    {selectedEmail ? (
                        <>
                            <div className="p-8 md:p-12 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-white shadow-sm shrink-0 gap-6">
                                <div className="flex items-center gap-5 min-w-0">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-brand-orange text-white flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-orange-100 shrink-0">{selectedEmail.from[0]}</div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl md:text-2xl font-black text-brand-black truncate uppercase tracking-tighter leading-tight mb-1">{selectedEmail.subject}</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedEmail.from}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button onClick={() => handleDeleteEmail(selectedEmail.messageId)} className="p-4 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"><Trash2 size={24} /></button>
                                    <button
                                        onClick={() => {
                                            setEmailComposerData({ to: selectedEmail.from, subject: `RE: ${selectedEmail.subject}`, body: `\n\n--- Missatge original ---\nDe: ${selectedEmail.from}\nAssumpte: ${selectedEmail.subject}\n\n${selectedEmail.body}`, memberId: currentUser.id, replyToId: selectedEmail.messageId });
                                            setShowEmailComposer(true);
                                        }}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-brand-black text-white rounded-2xl hover:bg-brand-orange transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-black/10"
                                    >
                                        <Send size={18} /> Responder
                                    </button>
                                    <button onClick={() => handleConvertToCard(selectedEmail)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-brand-orange text-white rounded-2xl hover:bg-orange-600 transition-all text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-500/20"><Plus size={18} /> Crear Ficha</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 md:p-12 lg:p-16 custom-scrollbar bg-gray-50/20">
                                <div className="max-w-4xl mx-auto">
                                    <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
                                        <div className="relative z-10 prose max-w-none text-base md:text-lg text-gray-600 font-medium font-sans leading-relaxed whitespace-pre-wrap">
                                            {selectedEmail.body}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-20 bg-gray-50/30">
                            <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center shadow-2xl shadow-black/5 border border-gray-100 mb-10 text-gray-100 transform -rotate-6"><Mail size={64} className="opacity-10" /></div>
                            <h3 className="text-2xl font-black text-brand-black uppercase tracking-tight mb-4 leading-none">Tu bandeja está lista,<br /><span className="text-brand-orange">{currentUser.name}</span></h3>
                            <p className="text-gray-400 text-sm font-medium max-w-[300px] leading-relaxed">Selecciona un mensaje de la izquierda para comenzar a gestionar los proyectos del estudio.</p>
                        </div>
                    )}
                </div>
            </div>

            {showSelector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-black/40 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95">
                        <h3 className="text-xl font-black text-brand-black uppercase tracking-tight mb-8">Guardar en Studio</h3>
                        <div className="space-y-6 mb-8">
                            <select value={targetBoardId} onChange={(e) => { setTargetBoardId(e.target.value); const b = boards.find(board => board.id === e.target.value); if (b && b.columns.length > 0) setTargetColumnId(b.columns[0].id); }} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-orange/20 outline-none">
                                {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                            </select>
                            <select value={targetColumnId} onChange={(e) => setTargetColumnId(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-orange/20 outline-none">
                                {boards.find(b => b.id === targetBoardId)?.columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3 mt-10">
                            <button onClick={() => setShowSelector(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px] hover:bg-gray-50 rounded-2xl">Cancelar</button>
                            <button onClick={handleContinueToCard} className="flex-1 py-4 bg-brand-black text-white rounded-2xl font-black uppercase text-[10px] hover:bg-brand-orange">Continuar</button>
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

            {showCardPicker && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-black/40 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] animate-in zoom-in-95">
                        <h3 className="text-xl font-black text-brand-black uppercase tracking-tight mb-8">Añadir a Tarjeta Existente</h3>
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold outline-none" />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-8 pr-2 custom-scrollbar">
                            {cards.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 30).map(card => (
                                <div key={card.id} onClick={() => handleAddToCardFinish(card)} className="p-5 border border-gray-50 rounded-2xl hover:bg-orange-50 cursor-pointer flex items-center justify-between">
                                    <div className="font-bold text-gray-800 text-sm">{card.title}</div>
                                    <ArrowRight size={16} className="text-gray-200" />
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowCardPicker(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] hover:bg-gray-50 rounded-2xl">Cerrar</button>
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

export default Inbox;
