import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { MoreHorizontal, Paperclip, MessageSquare } from 'lucide-react';

const TaskCard = ({ task }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: task.id,
        data: { task }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const priorityColors = {
        high: 'bg-red-500/20 text-red-300 border-red-500/20',
        medium: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
        low: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="glass-panel p-4 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors bg-[#1e293b]/80"
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${priorityColors[task.priority] || priorityColors.medium}`}>
                    {task.priority || 'Normal'}
                </span>
                <button className="text-muted hover:text-white"><MoreHorizontal size={14} /></button>
            </div>

            <h4 className="font-medium text-sm mb-1 leading-snug">{task.title}</h4>
            <p className="text-xs text-muted mb-3 line-clamp-2">{task.client}</p>

            <div className="flex items-center justify-between text-muted text-xs mt-3 pt-3 border-t border-white/5">
                <div className="flex gap-3">
                    {task.description && task.description.includes('📎') && (
                        <span className="flex items-center gap-1"><Paperclip size={12} /> 1</span>
                    )}
                    <span className="flex items-center gap-1"><MessageSquare size={12} /> 0</span>
                </div>

                {task.assignee && (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] text-white font-bold" title={task.assignee}>
                        {task.assignee.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskCard;
