import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Mail, RefreshCw, ArrowRight, CheckCircle, Search, Archive, Trash2, Plus, Send, Inbox as InboxIcon } from 'lucide-react';
import CardModal from './CardModal';
import EmailComposer from './EmailComposer';

const Inbox = ({ selectedUsers, currentUser }) => {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [users, setUsers] = useState([]);
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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadUsers();
        loadBoards();
        loadProcessed();
        loadDeleted();
        loadCards();
        loadRepliedStatus();
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

    const filteredEmails = emails.filter(e => {
        if (deletedIds.includes(String(e.messageId))) return false;
        if (activeTab === 'inbox') return !processedIds.includes(String(e.messageId));
        return processedIds.includes(String(e.messageId));
    });

    const prefilledCard = emailToConvert ? {
        title: emailToConvert.subject,
        descriptionBlocks: [{ id: 1, text: emailToConvert.body, author: emailToConvert.from, date: new Date().toISOString() }],
        columnId: targetColumnId
    } : null;

    return (
        <div className="flex flex-col h-full bg-brand-lightgray">
            <div className="flex-1 flex overflow-hidden">
                <div className="w-full md:w-[400px] border-r border-gray-200 bg-white flex flex-col shadow-sm">
                    <div className="p-6 border-b border-gray-100 bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black text-brand-black tracking-tight uppercase">Buzón</h2>
                            <button onClick={fetchEmails} className="p-2 hover:bg-orange-50 text-gray-400 hover:text-brand-orange transition-all rounded-xl">
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="flex p-1 bg-gray-50 rounded-xl mb-4">
                            <button onClick={() => setActiveTab('inbox')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'inbox' ? 'bg-white text-brand-orange shadow-sm border border-gray-100' : 'text-gray-400'}`}>Pendientes</button>
                            <button onClick={() => setActiveTab('archived')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'archived' ? 'bg-white text-brand-orange shadow-sm border border-gray-100' : 'text-gray-400'}`}>Archivados</button>
                        </div>
                        <div className="flex p-1 bg-gray-100/50 rounded-xl">
                            <button onClick={() => setActiveFolder('INBOX')} className={`flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFolder === 'INBOX' ? 'bg-gray-800 text-white' : 'text-gray-400'}`}>Entrada</button>
                            <button onClick={() => setActiveFolder('Sent')} className={`flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFolder === 'Sent' ? 'bg-gray-800 text-white' : 'text-gray-400'}`}>Enviados</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50 bg-white custom-scrollbar">
                        {loading && emails.length === 0 ? (
                            <div className="p-10 text-center animate-pulse"><div className="w-8 h-8 bg-brand-orange rounded-full mx-auto mb-2 opacity-20"></div><p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Cargando...</p></div>
                        ) : filteredEmails.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><CheckCircle size={32} className="text-gray-200" /></div>
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">¡Todo al día!<br />No hay correos aquí.</p>
                            </div>
                        ) : filteredEmails.map(email => (
                            <div
                                key={email.messageId}
                                onClick={() => handleSelectEmail(email)}
                                className={`p-5 cursor-pointer transition-all hover:bg-gray-50 relative group ${selectedEmail?.messageId === email.messageId ? 'bg-orange-50/50 border-l-4 border-l-brand-orange' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-black text-brand-black truncate max-w-[150px]">{email.from}</span>
                                    <span className="text-[9px] font-bold text-gray-300">{new Date(email.date).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-800 line-clamp-1 mb-1">{email.subject}</h4>
                                <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{email.body}</p>

                                <div className="mt-3 flex gap-1 items-center">
                                    {repliedIds.includes(email.messageId) && (
                                        <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wider">CONTESTADO</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-white">
                    {selectedEmail ? (
                        <>
                            <div className="p-6 md:p-10 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-lightgray flex items-center justify-center font-black text-gray-400 text-lg">{selectedEmail.from[0]}</div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg md:text-xl font-black text-brand-black truncate uppercase tracking-tight">{selectedEmail.subject}</h3>
                                        <p className="text-xs font-bold text-gray-400 mt-0.5">{selectedEmail.from}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleDeleteEmail(selectedEmail.messageId)} className="p-2.5 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all" title="Eliminar"><Trash2 size={20} /></button>
                                    <button onClick={() => handleAddToCard(selectedEmail)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all text-xs font-black uppercase tracking-widest"><Plus size={16} /> A Tarjeta</button>
                                    <button onClick={() => handleConvertToCard(selectedEmail)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange text-white rounded-xl hover:bg-orange-600 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20"><Plus size={16} /> Crear Ficha</button>
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
                            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl border border-gray-100 mb-6 text-gray-100"><Mail size={48} /></div>
                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-2">Selecciona un mensaje</h3>
                            <p className="text-gray-400 text-xs font-medium max-w-[250px]">Elige un correo de la lista izquierda para visualizar su contenido y gestionarlo.</p>
                        </div>
                    )}
                </div>
            </div>

            {showSelector && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">Guardar en...</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tablero</label>
                                <select value={targetBoardId} onChange={(e) => { setTargetBoardId(e.target.value); const b = boards.find(board => board.id === e.target.value); if (b && b.columns.length > 0) setTargetColumnId(b.columns[0].id); }} className="w-full p-2 border border-gray-300 rounded-lg text-sm">{boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Columna</label>
                                <select value={targetColumnId} onChange={(e) => setTargetColumnId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm">{boards.find(b => b.id === targetBoardId)?.columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100"><input type="checkbox" id="includeComments" checked={includeInComments} onChange={(e) => setIncludeInComments(e.target.checked)} className="w-4 h-4 text-brand-orange border-gray-300 rounded" /><label htmlFor="includeComments" className="text-sm text-gray-700">Incluir contenido del mail en Comentarios</label></div>
                        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowSelector(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button><button onClick={handleContinueToCard} className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm hover:bg-brand-orange">Continuar...</button></div>
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Plus className="text-brand-orange" /> Añadir a Tarjeta Existente</h3>
                        <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Buscar tarjeta..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" /></div>
                        <div className="flex-1 overflow-y-auto space-y-2 mb-6">{cards.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20).map(card => (<div key={card.id} onClick={() => handleAddToCardFinish(card)} className="p-4 border border-gray-100 rounded-xl hover:bg-orange-50 cursor-pointer"><div className="font-bold text-gray-900">{card.title}</div></div>))}</div>
                        <div className="flex justify-end"><button onClick={() => setShowCardPicker(false)} className="px-4 py-2 text-gray-400 font-bold uppercase text-xs">Cerrar</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inbox;
