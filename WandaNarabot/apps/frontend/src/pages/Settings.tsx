import { useEffect, useState } from 'react';
import { useAppStore } from '../store/store';
import { Settings as SettingsIcon, Save, Link as LinkIcon, AlertCircle, CheckCircle, Play } from 'lucide-react';

const Settings = () => {
    const { config, fetchConfig, updateConfig, testHMMConnection, testBinanceConnection } = useAppStore();
    const [formData, setFormData] = useState<any>({});
    const [saved, setSaved] = useState(false);

    // Test Statuses
    const [testHMM, setTestHMM] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ status: 'idle', msg: '' });
    const [testBinanceT, setTestBinanceT] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ status: 'idle', msg: '' });
    const [testBinanceP, setTestBinanceP] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ status: 'idle', msg: '' });

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    useEffect(() => {
        if (config) {
            setFormData(config);
        }
    }, [config]);

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        const result: any = await updateConfig(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 5000);
        // Show alert about needing to restart
        if (result?.message) {
            alert(result.message);
        }
    };

    const handleTestHMMConnection = async () => {
        setTestHMM({ status: 'loading', msg: '' });
        const res = await testHMMConnection(formData.HMM_API_URL);
        if (res.success) setTestHMM({ status: 'success', msg: `OK (${res.status_code})` });
        else setTestHMM({ status: 'error', msg: res.error });
    };

    const handleTestBinance = async (env: 'testnet' | 'prod') => {
        const isTestnet = env === 'testnet';
        const apiKey = isTestnet ? formData.BINANCE_TESTNET_API_KEY : formData.BINANCE_PROD_API_KEY;
        const apiSecret = isTestnet ? formData.BINANCE_TESTNET_API_SECRET : formData.BINANCE_PROD_API_SECRET;

        if (isTestnet) setTestBinanceT({ status: 'loading', msg: '' });
        else setTestBinanceP({ status: 'loading', msg: '' });

        const res = await testBinanceConnection(env, formData.BINANCE_MARKET_TYPE, apiKey, apiSecret);

        const updateObj = res.success ? { status: 'success' as const, msg: res.message } : { status: 'error' as const, msg: res.error };

        if (isTestnet) setTestBinanceT(updateObj);
        else setTestBinanceP(updateObj);
    };

    if (!config) return <div className="p-8 text-gray-500">Loading Configuration...</div>;

    const renderTestStatus = (s: any) => {
        if (s.status === 'loading') return <span className="text-yellow-500 text-xs ml-2 animate-pulse">Testing...</span>;
        if (s.status === 'success') return <span className="text-emerald-500 text-xs ml-2 flex items-center"><CheckCircle className="w-3 h-3 justify-center mr-1" /> OK</span>;
        if (s.status === 'error') {
            const errorMsg = s.msg || 'Unknown error';
            return <span className="text-red-500 text-xs ml-2 flex shrink-0 break-all" title={errorMsg}><AlertCircle className="w-3 h-3 mr-1 shrink-0 mt-0.5" /> {errorMsg.length > 40 ? errorMsg.slice(0, 40) + '...' : errorMsg}</span>;
        }
        return null;
    }

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <header className="mb-8 flex items-center mb-6">
                <SettingsIcon className="w-8 h-8 text-indigo-400 mr-3" />
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Configuration</h1>
            </header>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-3xl shadow-xl">
                <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                    {/* General Settings */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Environment</label>
                            <select
                                name="BINANCE_ENV"
                                value={formData.BINANCE_ENV || 'testnet'}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 rounded-lg px-4 py-3 text-white focus:ring focus:ring-indigo-500/20 outline-none transition-all"
                            >
                                <option value="testnet">Testnet</option>
                                <option value="prod">Production</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Market Type</label>
                            <select
                                name="BINANCE_MARKET_TYPE"
                                value={formData.BINANCE_MARKET_TYPE || 'futures'}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 rounded-lg px-4 py-3 text-white focus:ring focus:ring-indigo-500/20 outline-none transition-all"
                            >
                                <option value="futures">Futures (Leveraged)</option>
                                <option value="spot">Spot</option>
                            </select>
                        </div>
                    </div>

                    {/* HMM API Config */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2 flex items-center justify-between">
                            <div className="flex items-center"><LinkIcon className="w-4 h-4 mr-2 text-indigo-400" /> External HMM Analyzer</div>
                            <button type="button" onClick={handleTestHMMConnection} className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full flex items-center transition-colors">
                                <Play className="w-3 h-3 mr-1" /> Test Connection
                            </button>
                        </h3>
                        <div className="space-y-2">
                            <div className="flex">
                                <label className="text-sm font-medium text-gray-400">HMM API URL (Can be local or remote)</label>
                                {renderTestStatus(testHMM)}
                            </div>
                            <input
                                name="HMM_API_URL"
                                value={formData.HMM_API_URL || 'http://localhost:8080/api/v1'}
                                onChange={handleChange}
                                type="text"
                                placeholder="http://localhost:8080/api/v1"
                                className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 rounded-lg px-4 py-3 text-white focus:ring focus:ring-indigo-500/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Trading Allocation & AI Control Settings */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2 flex items-center justify-between">
                            <div className="flex items-center"><SettingsIcon className="w-4 h-4 mr-2 text-indigo-400" /> Trading Rules & HMM</div>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Capital Allocation per Trade (%)</label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        name="TRADE_ALLOCATION_PCT"
                                        type="range"
                                        min="0.01"
                                        max="1.0"
                                        step="0.01"
                                        value={formData.TRADE_ALLOCATION_PCT || 0.01}
                                        onChange={handleChange}
                                        className="w-full accent-indigo-500"
                                    />
                                    <span className="text-white font-mono bg-gray-800 px-3 py-1 rounded w-16 text-center">
                                        {Math.round((formData.TRADE_ALLOCATION_PCT || 0.01) * 100)}%
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Futures Leverage (x)</label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        name="TRADE_LEVERAGE"
                                        type="range"
                                        min="1"
                                        max="50"
                                        step="1"
                                        value={formData.TRADE_LEVERAGE || 1}
                                        onChange={handleChange}
                                        className="w-full accent-indigo-500"
                                    />
                                    <span className="text-white font-mono bg-gray-800 px-3 py-1 rounded w-16 text-center">
                                        {formData.TRADE_LEVERAGE || 1}x
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">HMM Refresh Rate (Seconds)</label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        name="HMM_REFRESH_RATE_SEC"
                                        type="range"
                                        min="30"
                                        max="3600"
                                        step="30"
                                        value={formData.HMM_REFRESH_RATE_SEC || 60}
                                        onChange={handleChange}
                                        className="w-full accent-indigo-500"
                                    />
                                    <span className="text-white font-mono bg-gray-800 px-3 py-1 rounded w-20 text-center">
                                        {formData.HMM_REFRESH_RATE_SEC || 60}s
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* API Keys Settings */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2 flex items-center justify-between">
                            <span>Binance Testnet API Keys</span>
                            <button type="button" onClick={() => handleTestBinance('testnet')} className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full flex items-center transition-colors">
                                <Play className="w-3 h-3 mr-1" /> Validate Keys
                            </button>
                        </h3>
                        {renderTestStatus(testBinanceT)}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Testnet API Key</label>
                                <input
                                    name="BINANCE_TESTNET_API_KEY"
                                    value={formData.BINANCE_TESTNET_API_KEY || ''}
                                    onChange={handleChange}
                                    type="password"
                                    placeholder="Enter your Testnet API Key"
                                    className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 rounded-lg px-4 py-3 text-white focus:ring focus:ring-indigo-500/20 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Testnet API Secret</label>
                                <input
                                    name="BINANCE_TESTNET_API_SECRET"
                                    value={formData.BINANCE_TESTNET_API_SECRET || ''}
                                    onChange={handleChange}
                                    type="password"
                                    placeholder="Enter your Testnet API Secret"
                                    className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 rounded-lg px-4 py-3 text-white focus:ring focus:ring-indigo-500/20 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2 flex items-center justify-between">
                            <div className="flex items-center"><AlertCircle className="w-4 h-4 mr-2 text-red-400" /> Binance Production (Mainnet) API Keys</div>
                            <button type="button" onClick={() => handleTestBinance('prod')} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-full flex items-center transition-colors">
                                <Play className="w-3 h-3 mr-1" /> Validate Keys
                            </button>
                        </h3>
                        {renderTestStatus(testBinanceP)}
                        <div className="grid grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-red-300">Prod API Key</label>
                                <input
                                    name="BINANCE_PROD_API_KEY"
                                    value={formData.BINANCE_PROD_API_KEY || ''}
                                    onChange={handleChange}
                                    type="password"
                                    placeholder="Enter your Production API Key"
                                    className="w-full bg-gray-950 border border-gray-800 focus:border-red-500 rounded-lg px-4 py-3 text-white focus:ring focus:ring-red-500/20 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-red-300">Prod API Secret</label>
                                <input
                                    name="BINANCE_PROD_API_SECRET"
                                    value={formData.BINANCE_PROD_API_SECRET || ''}
                                    onChange={handleChange}
                                    type="password"
                                    placeholder="Enter your Production API Secret"
                                    className="w-full bg-gray-950 border border-gray-800 focus:border-red-500 rounded-lg px-4 py-3 text-white focus:ring focus:ring-red-500/20 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex items-center space-x-4">
                        <button type="submit" className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20">
                            <Save className="w-5 h-5" />
                            <span>Save Configuration</span>
                        </button>
                        {saved && <span className="text-emerald-400 flex items-center text-sm"><CheckCircle className="w-4 h-4 mr-1" /> Saved successfully</span>}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
