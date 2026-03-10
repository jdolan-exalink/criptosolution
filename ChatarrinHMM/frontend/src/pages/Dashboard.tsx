import React, { useEffect, useState } from 'react';
import { Activity, Database, Server, Clock, Brain } from 'lucide-react';

const Dashboard: React.FC = () => {
    const [health, setHealth] = useState<string>('Checking...');
    const [analyzing, setAnalyzing] = useState(false);
    const [executions, setExecutions] = useState([
        { id: 'anl_9f3a21', symbol: 'BTCUSDT', tf: '1h', status: 'OK', calcTime: 1450 },
        { id: 'anl_5c2b18', symbol: 'ETHUSDT', tf: '1h', status: 'OK', calcTime: 1210 },
        { id: 'anl_8d4e99', symbol: 'SOLUSDT', tf: '15m', status: 'OK', calcTime: 980 },
        { id: 'anl_1a2b3c', symbol: 'BNBUSDT', tf: '4h', status: 'OK', calcTime: 1150 }
    ]);

    const handleForceAnalysis = () => {
        setAnalyzing(true);
        fetch('http://localhost:9998/api/v1/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "SHIBUSDT", "DOTUSDT", "LINKUSDT", "MATICUSDT", "TRXUSDT", "UNIUSDT", "LTCUSDT", "NEARUSDT", "ATOMUSDT", "FILUSDT", "INJUSDT", "RNDRUSDT"],
                timeframe: "1h",
                states: 5,
                window_days: 60,
                force_retrain: true
            })
        })
            .then(res => res.json())
            .then(() => setTimeout(() => {
                setAnalyzing(false);
                const mockSymbols = ["ADAUSDT", "DOGEUSDT", "AVAXUSDT", "SHIBUSDT", "DOTUSDT"];
                const newExecs = mockSymbols.map(sym => ({
                    id: `anl_${Math.random().toString(16).slice(2, 8)}`,
                    symbol: sym,
                    tf: '1h',
                    status: 'OK',
                    calcTime: Math.floor(Math.random() * 2000) + 800
                }));
                setExecutions(prev => [...newExecs, ...prev].slice(0, 8));
            }, 2000))
            .catch(() => setAnalyzing(false));
    };

    useEffect(() => {
        fetch('http://localhost:9998/api/v1/health')
            .then(res => res.json())
            .then(data => setHealth(data.status))
            .catch(() => setHealth('Offline'));
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="mb-2">Estado del Sistema</h1>
                    <p>Visión general del Analizador HMM y modelos en ejecución.</p>
                </div>
                <button className="btn btn-primary" onClick={handleForceAnalysis} disabled={analyzing}>
                    <Activity size={18} className={analyzing ? "animate-pulse" : ""} />
                    {analyzing ? 'Iniciando...' : 'Forzar Ejecución Batch'}
                </button>
            </div>

            <div className="mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}>
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Backend Status</h3>
                        <Server className={health === 'ok' ? 'text-success' : 'text-danger'} size={24} />
                    </div>
                    <div className="card-value">{health === 'ok' ? 'Operativo' : 'Desconectado'}</div>
                    <p className="mt-2 text-success" style={{ fontSize: '0.875rem' }}>Latencia: 12ms</p>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Última Corrida</h3>
                        <Clock className="text-secondary" size={24} />
                    </div>
                    <div className="card-value">Hace 4 min</div>
                    <p className="mt-2 text-warning" style={{ fontSize: '0.875rem' }}>Próxima en 11 min</p>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Símbolos Activos</h3>
                        <Database className="text-accent" size={24} />
                    </div>
                    <div className="card-value">12</div>
                    <p className="mt-2 text-secondary" style={{ fontSize: '0.875rem' }}>En 3 timeframes (5m, 1h, 1d)</p>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Modelos Ready</h3>
                        <Brain className="text-info" size={24} />
                    </div>
                    <div className="card-value">36</div>
                    <p className="mt-2 text-success" style={{ fontSize: '0.875rem' }}>Convergencia: 100%</p>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Binance API</h3>
                        <Activity className="text-success" size={24} />
                    </div>
                    <div className="card-value text-success">Conectado</div>
                    <p className="mt-2 text-secondary" style={{ fontSize: '0.875rem' }}>Testnet (16ms lat)</p>
                </div>
            </div>

            <div className="grid-cols-2">
                <div className="card">
                    <h3 className="mb-4">Ejecuciones Recientes</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Job ID</th>
                                    <th>Símbolo</th>
                                    <th>TF</th>
                                    <th>Estado</th>
                                    <th>Tiempo Calc.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {executions.map((exec, index) => (
                                    <tr key={index}>
                                        <td>{exec.id}</td>
                                        <td>{exec.symbol}</td>
                                        <td>{exec.tf}</td>
                                        <td><span className={`badge badge-${exec.status === 'OK' ? 'success' : 'warning'}`}>{exec.status}</span></td>
                                        <td className="font-mono text-secondary">{exec.calcTime}ms</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h3 className="mb-4">Salud del Scheduler (Celery)</h3>
                    <div className="flex flex-col gap-4 mt-2">
                        <div className="flex justify-between items-center p-3 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-success" />
                                <span>analyze-btc-1h-every-15m</span>
                            </div>
                            <span className="text-secondary text-sm">Habilitado</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-success" />
                                <span>analyze-eth-15m-every-5m</span>
                            </div>
                            <span className="text-secondary text-sm">Habilitado</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
