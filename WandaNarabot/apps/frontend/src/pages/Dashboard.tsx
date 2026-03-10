import { useEffect, useState } from 'react';
import { useAppStore } from '../store/store';
import {
    Activity, TrendingUp, TrendingDown, DollarSign, Loader2,
    Play, Square, Signal, X, Clock, Calendar, Zap, BarChart2,
    ShieldAlert, Target, Award, AlertTriangle, Trash2, ArrowRightLeft, RefreshCw,
} from 'lucide-react';
import { ChartComponent, BarChartComponent } from '../components/Chart';

const Dashboard = () => {
    const {
        botStatus, environment, marketType, fetchStatus, startBot, stopBot,
        fetchSymbols, availableSymbols, hmmStatus, currentCapital,
        profitPct, strategies, equity, activeSymbols, fetchEquity,
        fetchRegimes, lastSignal, fetchPositions, positions, runDurationHours,
        startTime, sessions, fetchSessions, executions, fetchExecutions,
        leverage, tradePct, stats, fetchStats, trades, fetchTrades, closingPositions,
        clearPositions, availableBalance,
        balanceDetails, loadingBalanceDetails, fetchBalanceDetails, transferBalance,
    } = useAppStore();

    const [showModal, setShowModal] = useState(false);
    const [showStopModal, setShowStopModal] = useState(false);
    const [durationHours, setDurationHours] = useState(0);
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
    const [modalLeverage, setModalLeverage] = useState(1);
    const [tradingViewModal, setTradingViewModal] = useState<string | null>(null);
    const [clearingDB, setClearingDB] = useState(false);
    const [historyView, setHistoryView] = useState<'1D' | '7D' | 'WEEKLY' | 'MONTHLY'>('1D');
    const [timerText, setTimerText] = useState("00:00:00");
    const [showCapitalModal, setShowCapitalModal] = useState(false);
    const [transferAsset, setTransferAsset] = useState('USDT');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferDirection, setTransferDirection] = useState<'SPOT_TO_FUTURES' | 'FUTURES_TO_SPOT'>('SPOT_TO_FUTURES');
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferResult, setTransferResult] = useState<{ success: boolean; message: string } | null>(null);

    // Sync modal leverage with loaded config on first open
    useEffect(() => {
        if (showModal) setModalLeverage(leverage || 1);
    }, [showModal]);

    useEffect(() => {
        const loadInitial = async () => {
            await fetchStatus();
            fetchPositions();
            fetchRegimes();
            fetchSessions();
            fetchExecutions();
            fetchStats();
            fetchTrades();
            fetchBalanceDetails(); // live balance on load
        };
        loadInitial();
        fetchSymbols();
        fetchEquity();
        const interval = setInterval(() => {
            fetchStatus();
            fetchEquity();
            fetchRegimes();
            fetchPositions();
            fetchSessions();
            fetchExecutions();
            fetchStats();
            fetchTrades();
        }, 5000);
        // Refresh live balance every 60 seconds (price fetch is slow)
        const balInterval = setInterval(() => { fetchBalanceDetails(); }, 60000);

        // When the browser tab comes back into focus (after sleep / background),
        // immediately re-fetch so the UI updates without waiting for the next tick.
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStatus();
                fetchEquity();
                fetchPositions();
                fetchStats();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            clearInterval(balInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchStatus, fetchSymbols, fetchEquity, fetchRegimes, fetchPositions, fetchSessions, fetchStats, fetchTrades, fetchBalanceDetails]);

    useEffect(() => {
        // Keep ticking while RECONNECTING — bot may still be running server-side.
        // Only reset to 00:00:00 when definitively STOPPED / OFFLINE.
        if ((botStatus !== 'RUNNING' && botStatus !== 'RECONNECTING') || !startTime) {
            setTimerText("00:00:00");
            return;
        }
        const interval = setInterval(() => {
            const startStr = startTime.endsWith('Z') || startTime.includes('+') ? startTime : startTime + 'Z';
            const start = new Date(startStr);
            const now = new Date();
            const diffSec = Math.floor((now.getTime() - start.getTime()) / 1000);
            if (runDurationHours > 0) {
                const totalSec = runDurationHours * 3600;
                let rem = totalSec - diffSec;
                if (rem < 0) rem = 0;
                const h = Math.floor(rem / 3600);
                const m = Math.floor((rem % 3600) / 60);
                const s = rem % 60;
                setTimerText(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                const h = Math.floor(diffSec / 3600);
                const m = Math.floor((diffSec % 3600) / 60);
                const s = diffSec % 60;
                setTimerText(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [botStatus, startTime, runDurationHours]);

    const getProjectionData = () => {
        if (!sessions || !Array.isArray(sessions) || sessions.length === 0) return [];
        const sorted = [...sessions].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        const now = new Date().getTime();
        let filtered = sorted;
        if (historyView === '1D') filtered = sorted.filter(s => now - new Date(s.start_time).getTime() <= 24 * 3600 * 1000);
        else if (historyView === '7D') filtered = sorted.filter(s => now - new Date(s.start_time).getTime() <= 7 * 24 * 3600 * 1000);
        else if (historyView === 'WEEKLY') filtered = sorted.filter(s => now - new Date(s.start_time).getTime() <= 30 * 24 * 3600 * 1000);
        return filtered.map((s) => ({ time: new Date(s.start_time).getTime() / 1000, value: s.profit_pct || 0 }));
    };

    const getPnlBarData = () => {
        if (!trades || trades.length === 0) return [];
        return trades
            .filter((t: any) => t.realized_pnl != null && t.action?.includes('CLOSE'))
            .map((t: any) => ({ time: new Date(t.timestamp).getTime() / 1000, value: t.realized_pnl }))
            .sort((a: any, b: any) => a.time - b.time);
    };

    useEffect(() => {
        if (availableSymbols.length > 0 && selectedSymbols.length === 0) {
            setSelectedSymbols(availableSymbols);
        }
    }, [availableSymbols, selectedSymbols]);

    const getStatusColor = () => {
        if (closingPositions) return 'bg-amber-500';
        switch (botStatus) {
            case 'RUNNING': return 'bg-emerald-500';
            case 'STOPPED': return 'bg-amber-500';
            case 'OFFLINE': return 'bg-red-500';
            case 'RECONNECTING': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusLabel = () => {
        if (closingPositions) return 'CERRANDO POSICIONES';
        if (botStatus === 'RECONNECTING') return 'RECONECTANDO...';
        return botStatus;
    };


    const handleClearPositions = async () => {
        if (!window.confirm('Clear ALL positions from DB? Use this only when exchange positions don\'t match (e.g. testnet reset). Cannot be undone.')) return;
        setClearingDB(true);
        const n = await clearPositions();
        setClearingDB(false);
        alert(`Cleared ${n} stale position(s) from database.`);
    };

    const handleOpenCapitalModal = () => {
        setTransferResult(null);
        setTransferAmount('');
        setShowCapitalModal(true);
        fetchBalanceDetails();
    };

    const handleTransfer = async () => {
        const amt = parseFloat(transferAmount);
        if (!amt || amt <= 0) return;
        setTransferLoading(true);
        setTransferResult(null);
        const res = await transferBalance(transferAsset, amt, transferDirection);
        setTransferLoading(false);
        if (res.success) {
            setTransferResult({ success: true, message: 'Transferencia exitosa' });
            fetchBalanceDetails(); // refresh after transfer
        } else {
            setTransferResult({ success: false, message: res.error || 'Error desconocido' });
        }
    };

    const handleStart = async () => { await startBot(durationHours, selectedSymbols, modalLeverage); setShowModal(false); };
    const handleStopClick = () => setShowStopModal(true);
    const confirmStop = async (closePositions: boolean) => { await stopBot(closePositions); setShowStopModal(false); };
    const toggleSymbol = (sym: string) => {
        if (selectedSymbols.includes(sym)) setSelectedSymbols(selectedSymbols.filter(s => s !== sym));
        else setSelectedSymbols([...selectedSymbols, sym]);
    };

    const totalUnrealized = positions.reduce((acc, p) => acc + (p.unrealized_pnl || 0), 0);
    const totalNotional = positions.reduce((acc, p) => acc + Math.abs((p.amount || 0) * (p.entry_price || 0)), 0);
    const totalMarginUsed = positions.reduce((acc, p) => acc + Math.abs((p.amount || 0) * (p.entry_price || 0)) / (p.leverage || 1), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">

            {/* Capital Details Modal */}
            {showCapitalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-800 shrink-0">
                            <div className="flex items-center space-x-3">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-xl font-bold text-white">Desglose de Tenencia</h2>
                                <span className="text-xs text-gray-500 uppercase border border-gray-700 rounded px-2 py-0.5">{environment}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={fetchBalanceDetails}
                                    disabled={loadingBalanceDetails}
                                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition"
                                    title="Actualizar"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingBalanceDetails ? 'animate-spin' : ''}`} />
                                </button>
                                <button onClick={() => setShowCapitalModal(false)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition"><X className="w-5 h-5" /></button>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar">
                            {loadingBalanceDetails && !balanceDetails ? (
                                <div className="flex items-center justify-center py-12 text-gray-500">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando balances…
                                </div>
                            ) : (
                                <>
                                    {/* Grand Total Banner */}
                                    {balanceDetails && (balanceDetails.grand_total_usdt > 0) && (
                                        <div className="bg-gradient-to-r from-emerald-900/30 to-indigo-900/30 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <DollarSign className="w-5 h-5 text-emerald-400" />
                                                <span className="text-sm font-semibold text-gray-300">Total General (USDT)</span>
                                            </div>
                                            <span className="text-2xl font-bold text-emerald-400 font-mono">
                                                ${balanceDetails.grand_total_usdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}

                                    {/* Two columns: Futures | Spot */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Futures */}
                                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-2">
                                                    <Zap className="w-4 h-4 text-amber-400" />
                                                    <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">Futuros</h3>
                                                </div>
                                                {(balanceDetails?.futures_total_usdt ?? 0) > 0 && (
                                                    <span className="text-xs font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                                        ≈ ${balanceDetails!.futures_total_usdt.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                            {balanceDetails?.futures && balanceDetails.futures.length > 0 ? (
                                                <div className="space-y-2">
                                                    {balanceDetails.futures.map((a: any) => (
                                                        <div key={a.asset} className="flex flex-col text-xs border-b border-gray-700/50 pb-2 last:border-0 last:pb-0">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-white text-sm">{a.asset}</span>
                                                                <div className="text-right">
                                                                    <div className="text-gray-200 font-mono">{a.wallet_balance.toFixed(4)}</div>
                                                                    {a.usdt_value > 0 && <div className="text-emerald-400 text-xs">≈ ${a.usdt_value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between text-gray-500 mt-0.5">
                                                                <span>Libre: <span className="text-emerald-400">{a.available.toFixed(4)}</span></span>
                                                                {a.unrealized_pnl !== 0 && (
                                                                    <span className={a.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                                        PnL: {a.unrealized_pnl >= 0 ? '+' : ''}{a.unrealized_pnl.toFixed(4)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-600 italic">Sin acceso a cuenta de futuros</p>
                                            )}
                                        </div>

                                        {/* Spot */}
                                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-2">
                                                    <DollarSign className="w-4 h-4 text-blue-400" />
                                                    <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Spot</h3>
                                                </div>
                                                {(balanceDetails?.spot_total_usdt ?? 0) > 0 && (
                                                    <span className="text-xs font-bold text-blue-300 bg-blue-400/10 px-2 py-0.5 rounded-full">
                                                        ≈ ${balanceDetails!.spot_total_usdt.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                            {balanceDetails?.spot && balanceDetails.spot.length > 0 ? (
                                                <div className="space-y-2">
                                                    {balanceDetails.spot.map((a: any) => (
                                                        <div key={a.asset} className="flex flex-col text-xs border-b border-gray-700/50 pb-2 last:border-0 last:pb-0">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-white text-sm">{a.asset}</span>
                                                                <div className="text-right">
                                                                    <div className="text-gray-200 font-mono">
                                                                        {a.wallet_balance < 0.001 ? a.wallet_balance.toFixed(8) : a.wallet_balance.toFixed(4)}
                                                                    </div>
                                                                    {a.usdt_value > 0.01 && <div className="text-blue-400 text-xs">≈ ${a.usdt_value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between text-gray-500 mt-0.5">
                                                                <span>Libre: <span className="text-blue-400">{a.available < 0.001 ? a.available.toFixed(8) : a.available.toFixed(4)}</span></span>
                                                                {a.wallet_balance > a.available && (
                                                                    <span>Bloqueado: {(a.wallet_balance - a.available).toFixed(4)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-600 italic">Sin activos en spot</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Transfer Section */}
                                    <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                                        <div className="flex items-center space-x-2 mb-4">
                                            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                                            <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide">Transferir entre Wallets</h3>
                                            {environment?.toLowerCase() === 'testnet' && (
                                                <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
                                                    ⚠ Puede no estar disponible en testnet
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 items-end">
                                            {/* Asset */}
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Activo</label>
                                                <select
                                                    value={transferAsset}
                                                    onChange={e => setTransferAsset(e.target.value)}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                                                >
                                                    {/* Build unique asset list from both wallets */}
                                                    {Array.from(new Set([
                                                        ...(balanceDetails?.futures?.map(a => a.asset) || []),
                                                        ...(balanceDetails?.spot?.map(a => a.asset) || []),
                                                        'USDT',
                                                    ])).map(asset => (
                                                        <option key={asset} value={asset}>{asset}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Amount */}
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Monto</label>
                                                <input
                                                    type="number"
                                                    value={transferAmount}
                                                    onChange={e => setTransferAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                                                />
                                            </div>

                                            {/* Direction */}
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Dirección</label>
                                                <select
                                                    value={transferDirection}
                                                    onChange={e => setTransferDirection(e.target.value as any)}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                                                >
                                                    <option value="SPOT_TO_FUTURES">Spot → Futuros</option>
                                                    <option value="FUTURES_TO_SPOT">Futuros → Spot</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center space-x-3">
                                            <button
                                                onClick={handleTransfer}
                                                disabled={transferLoading || !transferAmount || parseFloat(transferAmount) <= 0}
                                                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                                            >
                                                {transferLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                                                <span>Transferir</span>
                                            </button>
                                            {transferResult && (
                                                <span className={`text-sm font-medium ${transferResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {transferResult.success ? '✓' : '✗'} {transferResult.message}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stop Modal */}
            {showStopModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Detener el Bot</h2>
                            <button onClick={() => setShowStopModal(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>
                        <p className="text-gray-400 mb-8">¿Qué deseas hacer con tus posiciones abiertas al detener el bot?</p>
                        <div className="flex flex-col space-y-4">
                            <button onClick={() => confirmStop(true)} className="px-5 py-4 rounded-xl bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 text-white font-medium transition-colors flex items-center justify-center flex-col">
                                <span className="text-lg">Cerrar Posiciones y Detener</span>
                                <span className="text-sm text-red-300 font-normal mt-1">Vende todas las cripto por USDT a precio de mercado</span>
                            </button>
                            <button onClick={() => confirmStop(false)} className="px-5 py-4 rounded-xl bg-amber-600/20 border border-amber-500/50 hover:bg-amber-600/30 text-white font-medium transition-colors flex items-center justify-center flex-col">
                                <span className="text-lg">Mantener Posiciones y Detener</span>
                                <span className="text-sm text-amber-300 font-normal mt-1">Deja las posiciones existentes abiertas en Binance</span>
                            </button>
                            <button onClick={() => setShowStopModal(false)} className="px-5 py-3 mt-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Start Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-2xl w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Start Bot Parameters</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-medium text-gray-400 block mb-2">Run Duration</label>
                                <select className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 rounded-lg px-4 py-3 text-white outline-none" value={durationHours} onChange={(e) => setDurationHours(parseInt(e.target.value))}>
                                    <option value={0}>Continuous (Run until stopped)</option>
                                    <option value={1}>1 Hour</option>
                                    <option value={4}>4 Hours</option>
                                    <option value={12}>12 Hours</option>
                                    <option value={24}>24 Hours</option>
                                </select>
                            </div>
                            {/* Leverage selector */}
                            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-sm font-medium text-gray-300">
                                        <Zap className="w-4 h-4 mr-2 text-amber-400" />
                                        Futures Leverage
                                    </div>
                                    <span className={`text-2xl font-bold font-mono ${modalLeverage >= 20 ? 'text-red-400' : modalLeverage >= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {modalLeverage}x
                                    </span>
                                </div>

                                {/* Quick presets */}
                                <div className="flex space-x-2">
                                    {[1, 2, 3, 5, 10, 20].map(preset => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setModalLeverage(preset)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                modalLeverage === preset
                                                    ? preset >= 20 ? 'bg-red-500/20 border-red-500 text-red-300'
                                                    : preset >= 10 ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                                    : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            {preset}x
                                        </button>
                                    ))}
                                </div>

                                {/* Slider */}
                                <input
                                    type="range"
                                    min={1}
                                    max={50}
                                    step={1}
                                    value={modalLeverage}
                                    onChange={e => setModalLeverage(Number(e.target.value))}
                                    className={`w-full ${modalLeverage >= 20 ? 'accent-red-500' : modalLeverage >= 10 ? 'accent-amber-500' : 'accent-emerald-500'}`}
                                />

                                {/* Exposure info */}
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Alloc: <span className="text-indigo-400 font-semibold">{Math.round(tradePct * 100)}%</span> per trade</span>
                                    <span>
                                        Effective exposure:&nbsp;
                                        <span className={`font-semibold ${modalLeverage >= 20 ? 'text-red-400' : modalLeverage >= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {(tradePct * modalLeverage * 100).toFixed(1)}% of capital
                                        </span>
                                    </span>
                                </div>

                                {modalLeverage >= 20 && (
                                    <div className="flex items-start space-x-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-300">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                        <span>Alto apalancamiento — mayor riesgo de liquidación. Operá con precaución.</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-400 block">Target Symbols ({selectedSymbols.length}/{availableSymbols.length} selected)</label>
                                    <div className="space-x-2 text-xs">
                                        <button onClick={() => setSelectedSymbols(availableSymbols)} className="text-indigo-400 hover:text-indigo-300">Select All</button>
                                        <span className="text-gray-600">|</span>
                                        <button onClick={() => setSelectedSymbols([])} className="text-red-400 hover:text-red-300">Clear All</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-950 rounded-lg border border-gray-800 custom-scrollbar">
                                    {availableSymbols.map(sym => (
                                        <div key={sym} onClick={() => toggleSymbol(sym)} className={`px-3 py-2 rounded-md text-xs font-medium cursor-pointer transition-colors text-center ${selectedSymbols.includes(sym) ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                                            {sym}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end space-x-3">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleStart} disabled={selectedSymbols.length === 0} className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center">
                                <Play className="w-4 h-4 mr-2" /> Start Trading
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TradingView Modal */}
            {tradingViewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col relative">
                        <div className="flex justify-between items-center p-4 border-b border-gray-800">
                            <h2 className="text-xl font-bold text-white flex items-center"><Activity className="w-5 h-5 mr-2 text-indigo-400" /> {tradingViewModal} - 4h Chart</h2>
                            <button onClick={() => setTradingViewModal(null)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition"><X /></button>
                        </div>
                        <div className="flex-1 bg-black rounded-b-2xl overflow-hidden p-2">
                            <iframe
                                title="TradingView"
                                src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=BINANCE:${tradingViewModal.replace('/', '')}&interval=240&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BINANCE:${tradingViewModal.replace('/', '')}`}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allowTransparency={true}
                                scrolling="no"
                                allowFullScreen={true}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Trading Dashboard</h1>
                    <p className="text-gray-400 flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="relative flex h-3 w-3">
                            {(botStatus === 'RUNNING' || botStatus === 'LOADING') && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${getStatusColor()}`}></span>
                        </span>
                        <span>Bot: <strong className={closingPositions ? 'text-amber-400' : 'text-gray-300'}>{getStatusLabel()}</strong></span>
                        <span className="text-gray-600">|</span>
                        <span>HMM: <strong className={hmmStatus === 'ONLINE' ? "text-emerald-400" : "text-red-400"}>{hmmStatus}</strong></span>
                        <span className="text-gray-600">|</span>
                        <span>Env: <strong className="text-indigo-400 uppercase">{environment}</strong></span>
                        <span className="text-gray-600">|</span>
                        <span>Market: <strong className="text-purple-400 uppercase">{marketType}</strong></span>
                        {marketType?.toLowerCase() === 'futures' && (
                            <>
                                <span className="text-gray-600">|</span>
                                <span className="flex items-center">
                                    <Zap className="w-3.5 h-3.5 mr-1 text-amber-400" />
                                    Leverage: <strong className="text-amber-400 ml-1">{leverage}x</strong>
                                </span>
                            </>
                        )}
                    </p>
                </div>
                <div className="flex space-x-3">
                    {closingPositions ? (
                        <button disabled className="flex items-center space-x-2 bg-amber-700/50 text-amber-300 px-5 py-2.5 rounded-lg font-medium cursor-not-allowed">
                            <Loader2 className="w-4 h-4 animate-spin" /><span>Cerrando posiciones…</span>
                        </button>
                    ) : botStatus === 'RUNNING' ? (
                        <button onClick={handleStopClick} className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-red-500/20 active:scale-95">
                            <Square className="w-4 h-4" /><span>Stop Bot</span>
                        </button>
                    ) : (
                        <button onClick={() => setShowModal(true)} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                            <Play className="w-4 h-4" /><span>Start Bot</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-900/50 border border-gray-800 rounded-2xl">
                    <div className="flex flex-col items-center text-center px-2">
                        <div className="flex items-center text-xs text-gray-500 mb-1"><Award className="w-3 h-3 mr-1" /> Win Rate</div>
                        <div className={`text-2xl font-bold ${stats.win_rate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.win_rate.toFixed(1)}%</div>
                        <div className="text-xs text-gray-600 mt-0.5">{stats.winning_trades}W / {stats.losing_trades}L · {stats.total_trades} trades</div>
                    </div>
                    <div className="flex flex-col items-center text-center px-2 border-l border-gray-800">
                        <div className="flex items-center text-xs text-gray-500 mb-1"><DollarSign className="w-3 h-3 mr-1" /> Total Realized PnL</div>
                        <div className={`text-2xl font-bold ${stats.total_realized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stats.total_realized_pnl >= 0 ? '+' : ''}{stats.total_realized_pnl.toFixed(2)} USDT
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">Best: +{stats.best_trade.toFixed(2)} / Worst: {stats.worst_trade.toFixed(2)}</div>
                    </div>
                    <div className="flex flex-col items-center text-center px-2 border-l border-gray-800">
                        <div className="flex items-center text-xs text-gray-500 mb-1"><ShieldAlert className="w-3 h-3 mr-1" /> Max Drawdown</div>
                        <div className={`text-2xl font-bold ${stats.max_drawdown_pct < 5 ? 'text-emerald-400' : stats.max_drawdown_pct < 10 ? 'text-amber-400' : 'text-red-400'}`}>
                            -{stats.max_drawdown_pct.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">{stats.max_drawdown_pct >= 10 ? '⚠ Emergency stop at 10%' : 'Within safe limits'}</div>
                    </div>
                    <div className="flex flex-col items-center text-center px-2 border-l border-gray-800">
                        <div className="flex items-center text-xs text-gray-500 mb-1"><Zap className="w-3 h-3 mr-1" /> Leverage Config</div>
                        <div className="text-2xl font-bold text-amber-400">{leverage}x</div>
                        <div className="text-xs text-gray-600 mt-0.5">Alloc: {Math.round(tradePct * 100)}% · Eff. exposure: {Math.round(tradePct * leverage * 100)}%</div>
                    </div>
                </div>
            )}

            {/* Main KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Capital — click to open breakdown modal */}
                {(() => {
                    const liveTotal = balanceDetails?.grand_total_usdt ?? 0;
                    const displayCapital = liveTotal > 0 ? liveTotal : currentCapital;
                    const spotTotal = balanceDetails?.spot_total_usdt ?? 0;
                    const futTotal = balanceDetails?.futures_total_usdt ?? 0;
                    return (
                        <div
                            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group cursor-pointer hover:border-emerald-500/40 hover:shadow-emerald-500/10 transition-all"
                            onClick={handleOpenCapitalModal}
                            title="Click para ver desglose de tenencia"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign className="w-24 h-24" /></div>
                            <p className="text-sm font-medium text-gray-400 mb-1 flex items-center space-x-1">
                                <span>Total Capital (USDT)</span>
                                <ArrowRightLeft className="w-3 h-3 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                            </p>
                            <div className="text-3xl font-bold text-white tracking-tight flex items-baseline">
                                ${displayCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {profitPct !== 0 && (
                                    <span className={`text-sm font-normal ml-2 flex items-center ${profitPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {profitPct >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                                        {profitPct >= 0 ? "+" : ""}{profitPct.toFixed(2)}%
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center space-x-3 mt-2 text-xs">
                                {futTotal > 0 && <span className="text-gray-500">Futuros: <span className="text-amber-400 font-semibold">${futTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></span>}
                                {spotTotal > 0 && <span className="text-gray-500">Spot: <span className="text-blue-400 font-semibold">${spotTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></span>}
                                {loadingBalanceDetails && <RefreshCw className="w-3 h-3 text-gray-600 animate-spin" />}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                                <span>Libre: <span className="text-emerald-400 font-semibold">${availableBalance.toFixed(2)}</span></span>
                                {(currentCapital - availableBalance) > 0.01 && (
                                    <span>En margin: <span className="text-amber-400 font-semibold">${(currentCapital - availableBalance).toFixed(2)}</span></span>
                                )}
                            </p>
                        </div>
                    );
                })()}

                {/* Unrealized PnL */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity className="w-24 h-24" /></div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Unrealized PnL</p>
                    <div className={`text-3xl font-bold tracking-tight ${totalUnrealized >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {totalUnrealized >= 0 ? '+' : ''}{totalUnrealized.toFixed(2)} USDT
                    </div>
                    {positions.length > 0 && (
                        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                            <span>Notional: <span className="text-gray-300">${totalNotional.toFixed(0)}</span></span>
                            <span>Margin: <span className="text-amber-400">${totalMarginUsed.toFixed(0)}</span></span>
                        </div>
                    )}
                </div>

                {/* Last Signal */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-indigo-400"><Signal className="w-24 h-24" /></div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Last HMM Signal ({lastSignal?.symbol || 'NONE'})</p>
                    <div className="text-xl font-bold tracking-tight text-white mb-2">{lastSignal?.strategy || 'AWAITING'}</div>
                    <div className="text-sm text-indigo-400 font-medium bg-indigo-500/10 px-3 py-1 rounded-full inline-block">Regime: {lastSignal?.regime || 'UNKNOWN'}</div>
                </div>

                {/* Timer */}
                <div className={`bg-gray-900 border ${botStatus === 'RUNNING' ? 'border-emerald-500/50' : 'border-gray-800'} rounded-2xl p-6 shadow-xl relative overflow-hidden group transition-all`}>
                    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${botStatus === 'RUNNING' ? 'text-emerald-400' : 'text-gray-500'}`}><Clock className="w-24 h-24" /></div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Session Timer</p>
                    <div className={`text-2xl font-mono font-bold tracking-tight mb-2 ${botStatus === 'RUNNING' ? 'text-emerald-400' : 'text-gray-500'}`}>{timerText}</div>
                    <div className="text-xs text-gray-500">{botStatus === 'RUNNING' ? (runDurationHours > 0 ? 'Time Remaining' : 'Continuous Uptime') : 'Bot Offline'}</div>
                </div>
            </div>

            {/* Equity Curve */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl min-h-[380px]">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center"><Activity className="w-4 h-4 mr-2 text-indigo-400" /> Current Session Equity Curve</h2>
                <div className="h-[300px] w-full relative">
                    {equity && equity.length > 0 ? (
                        <ChartComponent
                            data={equity.map((e: any) => ({ time: new Date(e.timestamp).getTime() / 1000, value: e.total_balance })).sort((a: any, b: any) => a.time - b.time)}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                            <p>Waiting for equity data...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Positions Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center">
                        <Target className="w-4 h-4 mr-2 text-emerald-400" />
                        Active Positions
                        {positions.length > 0 && (
                            <span className="ml-2 text-xs font-normal bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                {positions.length} open
                            </span>
                        )}
                    </h2>
                    <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500">{activeSymbols.length} symbols monitored</span>
                        <button
                            onClick={handleClearPositions}
                            disabled={clearingDB || positions.length === 0}
                            title="Force-clear all DB positions (use if testnet was reset and positions are stale)"
                            className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            {clearingDB ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            <span>Clear Stale</span>
                        </button>
                    </div>
                </div>

                {positions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Target className="w-10 h-10 opacity-20 mb-3" />
                        <p className="text-sm">No open positions — bot is scanning {activeSymbols.length} symbols</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-800/60 border-b border-gray-800">
                                <tr>
                                    <th className="px-5 py-3 text-left">Symbol</th>
                                    <th className="px-5 py-3 text-left">Side</th>
                                    <th className="px-5 py-3 text-right">Amount</th>
                                    <th className="px-5 py-3 text-right">Entry Price</th>
                                    <th className="px-5 py-3 text-right">Notional</th>
                                    <th className="px-5 py-3 text-right">Margin Used</th>
                                    <th className="px-5 py-3 text-right">Unreal. PnL</th>
                                    <th className="px-5 py-3 text-center">Lev.</th>
                                    <th className="px-5 py-3 text-right">Est. Liq.</th>
                                    <th className="px-5 py-3 text-right">SL / TP</th>
                                    <th className="px-5 py-3 text-left">Strategy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions.map((pos: any, idx: number) => {
                                    const notional = Math.abs(pos.amount * pos.entry_price);
                                    const marginUsed = notional / (pos.leverage || 1);
                                    const lev = pos.leverage || 1;
                                    const liqEstimate = lev > 1
                                        ? pos.amount > 0
                                            ? pos.entry_price * (1 - 0.9 / lev)
                                            : pos.entry_price * (1 + 0.9 / lev)
                                        : null;
                                    const isLong = pos.amount > 0;
                                    const fmtPrice = (v: number) => v === 0 ? '—' : v < 0.001 ? v.toExponential(3) : v < 1 ? v.toFixed(6) : v.toFixed(2);

                                    return (
                                        <tr
                                            key={pos.symbol}
                                            className={`border-b border-gray-800/40 hover:bg-indigo-500/5 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-gray-800/10'}`}
                                            onClick={() => setTradingViewModal(pos.symbol)}
                                        >
                                            <td className="px-5 py-3.5 font-bold text-white">{pos.symbol}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${isLong ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {isLong ? '▲ LONG' : '▼ SHORT'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono text-gray-300 text-xs">
                                                {Math.abs(pos.amount) >= 100 ? Math.abs(pos.amount).toFixed(0) : Math.abs(pos.amount) >= 1 ? Math.abs(pos.amount).toFixed(3) : Math.abs(pos.amount).toFixed(6)}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono text-gray-300 text-xs">${fmtPrice(pos.entry_price)}</td>
                                            <td className="px-5 py-3.5 text-right font-mono text-gray-300 text-xs">${notional.toFixed(2)}</td>
                                            <td className="px-5 py-3.5 text-right font-mono text-amber-400 text-xs">${marginUsed.toFixed(2)}</td>
                                            <td className="px-5 py-3.5 text-right font-mono font-semibold text-sm">
                                                <span className={pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                    {pos.unrealized_pnl >= 0 ? '+' : ''}{pos.unrealized_pnl.toFixed(4)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className="font-mono text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">{lev}x</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono text-red-400 text-xs">
                                                {liqEstimate ? `$${fmtPrice(liqEstimate)}` : '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-xs font-mono">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className={pos.stop_loss ? 'text-red-400' : 'text-gray-600'}>
                                                        SL: {pos.stop_loss ? `$${fmtPrice(pos.stop_loss)}` : '—'}
                                                    </span>
                                                    <span className={pos.take_profit ? 'text-emerald-400' : 'text-gray-600'}>
                                                        TP: {pos.take_profit ? `$${fmtPrice(pos.take_profit)}` : '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-indigo-400 text-xs">
                                                {strategies?.[pos.symbol] ?? '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Realized PnL Bar Chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center"><BarChart2 className="w-4 h-4 mr-2 text-indigo-400" /> Realized PnL per Trade (USDT)</h2>
                <div className="h-[200px] w-full relative">
                    {getPnlBarData().length > 0 ? (
                        <BarChartComponent data={getPnlBarData()} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                            <BarChart2 className="w-8 h-8 opacity-30 mb-3" />
                            <p>No closed trades yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Session Projections */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative min-h-[380px]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center"><Calendar className="w-4 h-4 mr-2 text-indigo-400" /> Session History (PnL %)</h2>
                    <div className="flex space-x-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                        {(['1D', '7D', 'WEEKLY', 'MONTHLY'] as const).map(v => (
                            <button key={v} onClick={() => setHistoryView(v)} className={`px-3 py-1 text-xs rounded-md transition-colors ${historyView === v ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                {v === '1D' ? 'Today' : v === '7D' ? '7 Days' : v === 'WEEKLY' ? 'Monthly' : 'All'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-[300px] w-full relative">
                    {sessions && getProjectionData().length > 0 ? (
                        <ChartComponent data={getProjectionData()} colors={{ lineColor: '#10B981', areaTopColor: 'rgba(16, 185, 129, 0.4)', areaBottomColor: 'rgba(16, 185, 129, 0.0)' }} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Activity className="w-8 h-8 opacity-50 mb-4 text-emerald-500" />
                            <p>No historical session data available.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Executions */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center"><Activity className="w-4 h-4 mr-2 text-indigo-400" /> Recent HMM Executions</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-500 bg-gray-800/50 uppercase border-b border-gray-800">
                            <tr>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Regime</th>
                                <th className="px-4 py-3">Strategy</th>
                                <th className="px-4 py-3">Confidence</th>
                                <th className="px-4 py-3">Calc Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {executions && executions.length > 0 ? executions.map((exc: any, i: number) => (
                                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-gray-400 text-xs">{exc.timestamp ? new Date(exc.timestamp).toLocaleTimeString() : '-'}</td>
                                    <td className="px-4 py-3 font-bold text-white text-sm">{exc.symbol}</td>
                                    <td className="px-4 py-3 text-indigo-400">{exc.regime}</td>
                                    <td className="px-4 py-3 text-emerald-400">{exc.strategy}</td>
                                    <td className="px-4 py-3 font-mono">{(exc.confidence * 100).toFixed(1)}%</td>
                                    <td className="px-4 py-3 font-mono text-amber-400">{exc.calculation_time ? exc.calculation_time.toFixed(3) + 's' : 'N/A'}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No recent executions found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
