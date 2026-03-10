import { useEffect } from 'react';
import { useAppStore } from '../store/store';
import { BarChart2, TrendingUp, TrendingDown, Trophy, Clock, Target, Percent, CalendarDays, Zap } from 'lucide-react';
import { ChartComponent, BarChartComponent } from '../components/Chart';

const SessionHistory = () => {
    const { sessions, fetchSessions } = useAppStore();

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 10000);
        return () => clearInterval(interval);
    }, [fetchSessions]);

    const all = sessions as any[];

    // Separate by type
    const dailySnaps  = all.filter((s) => s.session_type === 'daily');
    const normalSess  = all.filter((s) => s.session_type !== 'daily');

    // For cumulative KPIs: prefer daily snapshots when they exist (indefinite mode)
    // else fall back to completed normal sessions
    const completedNormal = normalSess.filter((s) => s.final_capital != null && s.profit_pct != null);
    const statsSource     = dailySnaps.length > 0 ? dailySnaps : completedNormal;

    // ── Cumulative stats ─────────────────────────────────────────────────────
    const totalPnlUsdt   = statsSource.reduce((a, s) => a + (s.realized_pnl_usdt || 0), 0);
    const totalTrades    = statsSource.reduce((a, s) => a + (s.trade_count || 0), 0);
    const totalWins      = statsSource.reduce((a, s) => a + (s.win_count || 0), 0);
    const overallWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const bestSession    = statsSource.length > 0 ? Math.max(...statsSource.map((s) => s.profit_pct || 0)) : 0;
    const worstSession   = statsSource.length > 0 ? Math.min(...statsSource.map((s) => s.profit_pct || 0)) : 0;

    const totalMinutes = statsSource.reduce((a, s) => {
        if (s.end_time && s.start_time)
            return a + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000;
        return a;
    }, 0);
    const totalHoursStr =
        totalMinutes >= 60
            ? `${Math.floor(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`
            : `${Math.round(totalMinutes)}m`;

    // Cumulative PnL % (first initial → last final of statsSource, sorted asc)
    const sortedStats = [...statsSource].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    const firstInitial     = sortedStats.length > 0 ? sortedStats[0].initial_capital : 0;
    const lastFinal        = sortedStats.length > 0 ? sortedStats[sortedStats.length - 1].final_capital : 0;
    const cumulativePnlPct = firstInitial > 0 ? ((lastFinal - firstInitial) / firstInitial) * 100 : 0;

    // ── Chart data ───────────────────────────────────────────────────────────
    const cumulativeChartData = sortedStats.map((s, idx) => ({
        time: Math.floor(new Date(s.end_time).getTime() / 1000) + idx,
        value: s.final_capital || 0,
    }));

    const sessionBarData = sortedStats.map((s, idx) => ({
        time: Math.floor(new Date(s.start_time).getTime() / 1000) + idx,
        value: s.profit_pct || 0,
    }));

    // ── Helpers ──────────────────────────────────────────────────────────────
    const formatDate = (str: string | null) => {
        if (!str) return '—';
        return new Date(str).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatDuration = (start: string, end: string | null, plannedHours: number, type: string) => {
        if (type === 'daily') return '24h (diario)';
        if (!end) return `${plannedHours}h (activo)`;
        const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
        if (mins >= 60) return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
        return `${Math.round(mins)}m`;
    };

    const pnlClass = (v: number) => (v >= 0 ? 'text-emerald-400' : 'text-red-400');
    const pnlSign  = (v: number) => (v >= 0 ? '+' : '');

    const isIndefiniteMode = normalSess.some((s) => s.duration_hours === 0 && s.final_capital == null);
    const chartLabel = dailySnaps.length > 0 ? 'Rendimiento Diario' : 'PnL % por Sesión';

    // ── KPI card ─────────────────────────────────────────────────────────────
    const KpiCard = ({
        label, value, sub, icon: Icon, positive,
    }: {
        label: string; value: string; sub: string;
        icon: React.ElementType; positive?: boolean;
    }) => (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                <Icon className={`w-4 h-4 ${positive === undefined ? 'text-indigo-400' : positive ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <p className={`text-2xl font-bold font-mono ${positive === undefined ? 'text-white' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {value}
            </p>
            <p className="text-xs text-gray-500">{sub}</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-10">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <BarChart2 className="w-8 h-8 text-indigo-500" />
                    Session History
                </h1>
                <p className="text-gray-400 mt-1">
                    Historial completo y acumulativo de todas las sesiones de trading
                </p>
                {isIndefiniteMode && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 text-xs">
                        <CalendarDays className="w-3.5 h-3.5" />
                        Modo indefinido activo — se guarda un snapshot al final de cada día UTC
                    </div>
                )}
            </header>

            {/* ── Cumulative KPI row ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <KpiCard
                    label="Sesiones"
                    value={String(normalSess.length)}
                    sub={dailySnaps.length > 0 ? `${dailySnaps.length} snapshots diarios` : `${all.filter(s => s.final_capital == null).length} activas`}
                    icon={Target}
                />
                <KpiCard
                    label="PnL Realizado"
                    value={`${pnlSign(totalPnlUsdt)}${totalPnlUsdt.toFixed(2)} USDT`}
                    sub={dailySnaps.length > 0 ? 'Suma de días completos' : 'Suma de sesiones'}
                    icon={totalPnlUsdt >= 0 ? TrendingUp : TrendingDown}
                    positive={totalPnlUsdt >= 0}
                />
                <KpiCard
                    label="Retorno Total"
                    value={`${pnlSign(cumulativePnlPct)}${cumulativePnlPct.toFixed(2)}%`}
                    sub="Desde el primer registro"
                    icon={Percent}
                    positive={cumulativePnlPct >= 0}
                />
                <KpiCard
                    label="Win Rate Global"
                    value={`${overallWinRate.toFixed(1)}%`}
                    sub={`${totalWins}W / ${totalTrades - totalWins}L · ${totalTrades} trades`}
                    icon={Target}
                    positive={overallWinRate >= 50}
                />
                <KpiCard
                    label="Mejor Día/Sesión"
                    value={`${pnlSign(bestSession)}${bestSession.toFixed(2)}%`}
                    sub="Máximo retorno registrado"
                    icon={Trophy}
                    positive={bestSession >= 0}
                />
                <KpiCard
                    label="Tiempo Activo"
                    value={totalHoursStr || '—'}
                    sub={`Peor: ${pnlSign(worstSession)}${worstSession.toFixed(2)}%`}
                    icon={Clock}
                    positive={worstSession >= 0}
                />
            </div>

            {/* ── Charts row ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Cumulative capital area chart */}
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h2 className="text-base font-semibold text-gray-200">Capital Acumulado</h2>
                    <p className="text-xs text-gray-500 mt-0.5 mb-4">
                        {dailySnaps.length > 0
                            ? 'Capital al cierre de cada día (modo indefinido)'
                            : 'Evolución del capital al cierre de cada sesión completada'}
                    </p>
                    <div className="h-[220px]">
                        {cumulativeChartData.length >= 2 ? (
                            <ChartComponent
                                data={cumulativeChartData}
                                colors={{
                                    lineColor: '#6366f1',
                                    areaTopColor: 'rgba(99,102,241,0.35)',
                                    areaBottomColor: 'rgba(99,102,241,0.0)',
                                }}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-600">
                                <BarChart2 className="w-10 h-10 opacity-30" />
                                <span className="text-sm text-center">
                                    {dailySnaps.length > 0
                                        ? 'Se necesitan al menos 2 días completos'
                                        : 'Se necesitan al menos 2 sesiones completadas'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Per-day / per-session PnL % bar chart */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h2 className="text-base font-semibold text-gray-200">{chartLabel}</h2>
                    <p className="text-xs text-gray-500 mt-0.5 mb-4">
                        Retorno porcentual {dailySnaps.length > 0 ? 'por día' : 'por sesión'}
                    </p>
                    <div className="h-[220px]">
                        {sessionBarData.length > 0 ? (
                            <BarChartComponent data={sessionBarData} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-600">
                                <BarChart2 className="w-10 h-10 opacity-30" />
                                <span className="text-sm">Sin datos aún</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Sessions table ───────────────────────────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-200">Historial Completo</h2>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        {dailySnaps.length > 0 && (
                            <span className="flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                                {dailySnaps.length} snapshots diarios
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            {normalSess.length} sesiones normales
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-800/80 text-xs uppercase font-semibold text-gray-300">
                            <tr>
                                <th className="px-5 py-3">#</th>
                                <th className="px-5 py-3">Tipo</th>
                                <th className="px-5 py-3">Inicio</th>
                                <th className="px-5 py-3">Fin</th>
                                <th className="px-5 py-3">Duración</th>
                                <th className="px-5 py-3 text-right">Cap. Inicial</th>
                                <th className="px-5 py-3 text-right">Cap. Final</th>
                                <th className="px-5 py-3 text-right">PnL USDT</th>
                                <th className="px-5 py-3 text-right">PnL %</th>
                                <th className="px-5 py-3 text-right">Trades</th>
                                <th className="px-5 py-3 text-right">Win %</th>
                                <th className="px-5 py-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {all.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-16 text-center text-gray-600">
                                        <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        No hay sesiones registradas aún. Iniciá el bot para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                [...all]
                                    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                                    .map((s, idx) => {
                                        const rowNum     = all.length - idx;
                                        const isDaily    = s.session_type === 'daily';
                                        const isActive   = s.final_capital == null;
                                        const profitPct  = s.profit_pct ?? 0;
                                        const isPositive = profitPct >= 0;
                                        const pnlUsdt    = s.realized_pnl_usdt ?? (
                                            s.final_capital != null
                                                ? s.final_capital - s.initial_capital
                                                : null
                                        );

                                        return (
                                            <tr key={s.id} className={`hover:bg-gray-800/40 transition-colors ${isDaily ? 'bg-indigo-950/10' : ''}`}>
                                                <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{rowNum}</td>

                                                {/* Type badge */}
                                                <td className="px-5 py-3.5">
                                                    {isDaily ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                                                            <CalendarDays className="w-3 h-3" /> Diario
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                                                            <Zap className="w-3 h-3" /> Sesión
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                                                    {formatDate(s.start_time)}
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                                                    {formatDate(s.end_time)}
                                                </td>
                                                <td className="px-5 py-3.5 text-xs">
                                                    {formatDuration(s.start_time, s.end_time, s.duration_hours, s.session_type)}
                                                </td>

                                                <td className="px-5 py-3.5 text-right font-mono text-gray-300 text-xs">
                                                    ${(s.initial_capital || 0).toFixed(2)}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-mono text-gray-300 text-xs">
                                                    {s.final_capital != null ? `$${s.final_capital.toFixed(2)}` : '—'}
                                                </td>

                                                <td className="px-5 py-3.5 text-right font-mono text-sm font-medium">
                                                    {pnlUsdt != null ? (
                                                        <span className={pnlClass(pnlUsdt)}>
                                                            {pnlSign(pnlUsdt)}{pnlUsdt.toFixed(2)}
                                                        </span>
                                                    ) : <span className="text-gray-600">—</span>}
                                                </td>

                                                <td className="px-5 py-3.5 text-right font-mono text-sm font-bold">
                                                    {s.profit_pct != null ? (
                                                        <span className={pnlClass(profitPct)}>
                                                            {pnlSign(profitPct)}{profitPct.toFixed(2)}%
                                                        </span>
                                                    ) : <span className="text-gray-600">—</span>}
                                                </td>

                                                <td className="px-5 py-3.5 text-right font-mono text-gray-300">
                                                    {s.trade_count ?? '—'}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-mono">
                                                    {s.win_rate != null ? (
                                                        <span className={s.win_rate >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
                                                            {s.win_rate.toFixed(1)}%
                                                        </span>
                                                    ) : <span className="text-gray-600">—</span>}
                                                </td>

                                                <td className="px-5 py-3.5 text-center">
                                                    {isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                                                            <span className="relative flex h-1.5 w-1.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                            </span>
                                                            Activa
                                                        </span>
                                                    ) : isPositive ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                                                            ✓ Ganancia
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                                            ✗ Pérdida
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SessionHistory;
