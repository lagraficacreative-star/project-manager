import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { MoreHorizontal, Paperclip, MessageSquare, Clock } from 'lucide-react';

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
                <div className="flex flex-col gap-1">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border inline-block w-fit ${priorityColors[task.priority] || priorityColors.medium}`}>
                        {task.priority || 'Normal'}
                    </span>
                    {(task.sourceEmailDate || task.createdAt) && (
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock size={10} className="text-gray-500" />
                            {new Date(task.sourceEmailDate || task.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                        </span>
                    )}
                </div>
                <button className="text-muted hover:text-white"><MoreHorizontal size={14} /></button>
            </div>

            <h4 className="font-medium text-sm mb-1 leading-snug">{task.title}</h4>
            <p className="text-xs text-muted mb-3 line-clamp-2">{task.client}</p>

            {/* Image Preview */}
            {(() => {
                const imageAttachment = task.attachments?.find(a =>
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename)
                );
                if (imageAttachment) {
                    return (
                        <div className="mt-2 mb-3 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                            <img
                                src={imageAttachment.url}
                                alt={imageAttachment.filename}
                                className="w-full h-24 object-cover opacity-80 hover:opacity-100 transition-opacity"
                            />
                        </div>
                    );
                }
                return null;
            })()}

            <div className="flex items-center justify-between text-muted text-xs mt-1 pt-3 border-t border-white/5">
                <div className="flex gap-3">
                    {(task.attachments?.length > 0) && (
                        <span className="flex items-center gap-1"><Paperclip size={12} /> {task.attachments.length}</span>
                    )}
                    {task.comments?.length > 0 && (
                        <span className="flex items-center gap-1"><MessageSquare size={12} /> {task.comments.length}</span>
                    )}
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
