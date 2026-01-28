import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, rectIntersection, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../api';
import CardModal from './CardModal';
import { Plus, ArrowLeft, MoreHorizontal, Calendar, User, Lock, Tag, Layout, Search, Link as LinkIcon } from 'lucide-react';


const SortableCard = ({ card, onClick, isLocked }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const handleClick = (e) => {
        onClick(card);
    };

    const totalDuration = (card.timeLogs || []).reduce((acc, log) => acc + log.duration, 0);
    const formatTime = (ms) => {
        if (!ms) return null;
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        return `${hours}h ${minutes}m`;
    };
    const timeString = formatTime(totalDuration);
    const isActive = !!card.activeTimerStart;
    const responsible = card.responsibleId || card.assignee;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            className={`bg-white p-3 rounded-xl shadow-sm border transition-all group select-none relative h-fit 
                ${isActive ? 'border-brand-orange ring-1 ring-brand-orange/20 cursor-pointer shadow-md' :
                    'border-brand-lightgray hover:border-brand-orange/30 cursor-pointer hover:shadow-md'}`}
        >
            {isLocked && (
                <div className="absolute top-2 right-2 z-10">
                    <Lock size={12} className="text-orange-400" />
                </div>
            )}
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider 
                    ${card.priority === 'high' ? 'bg-red-50 text-red-600' :
                        card.priority === 'medium' ? 'bg-orange-50 text-orange-600' :
                            'bg-green-50 text-green-600'}`}>
                    {card.priority === 'high' ? 'Alta' : card.priority === 'medium' ? 'Media' : 'Baja'}
                </span>
                {isActive && (
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-orange"></span>
                    </span>
                )}
            </div>

            <h4 className="font-bold text-gray-800 text-xs mb-3 line-clamp-2 leading-relaxed">{card.title}</h4>

            {card.labels && card.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {card.labels.map((label, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            {label}
                        </span>
                    ))}
                </div>
            )}

            {(card.economic?.client || card.client) && (
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Tag size={10} className="text-blue-400" />
                        <span className="text-[9px] font-black text-blue-500 uppercase truncate pr-2">{card.economic?.client || card.client}</span>
                    </div>
                    {card.links && card.links.length > 0 && (
                        <a
                            href={card.links[0].url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand-orange hover:scale-110 transition-transform"
                        >
                            <LinkIcon size={12} />
                        </a>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3 text-gray-400 text-[10px] font-bold">
                    {(timeString || isActive) && (
                        <div className={`flex items-center gap-1 ${isActive ? 'text-brand-orange' : ''}`}>
                            <span className={isActive ? "animate-pulse" : ""}>⏱</span>
                            <span>{isActive ? "En curso..." : timeString}</span>
                        </div>
                    )}
                    {card.dueDate && !timeString && !isActive && (
                        <div className={`flex items-center gap-1 ${new Date(card.dueDate) < new Date() ? 'text-red-500' : ''}`}>
                            <Calendar size={10} />
                            <span>{new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {(card.sourceEmailDate || card.createdAt) && (
                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mr-1 flex items-center gap-1">
                            <Clock size={8} />
                            {card.sourceEmailDate ? 'Mail: ' : 'Ficha: '}
                            {new Date(card.sourceEmailDate || card.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </div>
                    )}
                    <div className="w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center text-[10px] font-black border border-white shadow-sm overflow-hidden text-center">
                        {responsible ? responsible.charAt(0).toUpperCase() : <User size={10} />}
                    </div>
                </div>
            </div>
        </div>
    );
};


const DroppableColumn = ({ col, children, colCards, addCard, isLocked, passwordInput, setPasswordInput, handleUnlockColumn }) => {
    const { setNodeRef } = useDroppable({
        id: col.id,
    });

    return (
        <div
            ref={setNodeRef}
            className="min-w-[320px] max-w-[320px] flex flex-col bg-brand-lightgray/50 rounded-[2rem] border border-gray-100/50 p-4"
        >
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-3">
                    <h3 className="font-black text-xs uppercase text-gray-500 tracking-widest">{col.title}</h3>
                    <span className="bg-white border border-gray-100 text-[10px] font-black text-gray-400 px-2.5 py-0.5 rounded-full">{colCards.length}</span>
                </div>
                <button onClick={() => addCard(col.id)} className="p-2 hover:bg-brand-orange hover:text-white text-gray-400 rounded-xl transition-all">
                    <Plus size={16} />
                </button>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar pr-1 pb-4">
                {isLocked ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-[1.5rem] border border-dashed border-gray-200 p-8 text-center space-y-4 shadow-inner">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-300"><Lock size={20} /></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contenido Bloqueado</p>
                        <div className="w-full space-y-2">
                            <input
                                type="password"
                                placeholder="Contraseña..."
                                className="w-full p-3 bg-white border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-orange/20"
                                value={passwordInput}
                                onChange={e => setPasswordInput(e.target.value)}
                            />
                            <button onClick={() => handleUnlockColumn(col.id)} className="w-full bg-brand-orange text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/10">DESBLOQUEAR</button>
                        </div>
                    </div>
                ) : (
                    <SortableContext items={colCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {children}
                        {colCards.length === 0 && (
                            <div className="py-12 border-2 border-dashed border-gray-200 rounded-[1.5rem] flex flex-col items-center justify-center text-gray-300 gap-3 opacity-50">
                                <Layout size={24} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Sin proyectos con los filtros actuales</span>
                            </div>
                        )}
                    </SortableContext>
                )}
            </div>
        </div>
    );
};


const Board = ({ selectedUsers, selectedClient, currentUser, isManagementUnlocked, unlockManagement, AUTHORIZED_EMAILS }) => {
    const { boardId } = useParams();
    const [board, setBoard] = useState(null);
    const [cards, setCards] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeDragCard, setActiveDragCard] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [localSelectedClient, setLocalSelectedClient] = useState(selectedClient || '');
    const [loading, setLoading] = useState(true);

    // Get unique clients & labels for filter
    const filterOptions = useMemo(() => {
        const options = new Set();
        cards.forEach(c => {
            if (!c) return;
            const clientName = c.economic?.client || c.client;
            if (clientName) options.add(clientName);
            if (c.labels && Array.isArray(c.labels)) {
                c.labels.forEach(l => options.add(l));
            }
        });
        return Array.from(options).sort();
    }, [cards]);

    const [cardsSearch, setCardsSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState('');
    const [allBoards, setAllBoards] = useState([]);

    // Filter cards based on users, CLIENT and Search
    const filteredCards = useMemo(() => {
        let result = cards;

        // Prop filter (App.jsx) - Only apply if it doesn't empty the board completely for specific users
        if (selectedUsers && selectedUsers.length > 0) {
            const hasMatches = result.some(c => c && selectedUsers.includes(c.responsibleId));
            if (hasMatches) {
                result = result.filter(c => c && selectedUsers.includes(c.responsibleId));
            }
        }

        // Local Member filter
        if (selectedMember) {
            result = result.filter(c => c && c.responsibleId === selectedMember);
        }

        // Client/Tag Filter
        const clientFilter = localSelectedClient || selectedClient;
        if (clientFilter) {
            result = result.filter(c =>
                c && (
                    (c.economic?.client === clientFilter) ||
                    (c.client === clientFilter) ||
                    (c.labels && Array.isArray(c.labels) && c.labels.includes(clientFilter))
                )
            );
        }

        // Text Search
        if (cardsSearch.trim()) {
            const q = cardsSearch.toLowerCase();
            result = result.filter(c =>
                c && (
                    c.title?.toLowerCase().includes(q) ||
                    (c.client || c.economic?.client)?.toLowerCase().includes(q)
                )
            );
        }

        return result;
    }, [cards, selectedUsers, selectedClient, localSelectedClient, cardsSearch, selectedMember]);

    const [unlockedColumns, setUnlockedColumns] = useState(() => {
        const saved = localStorage.getItem('unlockedColumns');
        return saved ? JSON.parse(saved) : [];
    });

    const [passwordInput, setPasswordInput] = useState('');
    const [activeCard, setActiveCard] = useState(null);
    const [targetColumnId, setTargetColumnId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        loadData();
    }, [boardId]);

    const handleUnlockColumn = (colId) => {
        if (passwordInput === 'lagrafica2025') {
            const newUnlocked = [...unlockedColumns, colId];
            setUnlockedColumns(newUnlocked);
            localStorage.setItem('unlockedColumns', JSON.stringify(newUnlocked));
            setPasswordInput('');
        } else {
            alert("Contraseña incorrecta");
        }
    };


    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.getData();
            setAllBoards(data.boards || []);
            const foundBoard = (data.boards || []).find(b => b.id === boardId);
            if (foundBoard) {
                setBoard(foundBoard);
                setCards((data.cards || []).filter(c => c && c.boardId === boardId).sort((a, b) => (a.order || 0) - (b.order || 0)));
            } else {
                setBoard(null);
            }
            const userData = await api.getUsers();
            setUsers(userData || []);
        } catch (err) {
            console.error("Failed to load board data", err);
        } finally {
            setLoading(false);
        }
    };

    const findContainer = (id) => {
        if (!board) return null;
        if (board.columns.some(col => col.id === id)) return id;
        const card = cards.find(c => c && c.id === id);
        return card ? card.columnId : null;
    };

    const handleDragStart = (event) => {
        const { active } = event;
        const card = cards.find(c => c && c.id === active.id);
        setActiveDragCard(card);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        setCards(prev => {
            const activeIndex = prev.findIndex(c => c && c.id === activeId);
            const overIndex = prev.findIndex(c => c && c.id === overId);

            let newIndex;
            if (board.columns.some(col => col.id === overId)) {
                newIndex = prev.length;
            } else {
                newIndex = overIndex >= 0 ? overIndex : prev.length;
            }

            const newCards = [...prev];
            newCards[activeIndex] = { ...newCards[activeIndex], columnId: overContainer };
            return arrayMove(newCards, activeIndex, newIndex);
        });
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveDragCard(null);
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer) return;

        const activeIndex = cards.findIndex(c => c && c.id === activeId);
        const overIndex = cards.findIndex(c => c && c.id === overId);

        let newCards = [...cards];
        if (activeContainer === overContainer) {
            if (activeIndex !== overIndex && overIndex !== -1) {
                newCards = arrayMove(cards, activeIndex, overIndex);
            }
        } else {
            newCards[activeIndex] = { ...newCards[activeIndex], columnId: overContainer };
            if (overIndex !== -1) {
                const newOverIndex = newCards.findIndex(c => c && c.id === overId);
                newCards = arrayMove(newCards, activeIndex, newOverIndex);
            }
        }

        setCards(newCards);

        try {
            const cardsInCol = newCards.filter(c => c && c.columnId === overContainer);
            const finalIndex = cardsInCol.findIndex(c => c && c.id === activeId);

            await api.updateCard(activeId, {
                columnId: overContainer,
                order: finalIndex >= 0 ? finalIndex : 0
            });
        } catch (err) {
            console.error("Save drag failed", err);
            loadData();
        }
    };

    const handleCardSave = async (cardData) => {
        try {
            if (activeCard) {
                await api.updateCard(activeCard.id, cardData);
            } else {
                await api.createCard({ ...cardData, boardId, columnId: targetColumnId });
            }
            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            console.error("Failed to save card", err);
            alert("Error al guardar la tarjeta");
        }
    };

    if (loading) return <div className="p-20 text-center font-black uppercase text-gray-300 animate-pulse">Cargando Tablero...</div>;

    if (!board) return (
        <div className="p-20 text-center flex flex-col items-center gap-6">
            <h2 className="text-2xl font-black text-gray-400 uppercase tracking-tighter">Tablero no encontrado</h2>
            <Link to="/" className="px-8 py-4 bg-brand-orange text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Volver al Dashboard</Link>
        </div>
    );


    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 px-1">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-3 bg-white hover:bg-orange-50 text-gray-400 hover:text-brand-orange rounded-2xl shadow-sm border border-gray-100 transition-all">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-black text-brand-black tracking-tighter uppercase">{board.title}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cards.length} PROYECTOS EN TOTAL</span>
                            {(selectedClient || localSelectedClient) && (
                                <span className="flex items-center gap-1 bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-bounce">
                                    <Tag size={10} /> Filtrando por {localSelectedClient || selectedClient}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-64 min-w-[200px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            value={cardsSearch}
                            onChange={(e) => setCardsSearch(e.target.value)}
                            placeholder="BUSCAR PROYECTO O CLIENTE..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-2 focus:ring-brand-orange/20 shadow-sm"
                        />
                    </div>

                    {/* Member Filter */}
                    <div className="relative flex-1 sm:w-48 min-w-[150px]">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <select
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-2 focus:ring-brand-orange/20 shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="">TODOS MIEMBROS</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Client Filter */}
                    <div className="relative flex-1 sm:w-64 min-w-[200px]">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <select
                            value={localSelectedClient}
                            onChange={(e) => setLocalSelectedClient(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-2 focus:ring-brand-orange/20 shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="">TODOS LOS FILTROS (CLIENTES/ETIQUETAS)</option>
                            {filterOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <MoreHorizontal size={14} className="rotate-90" />
                        </div>
                    </div>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar no-scrollbar">
                    {board.columns.map(col => {
                        const colCards = filteredCards.filter(c => c && c.columnId === col.id);
                        const isLocked = col.isLocked && !unlockedColumns.includes(col.id);

                        return (
                            <DroppableColumn
                                key={col.id}
                                col={col}
                                colCards={colCards}
                                isLocked={isLocked}
                                addCard={(cid) => { setTargetColumnId(cid); setActiveCard(null); setIsModalOpen(true); }}
                                passwordInput={passwordInput}
                                setPasswordInput={setPasswordInput}
                                handleUnlockColumn={handleUnlockColumn}
                            >
                                {colCards.map(card => (
                                    <SortableCard
                                        key={card.id}
                                        card={card}
                                        isLocked={col.isLocked}
                                        onClick={c => { setActiveCard(c); setIsModalOpen(true); }}
                                    />
                                ))}
                            </DroppableColumn>
                        );
                    })}
                </div>

                <DragOverlay>
                    {activeDragCard ? (
                        <div className="bg-white p-3 rounded-xl shadow-2xl border-2 border-brand-orange scale-105 opacity-90 rotate-2 pointer-events-none">
                            <h4 className="font-bold text-gray-800 text-xs">{activeDragCard.title}</h4>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {isModalOpen && (
                <CardModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    card={activeCard}
                    columnId={targetColumnId}
                    boardId={boardId}
                    onSave={handleCardSave}
                    currentUser={currentUser}
                    allBoards={allBoards}
                    allClients={filterOptions}
                    isManagementUnlocked={isManagementUnlocked}
                    unlockManagement={unlockManagement}
                />
            )}
        </div>
    );
};

export default Board;
