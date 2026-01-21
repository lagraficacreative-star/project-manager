import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../api';
import CardModal from './CardModal';
import { Plus, ArrowLeft, MoreHorizontal, Calendar, User, Trash2, Edit2, Lock, Unlock } from 'lucide-react';
import MemberFilter from './MemberFilter';

const SortableCard = ({ card, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    // Calculate time
    const totalDuration = (card.timeLogs || []).reduce((acc, log) => acc + log.duration, 0);
    const formatTime = (ms) => {
        if (!ms) return null;
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        return `${hours}h ${minutes}m`;
    };
    const timeString = formatTime(totalDuration);
    const isActive = !!card.activeTimerStart;

    // Resolve Responsible
    const responsible = card.responsibleId || card.assignee;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(card)}
            className={`bg-white p-3 rounded-lg shadow-sm border hover:shadow-md cursor-pointer transition-all group select-none relative
                ${isActive ? 'border-brand-orange ring-1 ring-brand-orange/20' : 'border-brand-lightgray hover:border-brand-orange/30'}`}
        >
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
                    {/* Time Tracking Badge */}
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

const Board = () => {
    const { boardId } = useParams();
    const [board, setBoard] = useState(null);
    const [cards, setCards] = useState([]);
    const [users, setUsers] = useState([]); // Users State
    const [selectedUsers, setSelectedUsers] = useState([]); // Filter State
    const [activeDragCard, setActiveDragCard] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [unlockedColumns, setUnlockedColumns] = useState([]); // Track IDs of unlocked columns
    const [passwordInput, setPasswordInput] = useState('');
    const [activeCard, setActiveCard] = useState(null);
    const [targetColumnId, setTargetColumnId] = useState(null);

    // --- NEW STATE FOR INLINE EDITING ---
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

    const toggleUserFilter = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleUnlockColumn = (colId) => {
        if (passwordInput === 'admin123') {
            setUnlockedColumns(prev => [...prev, colId]);
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

            // Load Users
            const userData = await api.getUsers();
            setUsers(userData || []);
        } catch (err) {
            console.error("Failed to load board data", err);
        }
    };

    // --- DND HANDLERS ---
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

    // --- CARD HANDLERS ---
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

    // --- COLUMN RENAME LOGIC ---
    const startRenaming = (col) => {
        setEditingColId(col.id);
        setTempColTitle(col.title);
    };

    const saveColumnTitle = async () => {
        if (!editingColId) return;
        if (tempColTitle.trim() && tempColTitle !== board.columns.find(c => c.id === editingColId)?.title) {
            try {
                const newCols = board.columns.map(c => c.id === editingColId ? { ...c, title: tempColTitle.trim() } : c);
                // Optimistic
                setBoard(prev => ({ ...prev, columns: newCols }));
                await api.updateBoard(board.id, { columns: newCols });
            } catch (err) {
                console.error("Error renaming column:", err);
                loadData(); // Revert
                alert("Error al renombrar la columna");
            }
        }
        setEditingColId(null);
        setTempColTitle("");
    };

    const cancelRenaming = () => {
        setEditingColId(null);
        setTempColTitle("");
    };

    // --- ADD COLUMN LOGIC ---
    const saveNewColumn = async () => {
        if (newColTitle.trim()) {
            try {
                const newCol = { id: 'col_' + Date.now(), title: newColTitle.trim() };
                const newCols = [...board.columns, newCol];
                // Optimistic
                setBoard(prev => ({ ...prev, columns: newCols }));
                await api.updateBoard(board.id, { columns: newCols });
                setIsAddingCol(false);
                setNewColTitle("");
            } catch (err) {
                console.error("Error adding column:", err);
                loadData();
                alert("Error al añadir columna");
            }
        }
    };

    // --- DELETE COLUMN LOGIC ---
    const [deletingColId, setDeletingColId] = useState(null);

    const confirmDeleteColumn = async (colId) => {
        try {
            const newCols = board.columns.filter(c => c.id !== colId);
            setBoard(prev => ({ ...prev, columns: newCols }));
            await api.updateBoard(board.id, { columns: newCols });
            setDeletingColId(null);
            loadData(); // Sync fully
        } catch (err) {
            console.error("Error deleting column:", err);
            alert("Error al borrar columna");
        }
    };

    if (!board) return <div className="p-8 text-center text-gray-500">Cargando tablero...</div>;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-white rounded-full text-brand-gray transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold text-brand-black">{board.title}</h1>
                </div>

                {/* Member Filter Row */}
                <div className="mb-6">
                    <MemberFilter
                        users={users}
                        selectedUsers={selectedUsers}
                        onToggleUser={toggleUserFilter}
                        onClear={() => setSelectedUsers([])}
                    />
                </div>
            </div>

            {/* Canvas */}
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                <div className="flex-1 overflow-x-auto flex items-start gap-6 pb-4">
                    {board.columns.map(col => {
                        const colCards = cards.filter(c => c.columnId === col.id).filter(c => {
                            if (selectedUsers.length === 0) return true;
                            const responsible = c.responsibleId || c.assignee;
                            const allAssignees = [responsible, ...(c.assigneeIds || [])].filter(Boolean);
                            return allAssignees.some(uid => selectedUsers.includes(uid));
                        });
                        return (
                            <div key={col.id} className="min-w-[300px] w-[300px] bg-brand-lightgray rounded-xl flex flex-col max-h-full">
                                {/* Column Header */}
                                <div className="p-4 flex justify-between items-center sticky top-0 bg-brand-lightgray rounded-t-xl z-10 group/header">
                                    <div className="flex items-center gap-2 flex-1 min-w-0 h-8">
                                        {editingColId === col.id ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                value={tempColTitle}
                                                onChange={(e) => setTempColTitle(e.target.value)}
                                                onBlur={saveColumnTitle}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveColumnTitle();
                                                    if (e.key === 'Escape') cancelRenaming();
                                                }}
                                                className="w-full text-sm font-bold border-brand-orange rounded px-1 py-0.5 focus:ring-1 focus:ring-brand-orange outline-none"
                                            />
                                        ) : (
                                            <>
                                                <h3
                                                    className="font-bold text-brand-black truncate cursor-pointer hover:underline decoration-brand-orange/50"
                                                    onClick={() => startRenaming(col)}
                                                    title="Click para renombrar"
                                                >
                                                    {col.title}
                                                </h3>
                                                <button
                                                    onClick={() => startRenaming(col)}
                                                    className="p-1 text-gray-400 hover:text-brand-orange opacity-0 group-hover/header:opacity-100 transition-opacity"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded-full">{colCards.length}</span>

                                        {deletingColId === col.id ? (
                                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg animate-in fade-in slide-in-from-right-5 duration-200 absolute right-4 z-20 shadow-sm border border-red-100">
                                                <span className="text-[10px] text-red-600 font-bold whitespace-nowrap">¿Borrar?</span>
                                                <button
                                                    onClick={() => confirmDeleteColumn(col.id)}
                                                    className="p-1 text-red-600 hover:bg-red-200 rounded transition-colors"
                                                    title="Confirmar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingColId(null)}
                                                    className="p-1 text-gray-500 hover:bg-gray-200 rounded transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <ArrowLeft size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeletingColId(col.id)}
                                                className="p-1 hover:bg-red-100 hover:text-red-500 rounded text-gray-400 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {col.title.toLowerCase() === 'facturación' && !unlockedColumns.includes(col.id) ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                        <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange mb-2">
                                            <Lock size={32} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">Venta Bloqueada</h4>
                                            <p className="text-[10px] text-gray-500 mt-1">Introduce la contraseña de Admin para ver esta columna.</p>
                                        </div>
                                        <div className="flex flex-col gap-2 w-full">
                                            <input
                                                type="password"
                                                value={passwordInput}
                                                onChange={(e) => setPasswordInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUnlockColumn(col.id)}
                                                placeholder="Contraseña..."
                                                className="w-full text-center py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-orange outline-none"
                                            />
                                            <button
                                                onClick={() => handleUnlockColumn(col.id)}
                                                className="w-full py-2 bg-brand-black text-white rounded-lg text-[10px] font-bold hover:bg-brand-orange transition-colors"
                                            >
                                                Desbloquear
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Droppable Area */}
                                        <SortableContext items={colCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[100px]" id={col.id}>
                                                {colCards.map(card => (
                                                    <SortableCard key={card.id} card={card} onClick={handleEditCard} />
                                                ))}
                                            </div>
                                        </SortableContext>

                                        {/* Footer */}
                                        <div className="p-3">
                                            <button
                                                onClick={() => handleCreateCard(col.id)}
                                                className="w-full py-2 flex items-center justify-center gap-2 text-brand-gray hover:text-brand-orange hover:bg-white rounded-lg transition-all text-sm font-medium border border-transparent hover:border-brand-orange/20"
                                            >
                                                <Plus size={16} />
                                                Añadir tarjeta
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {/* Add Column Section */}
                    {isAddingCol ? (
                        <div className="min-w-[300px] w-[300px] bg-white rounded-xl p-4 border border-brand-orange/20 shadow-lg h-fit">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Título de la columna..."
                                value={newColTitle}
                                onChange={(e) => setNewColTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveNewColumn();
                                    if (e.key === 'Escape') { setIsAddingCol(false); setNewColTitle(""); }
                                }}
                                className="w-full p-2 mb-3 border border-gray-200 rounded-lg text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setIsAddingCol(false); setNewColTitle(""); }}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveNewColumn}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-brand-black hover:bg-brand-orange rounded-md transition-colors"
                                >
                                    Añadir
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingCol(true)}
                            className="min-w-[300px] h-[50px] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:border-brand-orange hover:text-brand-orange transition-all font-medium"
                        >
                            + Añadir Columna
                        </button>
                    )}
                </div>

                <DragOverlay>
                    {activeDragCard ? (
                        <div className="bg-white p-4 rounded-xl shadow-2xl border border-brand-orange rotate-3 cursor-grabbing opacity-90 scale-105 w-[280px]">
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
                boardId={board.id}
                onSave={handleSaveCard}
            />
        </div>
    );
};

export default Board;
