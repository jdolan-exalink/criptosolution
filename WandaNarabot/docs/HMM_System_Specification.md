# HMM REGIME-BASED CRYPTO TRADING SYSTEM
## Technical Specification & Architecture Document
Version: 1.0

### 1. System Objective
Develop a crypto trading system driven by a Hidden Markov Model (HMM) that:
- Detects market regimes
- Dynamically selects optimal trading strategies
- Executes trades via Binance API
- Provides a real-time monitoring interface
- Allows manual inspection and testing of signals

The system must operate in:
- Automatic trading mode
- Advisory mode (signal only)

### 2. System Architecture
Market Data -> Feature Engineering -> HMM Regime Detection -> Decision Engine -> Strategy Engine -> Risk Manager -> Execution Engine -> Exchange API (Binance)

Parallel system: Monitoring Dashboard, Analytics, Strategy Debugging, Manual Testing

### 3. HMM Regime Model
The model classifies market conditions into five regimes.
S0: Lateral Market (Range trading)
S1: Weak Bearish (Downtrend with corrections)
S2: Strong Bearish (Momentum selloff)
S3: Strong Bullish (Strong trend)
S4: Weak Bullish (Controlled uptrend)

The model returns probability distribution: P(S0), P(S1), P(S2), P(S3), P(S4)

### 4. Regime Selection Logic
Dominant state: state = argmax(P(Si))

Confidence rules:
- > 60%: Strong regime
- 40-60%: Transitional regime
- < 40%: Uncertain regime

If uncertain → reduce exposure.

### 5. Trading Strategies per Regime
- **S0 — Lateral Market**
  - Strategy: Mean Reversion
  - Indicators: Bollinger Bands (20,2), RSI (14), ATR, VWAP deviation
  - Entry Long: RSI < 30, Price touches lower BB, Volume > average
  - Entry Short: RSI > 70, Price touches upper BB
  - Exit: TP = Middle BB, SL = 1 ATR
- **S1 — Weak Bearish**
  - Strategy: Pullback Short
  - Indicators: EMA50, EMA200, RSI, Volume profile
  - Entry: Price retraces to EMA50, RSI 50-60, Bearish candle
  - Exit: TP = previous low, SL = 1.5 ATR
- **S2 — Strong Bearish**
  - Strategy: Momentum Short
  - Indicators: MACD, ATR, Volume spike detection, Order flow imbalance
  - Entry: Support breakdown, MACD bearish crossover, Volume spike
  - Exit: Trailing stop = 2 ATR
  - Optional: Countertrend scalp if RSI < 20
- **S3 — Strong Bullish**
  - Strategy: Trend Following
  - Indicators: EMA21, EMA50, MACD, VWAP
  - Entry: Pullback to EMA21, MACD bullish, Volume expansion
  - Exit: Trailing stop 2 ATR
- **S4 — Weak Bullish**
  - Strategy: Buy the Dip
  - Indicators: EMA50, RSI, Volume
  - Entry: Price retraces to EMA50, RSI 40-50, Bullish candle
  - Exit: TP = recent high, SL = 1.5 ATR

### 6. Decision Engine (CORE)
The decision engine combines:
- HMM regime
- Momentum signals
- Volatility state
- Multi-timeframe confirmation

Decision flow:
state = HMM.predict()
volatility = ATR_state()
momentum = MACD_state()
if state == S0: strategy = mean_reversion
if state == S1: strategy = pullback_short
if state == S2: strategy = momentum_short
if state == S3: strategy = trend_following
if state == S4: strategy = dip_buying

Then filter:
if volatility > threshold: adjust position size
if probability < 40%: do not trade

### 7. Multi-Timeframe Confirmation
HMM must run on 5m, 15m, 1h, 4h
Decision rules: Trade only if lower timeframe aligns with higher timeframe

### 8. Strategy Selection Optimizer
The system should track performance of strategies per regime.
Metrics stored: win_rate, profit_factor, drawdown, sharpe_ratio
After enough trades: select best strategy per regime automatically

### 9. Overfitting Prevention
HMM training must include Walk Forward Validation (Train: 6 months, Test: 1 month)
Rolling Retraining (weekly)
Regime stability check (Avoid models that produce excessive regime switching)

### 10. Risk Management Layer
- Position sizing: risk_per_trade = 1%
- Max exposure: max_portfolio_exposure = 15%
- Max concurrent trades: 3
- Emergency stop: If drawdown > 10%, disable trading

### 11. Execution Engine
Supported exchanges: Binance, Binance Testnet
Execution types: market, limit, stop, trailing stop
Latency must be <200ms.

### 12. Data Interfaces (MANDATORY)
APIs to expose: Market Data Interface, HMM Output Interface, Strategy Decision Interface, Trade Interface.

### 13. Monitoring Dashboard (MANDATORY)
Must show Regime Monitor, Strategy Monitor, Portfolio Monitor, Regime Heatmap, Strategy Performance.

### 14. Manual Analysis Interface
Users must be able to: Select symbol, Select timeframe, Run manual HMM analysis, Simulate strategies.

### 15. Logging System
All events must be logged: regime_change, trade_open, trade_close, strategy_switch, risk_event.

### 16. Backtesting Engine
Historical simulation, regime visualization, strategy comparison.

### 17. Future Enhancements
Reinforcement learning strategy selector, Orderbook microstructure analysis, Liquidity detection, Volatility clustering (GARCH).

### 18. Final Goal
A self-adaptive trading system where Market regime -> Strategy selection -> Risk management -> Trade execution are dynamically optimized.
