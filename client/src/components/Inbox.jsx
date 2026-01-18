import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Mail, RefreshCw, ArrowRight, CheckCircle, Search, Archive } from 'lucide-react';
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

    useEffect(() => {
        loadUsers();
        loadBoards();
    }, []);

    useEffect(() => {
        if (users.length > 0) {
            fetchEmails();
        }
    }, [users, selectedUsers, activeTab]);

    const loadUsers = async () => {
        const u = await api.getUsers();
        setUsers(u);
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
        setEmails([]);

        try {
            const folder = activeTab === 'inbox' ? 'INBOX' : 'Archivo_Fichas/Correos_Procesados';

            // Determine users to fetch for
            let usersToFetch = [];
            if (selectedUsers.length > 0) {
                usersToFetch = users.filter(u => selectedUsers.includes(u.id));
            } else {
                usersToFetch = users; // Fetch ALL if none selected
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

    const handleArchive = async (uid, e) => {
        if (e) e.stopPropagation();
        // Removed confirm for smoother UX during testing, or we can add a toast notification later
        // if (!confirm("¿Archivar este correo?")) return; 

        await api.archiveEmail(currentUser, uid);
        setEmails(prev => prev.filter(em => em.id !== uid));
        if (selectedEmail && selectedEmail.id === uid) setSelectedEmail(null);
    };

    const handleConvertToCardStart = (email) => {
        setEmailToConvert(email);
        setShowSelector(true);
    };

    const handleContinueToCard = () => {
        setShowSelector(false);
        setShowCardModal(true);
    };

    const handleSaveCard = async (cardData) => {
        await api.createCard(cardData);

        // Automatically archive the email
        await api.archiveEmail(currentUser, emailToConvert.id);
        setEmails(prev => prev.filter(em => em.id !== emailToConvert.id));
        if (selectedEmail && selectedEmail.id === emailToConvert.id) setSelectedEmail(null);

        setShowCardModal(false);
        setEmailToConvert(null);
    };

    // Prepare card data from email
    const prefilledCard = emailToConvert ? {
        title: emailToConvert.subject,
        descriptionBlocks: [{
            id: Date.now(),
            text: `De: ${emailToConvert.from}\nFecha: ${emailToConvert.date}\n\n${emailToConvert.body}`,
            author: 'Sistema',
            date: new Date().toISOString()
        }],
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

                    <div className="flex px-2 translate-y-[1px]">
                        <button
                            onClick={() => setActiveTab('inbox')}
                            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inbox' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Entrada
                        </button>
                        <button
                            onClick={() => setActiveTab('archived')}
                            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'archived' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Archivados
                        </button>
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
                    {emails.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No hay correos {activeTab === 'inbox' ? 'pendientes' : 'archivados'}.
                        </div>
                    )}
                    {emails.map(email => (
                        <div
                            key={email.id}
                            onClick={() => setSelectedEmail(email)}
                            className={`p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${selectedEmail?.id === email.id ? 'bg-orange-50 border-orange-100' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`font-bold text-sm truncate pr-2 ${selectedEmail?.id === email.id ? 'text-brand-orange' : 'text-gray-800'}`}>
                                    {email.from}
                                </span>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                    {new Date(email.date).toLocaleDateString()}
                                </span>
                            </div>
                            <h4 className="text-sm font-medium text-gray-700 truncate mb-1">{email.subject}</h4>
                            <p className="text-xs text-gray-400 line-clamp-2">{email.body.substring(0, 100)}</p>
                        </div>
                    ))}
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
                                {activeTab === 'inbox' && (
                                    <button
                                        onClick={(e) => handleArchive(selectedEmail.id, e)}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                                    >
                                        <Archive size={16} /> Archivar
                                    </button>
                                )}
                                <button
                                    onClick={() => handleConvertToCardStart(selectedEmail)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-brand-black hover:bg-brand-orange rounded-lg shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2"
                                >
                                    <ArrowRight size={16} /> Convertir a Tarjeta
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
        </div>
    );
};

export default Inbox;
