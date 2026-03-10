import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, Settings, LayoutDashboard, BrainCog } from 'lucide-react';

const Layout: React.FC = () => {
    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <BrainCog className="sidebar-logo-icon" size={28} />
                    <div className="sidebar-logo">HMM Analyzer</div>
                </div>

                <nav className="nav-links">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/symbol/BTCUSDT" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Activity size={20} />
                        <span>Analizador</span>
                    </NavLink>
                    <NavLink to="/config" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span>Configuración</span>
                    </NavLink>
                </nav>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div className="flex items-center gap-2">
                        <h2 style={{ fontSize: '1.25rem', marginBottom: 0 }}>Analizador HMM</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="badge badge-success flex items-center gap-2">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} className="animate-pulse-slow"></span>
                            Sistema Activo
                        </span>
                    </div>
                </header>

                <div className="page-content animate-slide-up">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
