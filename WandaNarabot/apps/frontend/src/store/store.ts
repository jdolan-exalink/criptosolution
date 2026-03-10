import { create } from 'zustand';

export type AssetBalance = {
    asset: string;
    wallet_balance: number;
    available: number;
    unrealized_pnl: number;
};

export type BalanceDetails = {
    futures: AssetBalance[];
    spot: AssetBalance[];
    futures_total_usdt: number;
    spot_total_usdt: number;
    grand_total_usdt: number;
    error?: string;
};

interface AppState {
    botStatus: string;
    hmmStatus: string;
    initialCapital: number;
    currentCapital: number;
    availableBalance: number;
    equityUpdatedAt: string | null;
    profitPct: number;
    leverage: number;
    tradePct: number;
    strategies: any;
    regimes: any;
    lastSignal: any;
    environment: string;
    marketType: string;
    activeSymbols: string[];
    positions: any[];
    trades: any[];
    equity: any[];
    executions: any[];
    stats: any;
    config: any;
    availableSymbols: string[];
    runDurationHours: number;
    startTime: string | null;
    sessions: any[];
    closingPositions: boolean;
    balanceDetails: BalanceDetails | null;
    loadingBalanceDetails: boolean;
    fetchStatus: () => void;
    fetchSessions: () => void;
    fetchExecutions: () => void;
    fetchPositions: () => void;
    fetchTrades: () => void;
    fetchRegimes: () => void;
    fetchEquity: () => void;
    fetchConfig: () => void;
    fetchSymbols: () => void;
    fetchStats: () => void;
    fetchBalanceDetails: () => Promise<void>;
    updateConfig: (cfg: any) => Promise<void>;
    startBot: (duration_hours: number, symbols: string[], leverage?: number) => Promise<void>;
    stopBot: (closePositions?: boolean) => Promise<void>;
    clearPositions: () => Promise<number>;
    transferBalance: (asset: string, amount: number, direction: string) => Promise<{ success: boolean; result?: string; error?: string }>;
    testHMMConnection: (url: string) => Promise<any>;
    testBinanceConnection: (env: string, marketType: string, apiKey: string, apiSecret: string) => Promise<any>;
}

// Module-level consecutive failure counter — not part of reactive state
// so it doesn't trigger re-renders and persists across poll cycles.
let _fetchStatusFailures = 0;

export const useAppStore = create<AppState>((set) => ({
    botStatus: 'LOADING',
    hmmStatus: 'LOADING',
    initialCapital: 0,
    currentCapital: 0,
    availableBalance: 0,
    equityUpdatedAt: null,
    profitPct: 0,
    leverage: 1,
    tradePct: 0.01,
    strategies: {},
    lastSignal: { symbol: 'NONE', regime: 'UNKNOWN', strategy: 'AWAITING' },
    environment: 'TESTNET',
    marketType: 'FUTURES',
    activeSymbols: [],
    positions: [],
    trades: [],
    regimes: {},
    equity: [],
    executions: [],
    stats: null,
    config: null,
    availableSymbols: [],
    runDurationHours: 0,
    startTime: null,
    sessions: [],
    closingPositions: false,
    balanceDetails: null,
    loadingBalanceDetails: false,
    fetchStatus: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/status');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Successful response — reset failure counter
            _fetchStatusFailures = 0;
            set({
                botStatus: data.is_running ? 'RUNNING' : 'STOPPED',
                runDurationHours: data.run_duration_hours || 0,
                startTime: data.start_time || null,
                hmmStatus: data.hmm_status || 'OFFLINE',
                initialCapital: data.initial_capital || 0,
                currentCapital: data.current_capital || 0,
                availableBalance: data.available_balance || 0,
                equityUpdatedAt: data.equity_updated_at || null,
                profitPct: data.profit_pct || 0,
                leverage: data.leverage || 1,
                tradePct: data.trade_allocation_pct || 0.01,
                strategies: data.strategies || {},
                lastSignal: data.last_signal || { symbol: 'NONE', regime: 'UNKNOWN', strategy: 'AWAITING' },
                environment: data.environment,
                marketType: data.market_type,
                activeSymbols: data.active_symbols ? data.active_symbols.split(',') : [],
                closingPositions: data.close_positions_on_stop || false,
            });
        } catch (e) {
            _fetchStatusFailures++;
            if (_fetchStatusFailures === 1) {
                // First failure — switch to RECONNECTING so the UI shows a soft warning
                // without alarming the user for a single dropped request.
                set((state) => ({
                    botStatus: state.botStatus === 'LOADING' ? 'LOADING' : 'RECONNECTING',
                }));
            } else if (_fetchStatusFailures >= 3) {
                // Three consecutive failures — now declare truly offline
                set({ botStatus: 'OFFLINE', hmmStatus: 'OFFLINE' });
            }
        }
    },
    fetchPositions: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/positions');
            const data = await res.json();
            set({ positions: data });
        } catch (e) { }
    },
    fetchTrades: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/trades');
            const data = await res.json();
            set({ trades: data });
        } catch (e) { }
    },
    fetchRegimes: async () => {
        try {
            const state = useAppStore.getState();
            if (state.activeSymbols.length > 0) {
                const results: any = {};
                for (const sym of state.activeSymbols) {
                    const res = await fetch(`http://localhost:8000/api/v1/hmm/regime?symbol=${sym}`);
                    if (res.ok) {
                        results[sym] = await res.json();
                    }
                }
                set({ regimes: results });
            }
        } catch (e) { }
    },
    fetchEquity: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/equity');
            const data = await res.json();
            set({ equity: data });
        } catch (e) { }
    },
    fetchExecutions: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/executions?limit=30');
            if (res.ok) {
                const data = await res.json();
                set({ executions: data });
            }
        } catch (e) { }
    },
    fetchConfig: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/config');
            const data = await res.json();
            set({ config: data, environment: data.BINANCE_ENV, marketType: data.BINANCE_MARKET_TYPE });
        } catch (e) { }
    },
    fetchSessions: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/sessions');
            const data = await res.json();
            set({ sessions: data });
        } catch (e) { }
    },
    fetchSymbols: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/symbols');
            const data = await res.json();
            set({ availableSymbols: data });
        } catch (e) { }
    },
    fetchStats: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/stats');
            if (res.ok) {
                const data = await res.json();
                set({ stats: data });
            }
        } catch (e) { }
    },
    updateConfig: async (cfg: any) => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cfg)
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
                alert(`Error saving config: ${error.detail || 'Unknown error'}`);
                return null;
            }
            const result = await res.json();
            set({ config: cfg, environment: cfg.BINANCE_ENV, marketType: cfg.BINANCE_MARKET_TYPE });
            return result;
        } catch (e: any) {
            alert(`Error saving config: ${e.message}`);
            return null;
        }
    },
    startBot: async (duration_hours: number, symbols: string[], leverage: number = 1) => {
        try {
            await fetch('http://localhost:8000/api/v1/bot/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration_hours, symbols, leverage })
            });
            // Optimistic update then immediately refresh from server
            set({ botStatus: 'RUNNING', activeSymbols: symbols, leverage });
            const store = useAppStore.getState();
            await Promise.all([store.fetchStatus(), store.fetchStats(), store.fetchEquity()]);
        } catch (e) { }
    },
    stopBot: async (closePositions: boolean = false) => {
        try {
            await fetch('http://localhost:8000/api/v1/bot/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ close_positions: closePositions })
            });
            // Optimistic update then immediately refresh from server
            set({ botStatus: 'STOPPED', closingPositions: closePositions });
            const store = useAppStore.getState();
            await Promise.all([store.fetchStatus(), store.fetchStats()]);
        } catch (e) { }
    },
    clearPositions: async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/positions/clear', { method: 'DELETE' });
            const data = await res.json();
            set({ positions: [] });
            return data.cleared || 0;
        } catch (e) {
            return 0;
        }
    },
    testHMMConnection: async (url: string) => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/test/hmm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                return { success: false, error: error.error || error.message || `HTTP ${res.status}` };
            }
            return await res.json();
        } catch (e: any) {
            return { success: false, error: e.message || 'Connection failed' };
        }
    },
    testBinanceConnection: async (env: string, marketType: string, apiKey: string, apiSecret: string) => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/test/binance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    env: env, 
                    market_type: marketType, 
                    api_key: apiKey, 
                    api_secret: apiSecret 
                })
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                return { success: false, error: error.error || error.message || `HTTP ${res.status}` };
            }
            return await res.json();
        } catch (e: any) {
            return { success: false, error: e.message || 'Connection failed' };
        }
    },
    fetchBalanceDetails: async () => {
        set({ loadingBalanceDetails: true });
        try {
            const res = await fetch('http://localhost:8000/api/v1/balance/details');
            if (res.ok) {
                const data = await res.json();
                set({ balanceDetails: data });
            }
        } catch (e) { } finally {
            set({ loadingBalanceDetails: false });
        }
    },
    transferBalance: async (asset: string, amount: number, direction: string) => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/balance/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asset, amount, direction })
            });
            return await res.json();
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },
}));
