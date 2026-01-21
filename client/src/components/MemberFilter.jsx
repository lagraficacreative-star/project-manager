import React from 'react';

const MemberFilter = ({ users, selectedUsers, onToggleUser, onClear, isGrid = false }) => {
    return (
        <div className={`flex ${isGrid ? 'flex-col gap-2' : 'items-center gap-4'} bg-white/50 backdrop-blur-sm px-4 py-2 rounded-2xl border border-gray-100 shadow-sm overflow-hidden`}>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Filtrar:</span>
            <div className={isGrid ? "grid grid-cols-4 gap-2 py-1" : "flex items-center gap-3 overflow-x-auto no-scrollbar py-1"}>
                <div
                    onClick={onClear}
                    className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all border
                        ${selectedUsers.length === 0
                            ? 'bg-brand-orange border-brand-orange text-white'
                            : 'bg-white border-gray-100 text-gray-400 hover:border-brand-orange/30'}`}
                >
                    <span className="text-[10px] font-bold uppercase">Todos</span>
                </div>

                {users.map((u) => {
                    const isSelected = selectedUsers.includes(u.id);
                    return (
                        <div
                            key={u.id}
                            onClick={() => onToggleUser(u.id)}
                            className={`flex items-center gap-2 px-2 py-1 rounded-full cursor-pointer transition-all border
                                ${isSelected
                                    ? 'bg-orange-50 border-brand-orange'
                                    : 'bg-white border-gray-100 grayscale hover:grayscale-0 hover:border-gray-200'}`}
                        >
                            <div className={`w-8 h-8 rounded-full overflow-hidden border-2 shrink-0
                                ${isSelected ? 'border-brand-orange' : 'border-white'}`}>
                                {u.avatarImage ? (
                                    <img src={u.avatarImage} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                        {u.avatar || u.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <span className={`text-[10px] font-bold pr-1 truncate ${isSelected ? 'text-brand-orange' : 'text-gray-500'}`}>
                                {u.name.split(' ')[0]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MemberFilter;
