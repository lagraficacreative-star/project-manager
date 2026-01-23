import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Mail, RefreshCw, ArrowRight, CheckCircle, Search, Archive, Trash2, Plus } from 'lucide-react';
import CardModal from './CardModal';
import EmailComposer from './EmailComposer';

const Inbox = ({ selectedUsers }) => {
    const [currentUser, setCurrentUser] = useState('montse');
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'archived'

    // Email Composer State
    const [showEmailComposer, setShowEmailComposer] = useState(false);
    const [emailComposerData, setEmailComposerData] = useState({ to: '', subject: '', body: '', memberId: '' });

    // Conversion State
    const [showSelector, setShowSelector] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);

    const [emailToConvert, setEmailToConvert] = useState(null);
    const [boards, setBoards] = useState([]);
    const [targetBoardId, setTargetBoardId] = useState(null);
    const [targetColumnId, setTargetColumnId] = useState(null);

    const [includeInComments, setIncludeInComments] = useState(false);
    const [processedIds, setProcessedIds] = useState([]);
    const [deletedIds, setDeletedIds] = useState([]);

    // Card Picker
    const [showCardPicker, setShowCardPicker] = useState(false);
    const [cards, setCards] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBoardId, setFilterBoardId] = useState('');
    const [filterMemberId, setFilterMemberId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadUsers();
        loadBoards();
        loadProcessed();
        loadDeleted();
        loadCards();
    }, []);

    useEffect(() => {
        if (users.length > 0) {
            fetchEmails();
        }
    }, [users, selectedUsers]);

    useEffect(() => {
        if (activeTab === 'archived') {
            loadProcessed();
        }
    }, [activeTab]);

    const loadUsers = async () => {
        const u = await api.getUsers();
        setUsers(u);
    };

    const loadProcessed = async () => {
        const ids = await api.getProcessedEmails();
        setProcessedIds(ids.map(String));
    };

    const loadDeleted = async () => {
        const ids = await api.getDeletedEmails();
        setDeletedIds(ids.map(String));
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
            const folder = 'INBOX';
            let usersToFetch = [];
            if (selectedUsers.length > 0) {
                usersToFetch = users.filter(u => selectedUsers.includes(u.id));
            } else {
                usersToFetch = users;
            }

            const promises = usersToFetch.map(u => api.getEmails(u.id, folder));
            const results = await Promise.all(promises);

            let allEmails = [];
            results.forEach((res, index) => {
                if (Array.isArray(res)) {
                    const userEmails = res.map(e => ({ ...e, ownerId: usersToFetch[index].id, ownerName: usersToFetch[index].name }));
                    allEmails = [...allEmails, ...userEmails];
                } else if (res && res.error) {
                    allEmails.push({
                        id: `error-${Date.now()}-${index}`,
                        from: 'SISTEMA DE ERROR',
                        subject: `Falló conexión: ${usersToFetch[index].name}`,
                        body: `Detalle del error:\n${typeof res.error === 'string' ? res.error : JSON.stringify(res.error)}`,
                        date: new Date().toISOString(),
                        ownerName: usersToFetch[index].name
                    });
                }
            });

            const sorted = allEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
            setEmails(sorted);
        } catch (error) {
            console.error("Error fetching emails", error);
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (email, e) => {
        if (e) e.stopPropagation();
        const uniqueId = email.ownerId ? `${email.ownerId}-${email.id}` : String(email.id);
        setProcessedIds(prev => [...prev, uniqueId]);
        await api.markEmailAsProcessed(uniqueId);
        if (selectedEmail && selectedEmail.id === email.id) setSelectedEmail(null);
    };

    const handleLocalDelete = async (email, e) => {
        if (e) e.stopPropagation();
        if (!confirm("¿Borrar este mensaje de la lista local? (No se borrará del servidor)")) return;
        const uniqueId = email.ownerId ? `${email.ownerId}-${email.id}` : String(email.id);
        setDeletedIds(prev => [...prev, uniqueId]);
        await api.deleteEmailLocal(uniqueId);
        if (selectedEmail && selectedEmail.id === email.id) setSelectedEmail(null);
    };

    const handleSaveAttachments = async (email) => {
        if (!email.attachments || email.attachments.length === 0) return;
        setIsSaving(true);
        try {
            await api.saveAttachmentsToDrive(email.ownerId || currentUser, email.attachments);
        } catch (error) {
            console.error("Failed to save attachments", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReply = (email) => {
        setEmailComposerData({
            to: email.from,
            subject: `Re: ${email.subject}`,
            body: `\n\n--- Missatge original ---\nDe: ${email.from}\nData: ${email.date}\nAssumpte: ${email.subject}\n\n${email.body}`,
            memberId: email.ownerId || currentUser
        });
        setShowEmailComposer(true);
    };

    const handleConvertToCardStart = (email) => {
        setEmailToConvert(email);
        setShowSelector(true);
        handleSaveAttachments(email);
    };

    const handleAddToCardStart = (email) => {
        setEmailToConvert(email);
        setShowCardPicker(true);
    };

    const handleAddToCardFinish = async (card) => {
        setIsSaving(true);
        try {
            const email = emailToConvert;
            const commentText = `📩 Email añadido a tarjeta:\nDe: ${email.from}\nAsunto: ${email.subject}\nFecha: ${email.date}\n\n${email.body}`;
            await api.addCommentToCard(card.id, commentText, `Sistema (Email de ${users.find(u => u.id === email.ownerId)?.name || email.ownerId})`);
            const uniqueId = email.ownerId ? `${email.ownerId}-${email.id}` : String(email.id);
            setProcessedIds(prev => [...prev, uniqueId]);
            await api.markEmailAsProcessed(uniqueId);
            await handleSaveAttachments(email);

            // Log to Google Sheet
            const boardName = boards.find(b => b.id === card.boardId)?.title || card.boardId;
            api.logEmailToSheet({
                from: email.from,
                subject: email.subject,
                projectPath: `${boardName} > ${card.title}`,
                messageId: email.id,
                member: email.ownerName || 'Montse'
            });

            setShowCardPicker(false);
            setEmailToConvert(null);
        } catch (error) {
            console.error("Error adding to card", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleContinueToCard = () => {
        setShowSelector(false);
        setShowCardModal(true);
    };

    const handleSaveCard = async (cardData) => {
        try {
            await api.createCard(cardData);
            const email = emailToConvert;
            const uniqueId = email.ownerId ? `${email.ownerId}-${email.id}` : String(email.id);
            setProcessedIds(prev => [...prev, uniqueId]);
            api.markEmailAsProcessed(uniqueId);

            // Log to Google Sheet
            const boardName = boards.find(b => b.id === cardData.boardId)?.title || cardData.boardId;
            api.logEmailToSheet({
                from: email.from,
                subject: email.subject,
                projectPath: boardName,
                messageId: email.id,
                member: email.ownerName || 'Montse'
            });

            setShowCardModal(false);
            setEmailToConvert(null);
        } catch (error) {
            console.error("Error creating card:", error);
        }
    };

    const prefilledCard = emailToConvert ? {
        title: emailToConvert.subject,
        descriptionBlocks: includeInComments ? [
            { id: Date.now(), text: `📩 Ficha creada desde correo.\nDe: ${emailToConvert.from}\nFecha: ${emailToConvert.date}`, author: 'Sistema', date: new Date().toISOString() }
        ] : [
            { id: Date.now(), text: `De: ${emailToConvert.from}\nFecha: ${emailToConvert.date}\n\n${emailToConvert.body}`, author: 'Sistema', date: new Date().toISOString() }
        ],
        comments: includeInComments ? [
            { id: Date.now() + 1, text: emailToConvert.body, author: 'Sistema (Email)', date: new Date().toISOString() }
        ] : [],
        priority: 'medium',
        responsibleId: currentUser,
        boardId: targetBoardId,
        columnId: targetColumnId
    } : null;

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-6 overflow-hidden">
            {/* Left Pane: Email List */}
            <div className={`w-full md:w-[400px] bg-white rounded-3xl border border-gray-100 flex flex-col shadow-sm transition-all duration-300 ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex flex-col border-b border-gray-50 bg-gray-50/30">
                    <div className="p-5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-orange/10 rounded-xl text-brand-orange">
                                <Mail size={18} />
                            </div>
                            <h2 className="font-black text-gray-800 uppercase tracking-tight text-sm">Buzó de Entrada</h2>
                        </div>
                        <button onClick={fetchEmails} disabled={loading} className={`p-2 rounded-xl hover:bg-white text-gray-400 hover:text-brand-orange transition-all shadow-sm border border-transparent hover:border-gray-100 ${loading ? 'animate-spin' : ''}`}>
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    <div className="flex px-5 py-2 items-center justify-between bg-white/50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {emails.length} Missatges
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/20"></div> Amb Fitxa
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {emails.filter(e => !deletedIds.includes(e.ownerId ? `${e.ownerId}-${e.id}` : String(e.id))).map(email => {
                        const uniqueId = email.ownerId ? `${email.ownerId}-${email.id}` : String(email.id);
                        const isProcessed = processedIds.includes(uniqueId);
                        const isSelected = selectedEmail?.id === email.id;

                        return (
                            <div
                                key={uniqueId}
                                onClick={() => setSelectedEmail(email)}
                                className={`p-5 border-b border-gray-50 cursor-pointer transition-all relative flex flex-col gap-1
                                    ${isSelected ? 'bg-orange-50/50' : 'bg-white hover:bg-gray-50/50'}`}
                            >
                                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-orange" />}
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className={`text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]
                                        ${isSelected ? 'text-brand-orange' : 'text-gray-400'}`}>
                                        {email.ownerName || 'Equip'}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-300 uppercase">
                                        {new Date(email.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 pr-2">
                                    {isProcessed && (
                                        <div className="shrink-0 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 border-2 border-white">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                    <h4 className={`text-sm font-bold truncate leading-tight ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                        {email.subject}
                                    </h4>
                                </div>
                                <p className="text-[11px] text-gray-400 line-clamp-1 font-medium italic">De: {email.from}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right Pane: Email Detail */}
            <div className={`flex-1 bg-white rounded-3xl border border-gray-100 flex flex-col overflow-hidden shadow-sm transition-all duration-300 ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
                {selectedEmail ? (
                    <>
                        <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col gap-6">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-4">
                                        <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2 rounded-xl bg-gray-50 text-gray-400">
                                            <ArrowRight size={18} className="rotate-180" />
                                        </button>
                                        <span className="px-3 py-1 bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest rounded-full">
                                            Asunto
                                        </span>
                                    </div>
                                    <h1 className="text-xl md:text-2xl font-black text-gray-800 leading-tight mb-4">{selectedEmail.subject}</h1>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200 uppercase">
                                            {selectedEmail.from[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-700">{selectedEmail.from}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">{new Date(selectedEmail.date).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={(e) => handleLocalDelete(selectedEmail, e)} className="p-3 bg-white text-gray-300 hover:text-red-500 hover:bg-red-50 border border-gray-100 rounded-2xl transition-all shadow-sm">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-[2rem] border border-gray-100/50">
                                <button onClick={() => handleReply(selectedEmail)} className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-white text-xs font-black rounded-2xl border border-transparent hover:bg-orange-600 transition-all shadow-md">
                                    <Mail size={16} /> RESPONDRE
                                </button>
                                <button onClick={() => handleAddToCardStart(selectedEmail)} className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 text-xs font-bold rounded-2xl border border-gray-100 hover:border-brand-orange/30 hover:shadow-md transition-all shadow-sm">
                                    <Plus size={16} className="text-brand-orange" /> AFEGIR A FITXA
                                </button>
                                <button
                                    onClick={() => handleConvertToCardStart(selectedEmail)}
                                    className={`flex items-center gap-2 px-8 py-3 text-xs font-black rounded-2xl transition-all shadow-lg
                                            ${processedIds.includes(selectedEmail.ownerId ? `${selectedEmail.ownerId}-${selectedEmail.id}` : String(selectedEmail.id))
                                            ? 'bg-green-500 text-white shadow-green-500/20'
                                            : 'bg-brand-black text-white hover:bg-brand-orange shadow-black/10'}`}
                                >
                                    <ArrowRight size={16} />
                                    {processedIds.includes(selectedEmail.ownerId ? `${selectedEmail.ownerId}-${selectedEmail.id}` : String(selectedEmail.id)) ? 'EDITAR FITXA' : 'CONVERTIR EN FITXA'}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
                            <div className="bg-gray-50/50 rounded-[2.5rem] p-8 border border-gray-50">
                                <div className="prose max-w-none text-[15px] text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                                    {selectedEmail.body}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-gray-50/30">
                        <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl border border-gray-100 mb-6 text-gray-100">
                            <Mail size={48} />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-2">Selecciona un missatge</h3>
                        <p className="text-gray-400 text-xs font-medium max-w-[250px]">Tria un correu de la llista esquerra per visualitzar el seu contingut i gestionar-lo.</p>
                    </div>
                )}
            </div>

            {/* Selector Dialog */}
            {showSelector && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">Guardar en...</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tablero</label>
                                <select
                                    value={targetBoardId}
                                    onChange={(e) => {
                                        setTargetBoardId(e.target.value);
                                        const b = boards.find(board => board.id === e.target.value);
                                        if (b && b.columns.length > 0) setTargetColumnId(b.columns[0].id);
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Columna</label>
                                <select
                                    value={targetColumnId}
                                    onChange={(e) => setTargetColumnId(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    {boards.find(b => b.id === targetBoardId)?.columns.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                            <input
                                type="checkbox" id="includeComments" checked={includeInComments}
                                onChange={(e) => setIncludeInComments(e.target.checked)}
                                className="w-4 h-4 text-brand-orange border-gray-300 rounded"
                            />
                            <label htmlFor="includeComments" className="text-sm text-gray-700">Incluir contenido del mail en Comentarios</label>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowSelector(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
                            <button onClick={handleContinueToCard} className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm hover:bg-brand-orange">Continuar...</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Card Modal */}
            <CardModal
                isOpen={showCardModal}
                onClose={() => setShowCardModal(false)}
                card={prefilledCard}
                boardId={targetBoardId}
                columnId={targetColumnId}
                onSave={handleSaveCard}
            />

            {/* Card Picker Modal */}
            {showCardPicker && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Plus className="text-brand-orange" /> Añadir a Tarjeta Existente
                        </h3>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text" placeholder="Buscar tarjeta..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 mb-6">
                            {cards.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20).map(card => (
                                <div key={card.id} onClick={() => handleAddToCardFinish(card)} className="p-4 border border-gray-100 rounded-xl hover:bg-orange-50 cursor-pointer">
                                    <div className="font-bold text-gray-900">{card.title}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button onClick={() => setShowCardPicker(false)} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Composer */}
            <EmailComposer
                isOpen={showEmailComposer}
                onClose={() => setShowEmailComposer(false)}
                memberId={emailComposerData.memberId}
                defaultTo={emailComposerData.to}
                defaultSubject={emailComposerData.subject}
                defaultBody={emailComposerData.body}
            />
        </div>
    );
};

export default Inbox;
