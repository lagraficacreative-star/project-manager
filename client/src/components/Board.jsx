import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../api';
import CardModal from './CardModal';
import { Plus, ArrowLeft, MoreHorizontal, Calendar, User, Trash2, Edit2, Lock, Unlock } from 'lucide-react';


const SortableCard = ({ card, onClick, isLocked }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const handleClick = (e) => {
        // We always allow opening the card to view, even if locked
        // The lock is for editing sensitive data inside if implemented
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
            className={`bg-white p-3 rounded-lg shadow-sm border transition-all group select-none relative
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

            <h4 className="font-semibold text-brand-black text-sm mb-3 line-clamp-2 leading-snug">{card.title}</h4>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3 text-gray-400 text-xs">
                    {(timeString || isActive) && (
                        <div className={`flex items-center gap-1 ${isActive ? 'text-brand-orange font-bold' : ''}`}>
                            <Edit2 size={10} className={isActive ? "animate-pulse" : ""} />
                            <span>{isActive ? "En curso..." : timeString}</span>
                        </div>
                    )}
                    {card.dueDate && !timeString && !isActive && (
                        <div className={`flex items-center gap-1 ${new Date(card.dueDate) < new Date() ? 'text-red-500 font-medium' : ''}`}>
                            <Calendar size={12} />
                            <span>{new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {(card.attachments?.length > 0 || card.links?.length > 0) && (
                        <span className="text-[10px] inline-flex items-center justify-center bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            📎 {(card.attachments?.length || 0) + (card.links?.length || 0)}
                        </span>
                    )}
                    <div className="w-6 h-6 rounded-full bg-brand-lightgray/50 flex items-center justify-center text-[10px] text-gray-500 font-bold border border-white shadow-sm">
                        {responsible ? responsible.charAt(0).toUpperCase() : <User size={12} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Board = ({ selectedUsers, currentUser }) => {
    const { boardId } = useParams();
    const [board, setBoard] = useState(null);
    const [cards, setCards] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeDragCard, setActiveDragCard] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Persistent Unlock for Columns
    const [unlockedColumns, setUnlockedColumns] = useState(() => {
        const saved = localStorage.getItem('unlockedColumns');
        return saved ? JSON.parse(saved) : [];
    });

    const [passwordInput, setPasswordInput] = useState('');
    const [activeCard, setActiveCard] = useState(null);
    const [targetColumnId, setTargetColumnId] = useState(null);

    const [editingColId, setEditingColId] = useState(null);
    const [tempColTitle, setTempColTitle] = useState("");
    const [isAddingCol, setIsAddingCol] = useState(false);
    const [newColTitle, setNewColTitle] = useState("");

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

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveDragCard(null);
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;
        const activeCard = cards.find(c => c.id === activeId);
        if (!activeCard) return;

        let newColumnId;
        const isOverColumn = board.columns.find(col => col.id === overId);
        if (isOverColumn) {
            newColumnId = overId;
        } else {
            const overCard = cards.find(c => c.id === overId);
            if (overCard) {
                newColumnId = overCard.columnId;
            } else {
                return;
            }
        }

        if (activeCard.columnId !== newColumnId) {
            setCards(prev => prev.map(c =>
                c.id === activeId ? { ...c, columnId: newColumnId } : c
            ));
            await api.updateCard(activeId, { columnId: newColumnId });
        }
    };

    const handleCreateCard = (columnId) => {
        setActiveCard(null);
        setTargetColumnId(columnId);
        setIsModalOpen(true);
    };

    const handleEditCard = (card) => {
        setActiveCard(card);
        setTargetColumnId(card.columnId);
        setIsModalOpen(true);
    };

    const handleSaveCard = async (cardData) => {
        if (activeCard) {
            await api.updateCard(activeCard.id, cardData);
        } else {
            await api.createCard({ ...cardData, boardId: board.id });
        }
        loadData();
        setIsModalOpen(false);
    };

    const startRenaming = (col) => {
        setEditingColId(col.id);
        setTempColTitle(col.title);
    };

    const saveColumnTitle = async () => {
        if (!editingColId) return;
        const col = board.columns.find(c => c.id === editingColId);
        if (tempColTitle.trim() && tempColTitle !== col?.title) {
            try {
                const newCols = board.columns.map(c => c.id === editingColId ? { ...c, title: tempColTitle.trim() } : c);
                setBoard(prev => ({ ...prev, columns: newCols }));
                await api.updateBoard(board.id, { columns: newCols });
            } catch (err) {
                loadData();
                alert("Error al renombrar la columna");
            }
        }
        setEditingColId(null);
    };

    const handleDeleteCard = async (cardId) => {
        if (!confirm("¿Seguro que quieres borrar esta tarjeta?")) return;
        try {
            await api.deleteCard(cardId);
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            alert("Error al borrar la tarjeta");
        }
    };

    const saveNewColumn = async () => {
        if (newColTitle.trim()) {
            try {
                const newCol = { id: 'col_' + Date.now(), title: newColTitle.trim() };
                const newCols = [...board.columns, newCol];
                setBoard(prev => ({ ...prev, columns: newCols }));
                await api.updateBoard(board.id, { columns: newCols });
                setIsAddingCol(false);
                setNewColTitle("");
            } catch (err) {
                loadData();
                alert("Error al añadir columna");
            }
        }
    };

    const confirmDeleteColumn = async (colId) => {
        if (!confirm("¿Borrar columna y mover tarjetas?")) return;
        try {
            const newCols = board.columns.filter(c => c.id !== colId);
            setBoard(prev => ({ ...prev, columns: newCols }));
            await api.updateBoard(board.id, { columns: newCols });
            loadData();
        } catch (err) {
            alert("Error al borrar columna");
        }
    };

    if (!board) return <div className="p-8 text-center text-gray-500">Cargando tablero...</div>;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 md:mb-8 shrink-0">
                <div className="flex items-center gap-3 w-full">
                    <Link to="/" className="p-2 hover:bg-white rounded-xl text-gray-400 border border-transparent hover:border-gray-200 transition-all shrink-0">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-2xl font-black text-brand-black truncate tracking-tight">{board.title}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-1">Gestión de Proyecto</p>
                    </div>
                </div>
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                <div className="flex-1 overflow-x-auto flex items-start gap-4 md:gap-6 pb-4 no-scrollbar">
                    {board.columns.map(col => {
                        const colCards = cards.filter(c => c.columnId === col.id).filter(c => {
                            if (selectedUsers.length === 0) return true;
                            const resp = c.responsibleId || c.assignee;
                            const all = [resp, ...(c.assigneeIds || [])].filter(Boolean);
                            return all.some(uid => selectedUsers.includes(uid));
                        });
                        const isFacturacion = col.title.toLowerCase().includes('facturación');
                        const isColLocked = isFacturacion && !unlockedColumns.includes(col.id);

                        return (
                            <div key={col.id} className="min-w-[280px] md:min-w-[300px] w-[280px] md:w-[300px] bg-brand-lightgray rounded-xl flex flex-col max-h-full shadow-sm">
                                {/* Column Header */}
                                <div className="p-4 flex justify-between items-center sticky top-0 bg-brand-lightgray rounded-t-xl z-10 group/header">
                                    <div className="flex items-center gap-2 flex-1 min-w-0 h-8">
                                        {editingColId === col.id ? (
                                            <input
                                                autoFocus
                                                value={tempColTitle}
                                                onChange={(e) => setTempColTitle(e.target.value)}
                                                onBlur={saveColumnTitle}
                                                onKeyDown={(e) => e.key === 'Enter' && saveColumnTitle()}
                                                className="w-full text-sm font-bold border-brand-orange rounded px-1 py-0.5 outline-none"
                                            />
                                        ) : (
                                            <>
                                                <h3 className="font-bold text-brand-black truncate cursor-pointer" onClick={() => startRenaming(col)}>{col.title}</h3>
                                                <Edit2 size={12} className="text-gray-300 opacity-0 group-hover/header:opacity-100 cursor-pointer" onClick={() => startRenaming(col)} />
                                            </>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded-full">{colCards.length}</span>
                                    <button onClick={() => confirmDeleteColumn(col.id)} className="p-1 hover:text-red-500 text-gray-300 transition-colors"><Trash2 size={14} /></button>
                                </div>

                                {isColLocked && (
                                    <div className="px-4 py-3 bg-orange-50 border-y border-orange-100 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-orange-600">
                                            <Lock size={12} />
                                            <span className="text-[10px] font-bold uppercase">Facturación Bloqueada</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <input
                                                type="password"
                                                value={passwordInput}
                                                onChange={(e) => setPasswordInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUnlockColumn(col.id)}
                                                placeholder="Contraseña..."
                                                className="flex-1 px-2 py-1 border border-orange-200 rounded text-[10px] outline-none"
                                            />
                                            <button onClick={() => handleUnlockColumn(col.id)} className="px-2 py-1 bg-brand-black text-white rounded text-[10px] font-bold">Ok</button>
                                        </div>
                                    </div>
                                )}

                                <SortableContext items={colCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[100px]">
                                        {colCards.map(card => (
                                            <SortableCard
                                                key={card.id}
                                                card={card}
                                                onClick={handleEditCard}
                                                isLocked={isColLocked}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>

                                <div className="p-3">
                                    <button onClick={() => handleCreateCard(col.id)} className="w-full py-2 flex items-center justify-center gap-2 text-brand-gray hover:text-brand-orange hover:bg-white rounded-lg transition-all text-sm font-medium border border-transparent">
                                        <Plus size={16} /> Añadir tarjeta
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {isAddingCol ? (
                        <div className="min-w-[280px] w-[280px] bg-white rounded-xl p-4 border border-brand-orange shadow-lg">
                            <input
                                autoFocus
                                placeholder="Título de la columna..."
                                value={newColTitle}
                                onChange={(e) => setNewColTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveNewColumn()}
                                className="w-full p-2 mb-3 border rounded-lg text-sm outline-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsAddingCol(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                                <button onClick={saveNewColumn} className="px-3 py-1.5 text-xs text-white bg-brand-black rounded-md">Añadir</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsAddingCol(true)} className="min-w-[280px] h-[50px] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:border-brand-orange transition-all font-medium">+ Añadir Columna</button>
                    )}
                </div>

                <DragOverlay>
                    {activeDragCard ? (
                        <div className="bg-white p-4 rounded-xl shadow-2xl border border-brand-orange rotate-3 w-[280px]">
                            <h3 className="font-semibold text-brand-black mb-2">{activeDragCard.title}</h3>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <CardModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                card={activeCard}
                columnId={targetColumnId}
                boardId={boardId}
                onSave={handleSaveCard}
                onDelete={handleDeleteCard}
                currentUser={currentUser}
            />
        </div>
    );
};

export default Board;
