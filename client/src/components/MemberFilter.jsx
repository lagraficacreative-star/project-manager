import React from 'react';

const MemberFilter = ({ users, selectedUsers, onToggleUser, onClear, isGrid = false }) => {
    return (
        <div className={`flex ${isGrid ? 'flex-col gap-3' : 'flex-col sm:flex-row sm:items-center gap-2 md:gap-4'} bg-white/80 backdrop-blur-md px-3 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden w-full md:w-auto`}>
            <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Filtrar:</span>
            <div className={isGrid ? "grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 py-1 w-full" : "flex flex-wrap items-center gap-2 md:gap-3 py-1 w-full"}>
                <div
                    onClick={onClear}
                    className={`flex items-center justify-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full cursor-pointer transition-all border shrink-0
                        ${selectedUsers.length === 0
                            ? 'bg-brand-black border-brand-black text-white shadow-md'
                            : 'bg-white border-gray-100 text-gray-500 hover:border-brand-orange/50 hover:text-brand-orange'}`}
                >
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight">Tots</span>
                </div>

                {users.map((u) => {
                    const isSelected = selectedUsers.includes(u.id);
                    return (
                        <div
                            key={u.id}
                            onClick={() => onToggleUser(u.id)}
                            className={`flex items-center gap-2 pr-2 md:pr-3 pl-1 py-1 rounded-full cursor-pointer transition-all border shrink-0
                                ${isSelected
                                    ? 'bg-orange-50 border-brand-orange shadow-sm'
                                    : 'bg-white border-gray-100 grayscale hover:grayscale-0 hover:border-brand-orange/30 hover:shadow-sm'}`}
                        >
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden border-2 shrink-0
                                ${isSelected ? 'border-brand-orange' : 'border-white'}`}>
                                {u.avatarImage ? (
                                    <img src={u.avatarImage} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-[8px] md:text-[10px] font-bold text-white
                                        ${u.id === 'montse' ? 'bg-brand-orange' : 'bg-gray-400'}`}>
                                        {u.avatar || u.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <span className={`text-[9px] md:text-[10px] font-bold truncate max-w-[50px] md:max-w-[70px] ${isSelected ? 'text-brand-orange' : 'text-gray-600'}`}>
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
