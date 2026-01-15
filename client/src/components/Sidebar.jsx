import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Globe, PenTool, Smartphone, CreditCard, Receipt, Settings } from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: PenTool, label: 'Diseño', path: '/board/design' },
        { icon: Globe, label: 'Web', path: '/board/web' },
        { icon: Smartphone, label: 'Social Media', path: '/board/social' },
        { icon: CreditCard, label: 'Presupuestos', path: '/board/budgets' },
        { icon: Receipt, label: 'Facturación', path: '/board/billing' },
    ];

    return (
        <aside className="w-64 glass-panel m-4 mr-0 flex flex-col p-6 h-[calc(100vh-2rem)] sticky top-4">
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white">LG</div>
                <h1 className="text-xl font-bold tracking-tight">Project Mgr</h1>
            </div>

            <nav className="flex-1 flex flex-col gap-2">
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">Menu</div>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-primary-gradient text-white shadow-md'
                                : 'text-muted hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        <item.icon size={18} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-border/10">
                <NavLink to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-white/5 hover:text-white transition-all">
                    <Settings size={18} />
                    <span className="font-medium">Settings</span>
                </NavLink>
            </div>
        </aside>
    );
};

export default Sidebar;
