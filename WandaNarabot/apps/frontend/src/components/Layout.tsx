import React from 'react';
import { Activity, Settings as SettingsIcon, LayoutDashboard, Terminal, History, BarChart2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/store';

declare const __APP_VERSION__: string;

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const { botStatus, closingPositions } = useAppStore();

    return (
        <div className="flex h-screen bg-gray-950 text-slate-200 font-sans">
            <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
                <div className="p-6 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Activity className="text-white w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        WandaNarabot
                    </span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <Link to="/" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${location.pathname === '/' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}>
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                    </Link>
                    <Link to="/settings" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${location.pathname === '/settings' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}>
                        <SettingsIcon className="w-5 h-5" />
                        <span className="font-medium">Configuration</span>
                    </Link>
                    <Link to="/history" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${location.pathname === '/history' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}>
                        <History className="w-5 h-5" />
                        <span className="font-medium">Trade History</span>
                    </Link>
                    <Link to="/sessions" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${location.pathname === '/sessions' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}>
                        <BarChart2 className="w-5 h-5" />
                        <span className="font-medium">Sessions</span>
                    </Link>
                </nav>

                <div className="p-4 bg-gray-900 border-t border-gray-800 space-y-2">
                    {closingPositions && (
                        <div className="flex items-center space-x-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                            </span>
                            <span className="text-xs text-amber-300 font-medium">Cerrando posiciones…</span>
                        </div>
                    )}
                    {botStatus === 'RUNNING' && !closingPositions && (
                        <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs text-emerald-300 font-medium">Bot activo</span>
                        </div>
                    )}
                    {botStatus === 'RECONNECTING' && !closingPositions && (
                        <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                            </span>
                            <span className="text-xs text-yellow-300 font-medium">Reconectando…</span>
                        </div>
                    )}
                    <div className="flex items-center space-x-3 px-4 py-2">
                        <Terminal className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-500">v{__APP_VERSION__}</span>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-gray-950">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
