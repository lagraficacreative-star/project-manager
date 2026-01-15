import React, { useState, useEffect } from 'react';
import { getTasks } from '../lib/api';
import { Zap, Clock, CheckCircle2 } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass-panel p-6 flex items-start justify-between relative overflow-hidden group">
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-xl bg-${color}-500 transition-all group-hover:opacity-20`}></div>
        <div>
            <p className="text-muted text-sm font-medium mb-1">{title}</p>
            <h3 className="text-3xl font-bold">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-white/5 text-${color}-400`}>
            <Icon size={24} />
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({ total: 0, pending: 0, done: 0 });

    useEffect(() => {
        // Quick fetch for stats
        getTasks().then(data => {
            const tasks = data.tasks || [];
            setStats({
                total: tasks.length,
                pending: tasks.filter(t => t.status !== 'done').length,
                done: tasks.filter(t => t.status === 'done').length
            });
        });
    }, []);

    return (
        <div className="space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                <p className="text-muted">Welcome back, Montse. Here's what's happening today.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Active Projects" value={stats.pending} icon={Zap} color="indigo" />
                <StatCard title="Pending Review" value="4" icon={Clock} color="amber" />
                <StatCard title="Completed This Month" value={stats.done} icon={CheckCircle2} color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="glass-panel p-6 h-96">
                    <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
                    <div className="flex flex-col gap-4">
                        {/* Mock activity list */}
                        <div className="flex gap-4 items-center p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">N</div>
                            <div>
                                <p className="font-medium">Neus moved "Logo Redesign" to Review</p>
                                <p className="text-xs text-muted">2 hours ago</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">O</div>
                            <div>
                                <p className="font-medium">Omar created new folder for "Landing Page"</p>
                                <p className="text-xs text-muted">5 hours ago</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 h-96">
                    <h3 className="text-lg font-bold mb-4">Inbox Sync</h3>
                    <div className="flex items-center justify-center h-full text-muted">
                        Select a view to see details
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
