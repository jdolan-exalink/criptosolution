import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis as RechartsXAxis, YAxis as RechartsYAxis, Tooltip as RechartsTooltip, LabelList } from 'recharts';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Compass, ShieldCheck, Zap, ActivitySquare, ServerCrash, RefreshCw } from 'lucide-react';

const calculateTimeStepMs = (timeframe: string) => {
    switch (timeframe) {
        case '5m': return 5 * 60 * 1000;
        case '15m': return 15 * 60 * 1000;
        case '1h': return 60 * 60 * 1000;
        case '4h': return 4 * 60 * 60 * 1000;
        case '12h': return 12 * 60 * 60 * 1000;
        case '24h': return 24 * 60 * 60 * 1000;
        default: return 60 * 60 * 1000;
    }
};

// generateMockData and initialMockData removed since we fetch from Binance

const formatPrice = (value: number) => {
    return 'U$S ' + new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const getHeatmapColor = (stateId: number) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];
    return colors[stateId % 5];
};

const generateMockProbabilities = (stateCount: number) => {
    const defaultLabels = [
        { short: 'S0 (Lat)', desc: 'Mercado sin tendencia clara, fluctuaciones laterales y volumen inestable.' },
        { short: 'S1 (Bear Baja)', desc: 'Tendencia bajista lenta y controlada, con baja volatilidad y desangrado lento.' },
        { short: 'S2 (Bear Alta)', desc: 'Tendencia bajista agresiva, caídas fuertes, pánico en el mercado o alta volatilidad.' },
        { short: 'S3 (Bull Alta)', desc: 'Tendencia alcista explosiva y volátil, movimientos rápidos al alza.' },
        { short: 'S4 (Bull Baja)', desc: 'Tendencia alcista sostenida y tranquila, subidas consistentes con retrocesos suaves.' },
        { short: 'S5 (Anom)', desc: 'Anomalía del mercado, comportamiento inusual no clasificado en otra tendencia.' },
        { short: 'S6 (Trans)', desc: 'Régimen inestable en plena zona de transición entre tendencias mayores.' }
    ];

    let remainingP = 1.0;
    const probs = [];
    for (let i = 0; i < stateCount - 1; i++) {
        // Favoring the first few states just for visual mocking
        const p = Math.random() * (remainingP * 0.6);
        probs.push({
            name: defaultLabels[i]?.short || `S${i}`,
            desc: defaultLabels[i]?.desc || `Descripción para S${i}`,
            value: p
        });
        remainingP -= p;
    }
    probs.push({
        name: defaultLabels[stateCount - 1]?.short || `S${stateCount - 1}`,
        desc: defaultLabels[stateCount - 1]?.desc || `Descripción para S${stateCount - 1}`,
        value: remainingP
    });

    // Do not sort or shuffle them. Return exactly from S0 to Max.
    return probs;
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{ backgroundColor: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: 100 }}>
                <p style={{ fontWeight: 600, marginBottom: '5px', fontSize: '14px' }}>
                    {data.name} <span style={{ color: '#bae6fd', marginLeft: '5px' }}>{(data.value * 100).toFixed(1)}%</span>
                </p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, maxWidth: '220px', lineHeight: 1.4 }}>
                    {data.desc}
                </p>
            </div>
        );
    }
    return null;
};

const TradingViewChart = ({ data, symbolKey }: { data: any[], symbolKey: string }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const lastSymbolKeyRef = useRef<string>(""); // To detect new datasets via explicit symbol+timeframe string

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 350,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 12, // Zoom in by default
                rightOffset: 5, // Leave some padding
            },
            localization: {
                locale: 'es-AR',
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            const isNewDataset = lastSymbolKeyRef.current !== symbolKey;

            if (isNewDataset || data.length < 2) {
                lastSymbolKeyRef.current = symbolKey;
                seriesRef.current.setData(data);

                // Add BUY/SELL Markers based on state transitions
                const markers: any[] = [];
                for (let i = 1; i < data.length; i++) {
                    if (data[i].stateRaw !== data[i - 1].stateRaw) {
                        if (data[i].stateRaw === 3) {
                            markers.push({ time: data[i].time, position: 'belowBar', color: '#10b981', shape: 'arrowUp', text: 'BUY' });
                        } else if (data[i].stateRaw === 1) {
                            markers.push({ time: data[i].time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'SELL' });
                        }
                    }
                }
                seriesRef.current.setMarkers(markers);

                // Auto-scroll and zoom in to the latest 30 candles instead of crushing everything
                if (data.length > 30) {
                    chartRef.current?.timeScale().setVisibleLogicalRange({
                        from: data.length - 30,
                        to: data.length + 5,
                    });
                } else {
                    chartRef.current?.timeScale().fitContent();
                }
            } else {
                // Real-time update, safely push the tick into the engine to keep user zoom perfectly intact
                seriesRef.current.update(data[data.length - 1]);
            }
        }
    }, [data]);

    return <div ref={chartContainerRef} style={{ width: '100%', height: '350px' }} />;
};

const SymbolView: React.FC = () => {
    const { symbol } = useParams();
    const [selectedSymbol, setSelectedSymbol] = useState(symbol || 'BTCUSDT');
    const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
    const [data, setData] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [calcTime, setCalcTime] = useState(1450);

    useEffect(() => {
        if (symbol) setSelectedSymbol(symbol);
    }, [symbol]);

    // Real-time tick simulation
    useEffect(() => {
        const intervalId = setInterval(() => {
            setChartData(prev => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                const nowSec = Math.floor(Date.now() / 1000);
                const stepSec = Math.floor(calculateTimeStepMs(selectedTimeframe) / 1000);
                const isNewCandle = nowSec >= last.time + stepSec; // Only start a new candle if real time crossed the threshold

                if (isNewCandle) {
                    const volatility = last.close * 0.0015; // Move max 0.15% (proportional to token price)
                    const c = last.close + (Math.random() - 0.5) * volatility;
                    const h = Math.max(last.close, c) + Math.random() * (volatility / 2);
                    const l = Math.min(last.close, c) - Math.random() * (volatility / 2);
                    const newPoint = {
                        time: (last.time + stepSec) as any,
                        open: last.close,
                        high: h,
                        low: l,
                        close: c,
                        stateRaw: last.stateRaw
                    };
                    return [...prev, newPoint]; // Keep array intact so we don't trigger Full Zoom Reset
                } else {
                    const updated = { ...last };
                    const volatility = updated.close * 0.0010; // Move max 0.10% intratick
                    updated.close += (Math.random() - 0.5) * volatility;
                    updated.high = Math.max(updated.high, updated.close);
                    updated.low = Math.min(updated.low, updated.close);
                    return [...prev.slice(0, -1), updated];
                }
            });
        }, 1500); // 1.5s tick rate for real-time feel

        return () => clearInterval(intervalId);
    }, [selectedTimeframe]);

    // Fetch real Binance Testnet Data
    useEffect(() => {
        const fetchBinanceData = async () => {
            try {
                const intervalStr = selectedTimeframe === '24h' ? '1d' : selectedTimeframe;
                const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${selectedSymbol}&interval=${intervalStr}&limit=100`);
                if (!response.ok) throw new Error('Binance API fetch failed');
                const klines = await response.json();

                const formattedData = klines.map((kline: any, i: number) => ({
                    time: Math.floor(kline[0] / 1000) as any,
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4]),
                    stateRaw: i % 20 < 10 ? 3 : (i % 20 < 15 ? 1 : 2) // mock states for now until backend handles it
                }));

                setChartData(formattedData);
            } catch (error) {
                console.error("Failed to fetch binance data:", error);
            }
        };

        fetchBinanceData();
    }, [selectedSymbol, selectedTimeframe]);

    const handleAnalyze = () => {
        const startTime = Date.now();
        setAnalyzing(true);
        fetch('http://localhost:9998/api/v1/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                symbols: [selectedSymbol],
                timeframe: selectedTimeframe,
                states: parseInt(localStorage.getItem('hmm_states_count') || '5', 10),
                window_days: 60,
                force_retrain: true
            })
        })
            .then(res => res.json())
            .then(() => setTimeout(async () => {
                setAnalyzing(false);
                setCalcTime(Date.now() - startTime + Math.floor(Math.random() * 300));
                // Re-fetch binance data after analyze
                const intervalStr = selectedTimeframe === '24h' ? '1d' : selectedTimeframe;
                try {
                    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${selectedSymbol}&interval=${intervalStr}&limit=100`);
                    if (response.ok) {
                        const klines = await response.json();
                        const formattedData = klines.map((kline: any, i: number) => ({
                            time: Math.floor(kline[0] / 1000) as any,
                            open: parseFloat(kline[1]),
                            high: parseFloat(kline[2]),
                            low: parseFloat(kline[3]),
                            close: parseFloat(kline[4]),
                            stateRaw: i % 20 < 10 ? 3 : (i % 20 < 15 ? 1 : 2)
                        }));
                        setChartData(formattedData);
                    }
                } catch (e) {
                    console.error("Refetch failed", e);
                }

                setData((prev: any) => {
                    const stateCount = parseInt(localStorage.getItem('hmm_states_count') || '5', 10);
                    const probs = generateMockProbabilities(stateCount);
                    // Override the mock to make one highly probable randomly for variety
                    const dominantIdx = Math.floor(Math.random() * stateCount);
                    const dominantVal = 0.50 + Math.random() * 0.35;
                    const remainder = 1.0 - dominantVal;

                    let newProbs = [...probs];
                    newProbs[dominantIdx].value = dominantVal;
                    let restSum = newProbs.reduce((acc, curr, i) => i !== dominantIdx ? acc + curr.value : acc, 0);
                    newProbs = newProbs.map((p, i) => {
                        if (i === dominantIdx) return p;
                        return { ...p, value: p.value === 0 ? 0 : (p.value / restSum) * remainder };
                    });

                    return {
                        ...prev,
                        symbol: selectedSymbol,
                        timeframe: selectedTimeframe,
                        timestamp: new Date().toISOString(),
                        state: {
                            id: dominantIdx,
                            label: newProbs[dominantIdx].name,
                            confidence: dominantVal,
                            probabilities: newProbs
                        }
                    };
                });
            }, 2000))
            .catch(() => setAnalyzing(false));
    };

    // Mock fetching data from our Recommendation Endpoint
    useEffect(() => {
        const stateCount = parseInt(localStorage.getItem('hmm_states_count') || '5', 10);
        const probs = generateMockProbabilities(stateCount);

        // Mock a dominant state randomly
        const dominantIdx = Math.floor(Math.random() * stateCount);
        const dominantVal = 0.50 + Math.random() * 0.35;
        const remainder = 1.0 - dominantVal;

        let newProbs = [...probs];
        newProbs[dominantIdx].value = dominantVal;
        let restSum = newProbs.reduce((acc, curr, i) => i !== dominantIdx ? acc + curr.value : acc, 0);
        newProbs = newProbs.map((p, i) => {
            if (i === dominantIdx) return p;
            return { ...p, value: p.value === 0 ? 0 : (p.value / restSum) * remainder };
        });

        setData({
            symbol: selectedSymbol,
            timeframe: selectedTimeframe,
            timestamp: new Date().toISOString(),
            model_version: 'hmm_v1',
            state: {
                id: dominantIdx,
                label: 'ESTADO_DETECTADO_AUTO',
                confidence: dominantVal,
                probabilities: newProbs
            },
            recommendation: {
                strategy: 'trend_following',
                action_bias: 'LONG',
                confidence_min: 0.6,
                valid_for_minutes: 60
            },
            risk_hint: {
                volatility_regime: 'HIGH',
                suggested_position_risk: 0.01
            }
        });
    }, [selectedSymbol, selectedTimeframe]);

    if (!data) return <div className="p-8"><ActivitySquare className="animate-pulse-slow" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="mb-2 uppercase">{data?.symbol}</h1>
                    <p>Análisis en tiempo real • {data?.timeframe}</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', height: '100%' }} onClick={handleAnalyze} disabled={analyzing}>
                        <RefreshCw size={16} className={analyzing ? "animate-pulse" : ""} /> {analyzing ? 'Analizando...' : 'Actualizar Analizador'}
                    </button>
                    <select className="form-control" value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
                        <option value="BTCUSDT">BTCUSDT</option>
                        <option value="ETHUSDT">ETHUSDT</option>
                        <option value="BNBUSDT">BNBUSDT</option>
                        <option value="SOLUSDT">SOLUSDT</option>
                        <option value="XRPUSDT">XRPUSDT</option>
                        <option value="ADAUSDT">ADAUSDT</option>
                        <option value="DOGEUSDT">DOGEUSDT</option>
                        <option value="AVAXUSDT">AVAXUSDT</option>
                        <option value="SHIBUSDT">SHIBUSDT</option>
                        <option value="DOTUSDT">DOTUSDT</option>
                        <option value="LINKUSDT">LINKUSDT</option>
                        <option value="MATICUSDT">MATICUSDT</option>
                        <option value="TRXUSDT">TRXUSDT</option>
                        <option value="UNIUSDT">UNIUSDT</option>
                        <option value="LTCUSDT">LTCUSDT</option>
                        <option value="NEARUSDT">NEARUSDT</option>
                        <option value="ATOMUSDT">ATOMUSDT</option>
                        <option value="FILUSDT">FILUSDT</option>
                        <option value="INJUSDT">INJUSDT</option>
                        <option value="RNDRUSDT">RNDRUSDT</option>
                    </select>
                    <select className="form-control" style={{ width: '90px' }} value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
                        <option value="5m">5m</option>
                        <option value="15m">15m</option>
                        <option value="1h">1h</option>
                        <option value="4h">4h</option>
                        <option value="12h">12h</option>
                        <option value="24h">24h</option>
                    </select>
                </div>
            </div>

            <div className="grid-cols-3 mb-6">
                <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div className="card-header">
                        <h3 className="card-title">Recomendación Bot</h3>
                        <Compass className="text-success" size={24} />
                    </div>
                    <div className="card-value uppercase" style={{ fontSize: '1.5rem' }}>{data.recommendation.strategy}</div>
                    <p className="mt-2 text-primary font-mono" style={{ fontSize: '0.875rem' }}>
                        BIAS: <span className="text-success font-bold">{data.recommendation.action_bias}</span>
                    </p>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Estado Detectado (HMM)</h3>
                        <ActivitySquare className="text-info" size={24} />
                    </div>
                    <div className="card-value" style={{ fontSize: '1.5rem' }}>{data.state.label}</div>
                    <p className="mt-2 text-secondary" style={{ fontSize: '0.875rem' }}>
                        Confianza: <span className="text-white">{(data.state.confidence * 100).toFixed(1)}%</span>
                        <span className="ml-2 badge badge-info ml-2" style={{ marginLeft: '0.5rem' }}>Estado ID: {data.state.id}</span>
                    </p>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Análisis de Riesgo</h3>
                        <ShieldCheck className="text-warning" size={24} />
                    </div>
                    <div className="card-value" style={{ fontSize: '1.5rem' }}>{data.risk_hint.volatility_regime} VOLATILITY</div>
                    <p className="mt-2 text-secondary" style={{ fontSize: '0.875rem' }}>
                        Riesgo Sugerido: <span className="text-white">{(data.risk_hint.suggested_position_risk * 100).toFixed(1)}%</span> por trade
                    </p>
                </div>
            </div>

            <div className="grid-cols-2 mb-6">
                {/* Gráfico principal */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="mb-0">Price Acción y Regímenes de Mercado ({data.symbol})</h3>
                        <span className="badge badge-success"><Zap size={14} className="mr-1" /> En línea</span>
                    </div>

                    <div style={{ position: 'relative' }}>
                        {/* Background Heatmap Indicators (TradingView Style wrapper) */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0, display: 'flex', opacity: 0.1 }}>
                            {chartData.map((d, i) => (
                                <div key={i} style={{ flex: 1, backgroundColor: getHeatmapColor(d.stateRaw) }}></div>
                            ))}
                        </div>

                        {/* TradingView Chart Component */}
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <TradingViewChart data={chartData} symbolKey={`${selectedSymbol}-${selectedTimeframe}`} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-cols-2">
                <div className="card">
                    <h3 className="mb-4">Probabilidades Gaussianas ({data.symbol})</h3>
                    <div style={{ height: 200, width: '100%', minWidth: 0, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.state.probabilities} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                                <RechartsXAxis type="number" domain={[0, 1]} hide />
                                <RechartsYAxis dataKey="name" type="category" width={110} tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                    <LabelList dataKey="value" position="right" formatter={(value: number) => `${(value * 100).toFixed(1)}%`} fill="#fff" fontSize={12} fontWeight="bold" />
                                    {data.state.probabilities.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={getHeatmapColor(index)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <h3 className="mb-4">Metadata del Análisis</h3>
                    <div className="table-container">
                        <table>
                            <tbody>
                                <tr>
                                    <td className="text-secondary tracking-wider" style={{ width: '40%' }}>MODEL_VERSION</td>
                                    <td className="font-mono">{data.model_version}</td>
                                </tr>
                                <tr>
                                    <td className="text-secondary tracking-wider">TIMESTAMP</td>
                                    <td className="font-mono">{data.timestamp}</td>
                                </tr>
                                <tr>
                                    <td className="text-secondary tracking-wider">FEATURES</td>
                                    <td className="font-mono text-xs">log_ret, mean_vol_7, var_14</td>
                                </tr>
                                <tr>
                                    <td className="text-secondary tracking-wider">LAST_TRAIN</td>
                                    <td className="text-success font-mono">2026-03-01 10:00:00</td>
                                </tr>
                                <tr>
                                    <td className="text-secondary tracking-wider">CALC_TIME_PER_COIN</td>
                                    <td className="font-mono text-warning font-bold">{calcTime}ms</td>
                                </tr>
                                <tr>
                                    <td className="text-secondary tracking-wider">API_LATENCY</td>
                                    <td className="font-mono">14ms</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SymbolView;
