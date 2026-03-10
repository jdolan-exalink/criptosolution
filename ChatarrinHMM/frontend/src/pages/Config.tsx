import React, { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';

const Config: React.FC = () => {
    const [saving, setSaving] = useState(false);
    const [hmmStates, setHmmStates] = useState<number>(parseInt(localStorage.getItem('hmm_states_count') || '5', 10));

    const handleSave = () => {
        setSaving(true);
        localStorage.setItem('hmm_states_count', hmmStates.toString());
        setTimeout(() => setSaving(false), 1000);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="mb-2">Configuración</h1>
                    <p>Ajustes globales del motor HMM y el mapping de estrategias.</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={18} />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            <div className="grid-cols-2">
                <div className="card">
                    <h3 className="mb-4">Parámetros del Sistema</h3>

                    <div className="form-group">
                        <label className="form-label">Entorno de Operación</label>
                        <select className="form-control" defaultValue="testnet">
                            <option value="testnet">Testnet (binance.vision)</option>
                            <option value="production">Producción (api.binance.com)</option>
                        </select>
                    </div>

                    <div className="form-group mt-4">
                        <label className="form-label">API Key</label>
                        <input type="text" className="form-control" defaultValue="ZIBJjdGa3EfbP9ig3T81n8YhQzawMUdlVDNLDaIC1hORJ6yvZnAMR2yaAWezseoe" placeholder="Binance API Key" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Secret Key</label>
                        <input type="password" className="form-control" defaultValue="gkUqAWsMBXsGAhONT0NmBVmzkAXTwCYdR1dmgNvmCi2JfFTKmXIZlhNR95uOae3H" placeholder="Binance Secret Key" />
                    </div>

                    <div className="form-group mt-4">
                        <label className="form-label">Símbolos Activos (Separados por coma)</label>
                        <textarea
                            className="form-control"
                            defaultValue="BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, XRPUSDT, ADAUSDT, DOGEUSDT, AVAXUSDT, SHIBUSDT, DOTUSDT, LINKUSDT, MATICUSDT, TRXUSDT, UNIUSDT, LTCUSDT, NEARUSDT, ATOMUSDT, FILUSDT, INJUSDT, RNDRUSDT"
                            style={{ minHeight: '80px', resize: 'vertical' }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Timeframes a Analizar</label>
                        <input type="text" className="form-control" defaultValue="15m, 1h, 4h, 12h, 24h" />
                    </div>

                    <div className="form-group mt-6">
                        <label className="form-label">Intervalo Master del Scheduler (minutos)</label>
                        <input type="number" className="form-control" defaultValue={15} />
                    </div>
                </div>

                <div className="card">
                    <h3 className="mb-4">Parámetros HMM</h3>

                    <div className="form-group">
                        <label className="form-label">Cantidad de Estados Ocultos (3 a 7)</label>
                        <input type="number" className="form-control" value={hmmStates} onChange={(e) => setHmmStates(parseInt(e.target.value, 10))} min={3} max={7} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Ventana de Datos (Días a retroceder para entrenar)</label>
                        <input type="number" className="form-control" defaultValue={60} />
                    </div>

                    <hr className="my-6 border-glass" style={{ margin: '1.5rem 0', borderColor: 'var(--border-glass)' }} />

                    <div className="flex justify-between items-center mb-4">
                        <h3 className="mb-0">Strategy Mapper Rules</h3>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                            <RefreshCw size={14} /> Reset
                        </button>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>HMM State Label</th>
                                    <th>Estrategia Sugerida</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-secondary font-mono text-sm">UP_TREND_HIGH_VOL</td>
                                    <td>
                                        <select className="form-control" style={{ padding: '0.25rem 0.5rem' }}>
                                            <option>trend_following</option>
                                            <option>breakout</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="text-secondary font-mono text-sm">RANGE_LOW_VOL</td>
                                    <td>
                                        <select className="form-control" style={{ padding: '0.25rem 0.5rem' }}>
                                            <option>mean_reversion</option>
                                            <option>no_trade</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="text-secondary font-mono text-sm">DOWN_TREND</td>
                                    <td>
                                        <select className="form-control" style={{ padding: '0.25rem 0.5rem' }} defaultValue="trend_following_short">
                                            <option>trend_following_short</option>
                                            <option>mean_reversion</option>
                                        </select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Config;
