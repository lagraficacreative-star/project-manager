import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Mail, RefreshCw, ArrowRight, CheckCircle, Search, Archive, Trash2, Plus } from 'lucide-react';
import CardModal from './CardModal';

const Inbox = () => {
    const [currentUser, setCurrentUser] = useState('montse');
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]); // Filter by User
    const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'archived'

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [users, currentUser]); // Removed activeTab to prevent re-fetch flicker

    // Reload processed IDs when switching to Archived tab to ensure sync
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

    const toggleUserFilter = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
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
        // Don't clear emails immediately to avoid flickering if we are just switching tabs with same data
        // setEmails([]); 

        try {
            // STRATEGY CHANGE: "Virtual Archive"
            // We mainly fetch INBOX because that's where the "unmoved" emails are.
            // If the user wants to see *old* physical archives, we might need a separate logic, 
            // but for the "Process Flow", we read INBOX.
            // However, to be safe, if we are in 'archived' tab, we might implies showing what we marked.
            // For now, let's just fetch INBOX always, as per plan approval "The app will always read the Inbox".

            const folder = 'INBOX';

            // Determine users to fetch for
            let usersToFetch = [];
            if (currentUser) {
                const current = users.find(u => u.id === currentUser);
                if (current) usersToFetch = [current];
            } else {
                usersToFetch = users;
            }

            const promises = usersToFetch.map(u => api.getEmails(u.id, folder));
            const results = await Promise.all(promises);

            let allEmails = [];
            results.forEach((res, index) => {
                if (Array.isArray(res)) {
                    // Tag email with the owner user
                    const userEmails = res.map(e => ({ ...e, ownerId: usersToFetch[index].id, ownerName: usersToFetch[index].name }));
                    allEmails = [...allEmails, ...userEmails];
                } else if (res && res.error) {
                    allEmails.push({
                        id: `error-${Date.now()}-${index}`,
                        from: 'SISTEMA DE ERROR',
                        subject: `Falló conexión: ${usersToFetch[index].name}`,
                        body: `Detalle del error:\n${typeof res.error === 'string' ? res.error : JSON.stringify(res.error)}\n\nPosible causa: Contraseña incorrecta o bloqueo de servidor.`,
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
        console.log("Archiving Email:", uniqueId);

        // 1. Mark as processed in local state immediately
        setProcessedIds(prev => {
            console.log("Previous Processed:", prev);
            return [...prev, uniqueId];
        });

        // 2. Persist in DB
        await api.markEmailAsProcessed(uniqueId);

        // 3. User explicitly requested NOT to move emails on server (clean real inbox),
        // so we do NOT call api.archiveEmail.

        // Remove from selection if it was selected
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
            // Optional alert or toast
            console.log("Attachments saved to Drive");
        } catch (error) {
            console.error("Failed to save attachments", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConvertToCardStart = (email) => {
        setEmailToConvert(email);
        setShowSelector(true);
        // Automatically save attachments if any
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

            // Mark as processed
            const uniqueId = email.ownerId ? `${email.ownerId}-${email.id}` : String(email.id);
            setProcessedIds(prev => [...prev, uniqueId]);
            await api.markEmailAsProcessed(uniqueId);

            // Save attachments
            await handleSaveAttachments(email);

            setShowCardPicker(false);
            setEmailToConvert(null);
            alert("Email añadido Correctamente.");
        } catch (error) {
            console.error("Error adding to card", error);
            alert("Error al añadir el email a la tarjeta.");
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

            // UI Feedback
            // eslint-disable-next-line no-undef
            const email = emailToConvert;
            const uniqueId = email.ownerId ? `${email.ownerId}-${email.id}` : String(email.id);

            // Optimistic update logic changed: Don't remove from list, just mark as processed
            // setEmails(prev => prev.filter(em => em.id !== emailId)); // OLD

            setProcessedIds(prev => [...prev, uniqueId]);
            api.markEmailAsProcessed(uniqueId); // Persist

            // Close modal
            if (activeTab === 'inbox') {
                // Keep it selected but update UI to show it's processed
            }
            setShowCardModal(false);
            setEmailToConvert(null);

            // NO AUTO ARCHIVE -> User wants to see it marked first
            /*
            api.archiveEmail(currentUser, emailId).then(() => {
                console.log("Email archived in background");
            }).catch(err => console.error("Background archive failed", err));
            */

            console.log("Card created and email marked.");

            // Optional: Add a toast here if we had a toast system
            console.log("Card created and email archived automatically.");

        } catch (error) {
            console.error("Error creating card/archiving:", error);
            alert("Hubo un error al crear la ficha o archivar el correo.");
        }
    };

    // Prepare card data from email
    const prefilledCard = emailToConvert ? {
        title: emailToConvert.subject,
        descriptionBlocks: includeInComments ? [
            {
                id: Date.now(),
                text: `📩 Ficha creada desde correo.\nDe: ${emailToConvert.from}\nFecha: ${emailToConvert.date}`,
                author: 'Sistema',
                date: new Date().toISOString()
            }
        ] : [
            {
                id: Date.now(),
                text: `De: ${emailToConvert.from}\nFecha: ${emailToConvert.date}\n\n${emailToConvert.body}`,
                author: 'Sistema',
                date: new Date().toISOString()
            }
        ],
        comments: includeInComments ? [
            {
                id: Date.now() + 1,
                text: emailToConvert.body,
                author: 'Sistema (Email)',
                date: new Date().toISOString()
            }
        ] : [],
        priority: 'medium',
        responsibleId: currentUser,
        boardId: targetBoardId,
        columnId: targetColumnId
    } : null;

    return (
        <div className="flex h-full gap-6">
            {/* Sidebar / List */}
            <div className="w-1/3 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
                <div className="flex flex-col border-b border-gray-100 bg-gray-50">
                    <div className="p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Mail className="text-brand-orange" size={20} />
                            <h2 className="font-bold text-brand-black">Buzón</h2>
                        </div>
                        <button onClick={fetchEmails} disabled={loading} className={`p-2 rounded-full hover:bg-white text-gray-500 hover:text-brand-orange transition-colors ${loading ? 'animate-spin' : ''}`}>
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    <div className="flex px-4 py-2 bg-gray-50 border-b border-gray-100 items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {emails.length} Correos
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div> Ficha Creada
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-2 border-b border-gray-100">
                    <select
                        value={currentUser}
                        onChange={(e) => setCurrentUser(e.target.value)}
                        className="w-full p-2 text-sm border-none bg-transparent font-medium text-gray-600 focus:ring-0"
                    >
                        {users.map(u => (
                            <option key={u.id} value={u.id}>Buzón de {u.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Filter Emails based on Tab */}
                    {(() => {
                        console.log("Rendering Email List. ActiveTab:", activeTab, "ProcessedCount:", processedIds.length);

                        const filteredEmails = emails.filter(email => {
                            const uniqueId = email.ownerId ? `${email.ownerId}-${email.id}` : String(email.id);
                            return !deletedIds.includes(uniqueId);
                        });

                        console.log("Emails after filter:", filteredEmails.length);

                        if (filteredEmails.length === 0 && !loading) {
                            return (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    No hay correos.
                                </div>
                            );
                        }

                        return filteredEmails.map(email => {
                            const uniqueId = email.ownerId ? `${email.ownerId}-${email.id}` : String(email.id);
                            const isProcessed = processedIds.includes(uniqueId);
                            return (
                                <div
                                    key={uniqueId} // Use uniqueId for key
                                    onClick={() => setSelectedEmail(email)}
                                    className={`p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 
                                    ${selectedEmail?.id === email.id ? 'bg-orange-50 border-orange-100' : ''}
                                    ${isProcessed ? 'bg-green-50/20' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-bold text-sm truncate pr-2 
                                        ${selectedEmail?.id === email.id ? 'text-brand-orange' : 'text-gray-800'}`}>
                                            {email.from}
                                        </span>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {new Date(email.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-medium text-gray-700 truncate mb-1 flex items-center gap-2">
                                        {isProcessed && (
                                            <div className="shrink-0 w-3 h-3 rounded-full bg-green-500 shadow-sm" title="Ficha Creada"></div>
                                        )}
                                        <span className="truncate">{email.subject}</span>
                                    </h4>
                                    <p className="text-xs text-gray-400 line-clamp-2">{email.body.substring(0, 100)}</p>
                                </div>
                            )
                        });
                    })()}
                </div>
            </div>

            {/* Detail View */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
                {selectedEmail ? (
                    <>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h1 className="text-xl font-bold text-brand-black mb-2">{selectedEmail.subject}</h1>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="font-semibold text-gray-700">{selectedEmail.from}</span>
                                    <span>&lt;{selectedEmail.from}&gt;</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    {selectedEmail.date}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => handleLocalDelete(selectedEmail, e)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Borrar mensaje temporalmente"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    onClick={() => handleAddToCardStart(selectedEmail)}
                                    className="px-4 py-2 text-sm font-medium text-brand-black border border-brand-black rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-all"
                                >
                                    <Plus size={16} /> Añadir a tarjeta
                                </button>
                                <button
                                    onClick={() => handleConvertToCardStart(selectedEmail)}
                                    // Disable if already processed? Or allow re-creation? User asked to mark them, likely to avoid duplication.
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-lg flex items-center gap-2 transition-all
                                        ${processedIds.includes(selectedEmail.ownerId ? `${selectedEmail.ownerId}-${selectedEmail.id}` : String(selectedEmail.id))
                                            ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20'
                                            : 'bg-brand-black hover:bg-brand-orange hover:shadow-orange-500/20'}`}
                                >
                                    <ArrowRight size={16} /> {processedIds.includes(selectedEmail.ownerId ? `${selectedEmail.ownerId}-${selectedEmail.id}` : String(selectedEmail.id)) ? 'Ficha Creada (Re-editar)' : 'Convertir a Ficha'}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="prose max-w-none text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                                {selectedEmail.body}
                            </div>

                            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                <div className="mt-8 pt-4 border-t border-gray-100">
                                    <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                                        <CheckCircle size={16} className="text-brand-orange" /> Adjuntos encontrados
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedEmail.attachments.map((att, idx) => (
                                            <div key={idx} className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-xs font-medium text-gray-700">
                                                {att.filename}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <Mail size={48} className="mb-4 text-gray-200" />
                        <p>Selecciona un correo para ver los detalles.</p>
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
                                type="checkbox"
                                id="includeComments"
                                checked={includeInComments}
                                onChange={(e) => setIncludeInComments(e.target.checked)}
                                className="w-4 h-4 text-brand-orange border-gray-300 rounded focus:ring-brand-orange"
                            />
                            <label htmlFor="includeComments" className="text-sm text-gray-700 select-none cursor-pointer">
                                Incluir contenido del mail en <strong>Comentarios</strong>
                            </label>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setShowSelector(false); setEmailToConvert(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
                            <button
                                onClick={handleContinueToCard}
                                className="px-4 py-2 bg-brand-black text-white rounded-lg text-sm hover:bg-brand-orange"
                            >
                                Continuar...
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Card Modal */}
            <CardModal
                isOpen={showCardModal}
                onClose={() => setShowCardModal(false)}
                card={prefilledCard}
                boardId={targetBoardId}
                columnId={targetColumnId}
                onSave={handleSaveCard}
            />

            {/* Card Picker Modal (Add to Existing) */}
            {showCardPicker && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Plus className="text-brand-orange" /> Añadir a Tarjeta Existente
                        </h3>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tablero</label>
                                <select
                                    value={filterBoardId}
                                    onChange={(e) => setFilterBoardId(e.target.value)}
                                    className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-orange"
                                >
                                    <option value="">Todos los tableros</option>
                                    {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Responsable</label>
                                <select
                                    value={filterMemberId}
                                    onChange={(e) => setFilterMemberId(e.target.value)}
                                    className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-orange"
                                >
                                    <option value="">Todos los miembros</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar tarjeta por título..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange"
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 mb-6 min-h-[300px]">
                            {cards
                                .filter(c => {
                                    const matchTitle = c.title.toLowerCase().includes(searchQuery.toLowerCase());
                                    const matchBoard = !filterBoardId || c.boardId === filterBoardId;
                                    const matchMember = !filterMemberId || c.responsibleId === filterMemberId;
                                    return matchTitle && matchBoard && matchMember;
                                })
                                .slice(0, 50)
                                .map(card => {
                                    const board = boards.find(b => b.id === card.boardId);
                                    const resp = users.find(u => u.id === card.responsibleId);
                                    return (
                                        <div
                                            key={card.id}
                                            onClick={() => handleAddToCardFinish(card)}
                                            className="p-4 border border-gray-100 rounded-xl hover:bg-orange-50 hover:border-orange-200 cursor-pointer transition-all group"
                                        >
                                            <div className="font-bold text-gray-900 group-hover:text-brand-orange">{card.title}</div>
                                            <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-1">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded uppercase font-bold text-gray-500">
                                                    {board?.title || 'Sin Tablero'}
                                                </span>
                                                {resp && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-brand-orange font-bold">{resp.name}</span>
                                                    </>
                                                )}
                                                <span>•</span>
                                                <span>Creada el {new Date(card.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            }
                            {cards.filter(c => {
                                const matchTitle = c.title.toLowerCase().includes(searchQuery.toLowerCase());
                                const matchBoard = !filterBoardId || c.boardId === filterBoardId;
                                const matchMember = !filterMemberId || c.responsibleId === filterMemberId;
                                return matchTitle && matchBoard && matchMember;
                            }).length === 0 && (
                                    <div className="text-center py-10 text-gray-400">No se encontraron tarjetas con estos filtros.</div>
                                )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100 italic text-xs text-gray-400">
                            <button
                                onClick={() => setShowCardPicker(false)}
                                className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Inbox;
