import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { getTasks, updateTaskStatus } from '../lib/api';
import TaskCard from './TaskCard';

const COLUMNS = [
    { id: 'todo', title: 'To Do', color: 'bg-white/5 border-white/10' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500/10 border-blue-500/20' },
    { id: 'review', title: 'Review', color: 'bg-amber-500/10 border-amber-500/20' },
    { id: 'done', title: 'Done', color: 'bg-green-500/10 border-green-500/20' }
];

const Board = () => {
    const { type } = useParams();
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        // Fetch data when board type changes
        getTasks().then(data => {
            // Filter tasks by scope/type if needed
            // For now we simulate filtering
            const allTasks = data.tasks || [];
            const filtered = type ? allTasks.filter(t => t.scope === type || type === 'all') : allTasks;
            setTasks(filtered);
        });
    }, [type]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;

        const taskId = active.id;
        const newStatus = over.id; // Using column ID as status

        if (active.data.current?.sortable?.containerId !== over.id) {
            // Optimistic UI update
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, status: newStatus } : t
            ));

            // API Call
            await updateTaskStatus(taskId, newStatus);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold capitalize">{type} Projects</h1>
                    <p className="text-muted text-sm">Manage your {type} tasks and progress</p>
                </div>
                <button className="glass-button">+ New Task</button>
            </header>

            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                    <div className="flex gap-6 h-full min-w-max pb-4">
                        {COLUMNS.map(col => (
                            <div key={col.id} className={`w-80 flex-shrink-0 rounded-2xl border backdrop-blur-sm flex flex-col ${col.color}`}>
                                <div className="p-4 font-semibold text-sm uppercase tracking-wider opacity-80 flex justify-between">
                                    {col.title}
                                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
                                        {tasks.filter(t => t.status === col.id).length}
                                    </span>
                                </div>
                                <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                    {/* Simplified for now - usually we'd use SortableContext here per column */}
                                    {tasks.filter(t => t.status === col.id).map(task => (
                                        <TaskCard key={task.id} task={task} />
                                    ))}
                                    {tasks.filter(t => t.status === col.id).length === 0 && (
                                        <div className="text-center py-10 text-muted opacity-50 text-sm italic">
                                            No tasks
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </DndContext>
            </div>
        </div>
    );
};

export default Board;
