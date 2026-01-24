import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../api';
import CardModal from './CardModal';
import { Plus, ArrowLeft, MoreHorizontal, Calendar, User, Trash2, Edit2, Lock, Unlock, Tag, Search, Filter } from 'lucide-react';


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
            className={`bg-white p-3 rounded-xl shadow-sm border transition-all group select-none relative
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

            {card.economic?.client && (
                <div className="flex items-center gap-1.5 mb-2">
                    <Tag size={10} className="text-blue-400" />
                    <span className="text-[9px] font-black text-blue-500 uppercase truncate max-w-full">{card.economic.client}</span>
                </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3 text-gray-400 text-[10px] font-bold">
                    {(timeString || isActive) && (
                        <div className={`flex items-center gap-1 ${isActive ? 'text-brand-orange' : ''}`}>
                            <Edit2 size={10} className={isActive ? "animate-pulse" : ""} />
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
                    {(card.attachments?.length > 0 || card.links?.length > 0) && (
                        <span className="text-[8px] font-black inline-flex items-center justify-center bg-gray-50 text-gray-400 border border-gray-100 w-5 h-5 rounded-lg">
                            {(card.attachments?.length || 0) + (card.links?.length || 0)}
                        </span>
                    )}
                    <div className="w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center text-[10px] font-black border border-white shadow-sm overflow-hidden">
                        {responsible ? responsible.charAt(0).toUpperCase() : <User size={10} />}
                    </div>
                </div>
            </div>
        </div>
    );
};


const Board = ({ selectedUsers, selectedClient, currentUser }) => {
    const { boardId } = useParams();
    const [board, setBoard] = useState(null);
    const [cards, setCards] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeDragCard, setActiveDragCard] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filter cards based on users and CLIENT
    const filteredCards = useMemo(() => {
        let result = cards;
        if (selectedUsers && selectedUsers.length > 0) {
            result = result.filter(c => selectedUsers.includes(c.responsibleId));
        }
        if (selectedClient) {
            result = result.filter(c => c.economic?.client === selectedClient || c.client === selectedClient);
        }
        return result;
    }, [cards, selectedUsers, selectedClient]);

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
        try {
            const data = await api.getData();
            const foundBoard = data.boards.find(b => b.id === boardId);
            if (foundBoard) {
                setBoard(foundBoard);
                setCards(data.cards.filter(c => c.boardId === boardId));
            }
            const userData = await api.getUsers();
            setUsers(userData || []);
        } catch (err) {
            console.error("Failed to load board data", err);
        }
    };

    const handleDragStart = (event) => {
        const { active } = event;
        const card = cards.find(c => c.id === active.id);
        setActiveDragCard(card);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;
        const activeId = active.id;
        const overId = over.id;
        const activeCard = cards.find(c => c.id === activeId);
        const overColumn = board.columns.find(col => col.id === overId);
        if (overColumn && activeCard.columnId !== overId) {
            setCards(prev => prev.map(c => c.id === activeId ? { ...c, columnId: overId } : c));
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveDragCard(null);
        if (!over) return;
        const activeId = active.id;
        const overId = over.id;
        const activeCard = cards.find(c => c.id === activeId);
        let newCards = [...cards];
        if (activeId !== overId) {
            const oldIndex = cards.findIndex(c => c.id === activeId);
            const newIndex = cards.findIndex(c => c.id === overId);
            newCards = arrayMove(cards, oldIndex, newIndex);
            setCards(newCards);
        }
        try {
            await api.updateCard(activeId, { columnId: activeCard.columnId, order: newCards.findIndex(c => c.id === activeId) });
        } catch (err) {
            console.error("Save drag failed", err);
            loadData();
        }
    };

    const addCard = (colId) => {
        setTargetColumnId(colId);
        setActiveCard(null);
        setIsModalOpen(true);
    };

    const onCardSave = async (savedCard) => {
        await loadData();
        setIsModalOpen(false);
    };

    if (!board) return <div className="p-20 text-center font-black uppercase text-gray-300 animate-pulse">Cargando Tablero...</div>;

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
                            {selectedClient && (
                                <span className="flex items-center gap-1 bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-bounce">
                                    <Tag size={10} /> Filtrando por {selectedClient}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar no-scrollbar">
                    {board.columns.map(col => {
                        const colCards = filteredCards.filter(c => c.columnId === col.id);
                        const isLocked = col.isLocked && !unlockedColumns.includes(col.id);

                        return (
                            <div key={col.id} className="min-w-[320px] max-w-[320px] flex flex-col bg-brand-lightgray/50 rounded-[2rem] border border-gray-100/50 p-4">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-black text-xs uppercase text-gray-500 tracking-widest">{col.title}</h3>
                                        <span className="bg-white border border-gray-100 text-[10px] font-black text-gray-400 px-2.5 py-0.5 rounded-full">{colCards.length}</span>
                                    </div>
                                    <button onClick={() => addCard(col.id)} className="p-2 hover:bg-brand-orange hover:text-white text-gray-400 rounded-xl transition-all"><Plus size={16} /></button>
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
                                            {colCards.map(card => (
                                                <SortableCard key={card.id} card={card} isLocked={col.isLocked} onClick={c => { setActiveCard(c); setIsModalOpen(true); }} />
                                            ))}
                                            {colCards.length === 0 && (
                                                <div className="py-12 border-2 border-dashed border-gray-200 rounded-[1.5rem] flex flex-col items-center justify-center text-gray-300 gap-3 opacity-50">
                                                    <Layout size={24} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Sin proyectos</span>
                                                </div>
                                            )}
                                        </SortableContext>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <DragOverlay>
                    {activeDragCard ? (
                        <div className="bg-white p-3 rounded-xl shadow-2xl border-2 border-brand-orange scale-105 opacity-90 rotate-2">
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
                    onSave={onCardSave}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export default Board;
