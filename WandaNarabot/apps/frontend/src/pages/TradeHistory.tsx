import { useEffect } from 'react';
import { useAppStore } from '../store/store';
import { History } from 'lucide-react';

const TradeHistory = () => {
    const { trades, fetchTrades } = useAppStore();

    useEffect(() => {
        fetchTrades();
        const interval = setInterval(() => {
            fetchTrades();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchTrades]);

    const formatTime = (timeStr: string) => {
        if (!timeStr) return "N/A";
        const d = new Date(timeStr);
        return d.toLocaleString();
    };

    const getActionColor = (action: string) => {
        if (action.includes('LONG') && action.includes('OPEN') || action.includes('BUY')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (action.includes('SHORT') && action.includes('OPEN') || action.includes('SELL')) return 'text-red-400 bg-red-500/10 border-red-500/20';
        if (action.includes('CLOSE')) return 'text-slate-300 bg-slate-500/10 border-slate-500/20';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        <History className="w-8 h-8 mr-3 text-indigo-500" />
                        Trade History
                    </h1>
                    <p className="text-gray-400 mt-1">Review your past trades and realized profits</p>
                </div>
            </header>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-800/80 text-xs uppercase font-semibold text-gray-300">
                            <tr>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Symbol</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-right">Price</th>
                                <th className="px-6 py-4 text-right">Realized PnL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {!trades || trades.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No trade history found.
                                    </td>
                                </tr>
                            ) : (
                                trades.map((trade, idx) => (
                                    <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatTime(trade.timestamp)}</td>
                                        <td className="px-6 py-4 font-bold text-white tracking-wide">{trade.symbol}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded text-xs border ${getActionColor(trade.action)}`}>
                                                {trade.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-200">{trade.amount.toFixed(4)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-200">${trade.price.toFixed(4)}</td>
                                        <td className="px-6 py-4 text-right font-mono font-medium">
                                            {trade.realized_pnl !== null && trade.realized_pnl !== undefined ? (
                                                <span className={trade.realized_pnl > 0 ? 'text-emerald-400' : trade.realized_pnl < 0 ? 'text-red-400' : 'text-gray-400'}>
                                                    {trade.realized_pnl > 0 ? '+' : ''}{trade.realized_pnl.toFixed(2)} USDT
                                                </span>
                                            ) : (
                                                <span className="text-gray-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TradeHistory;
