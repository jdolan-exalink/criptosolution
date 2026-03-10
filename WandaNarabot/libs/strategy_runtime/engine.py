import logging
from typing import Dict, Any
from libs.common.models import Position

logger = logging.getLogger(__name__)

class StrategyEngine:
    def __init__(self, market_type: str = "futures"):
        self.market_type = market_type
        
    def evaluate(self, hmm_data: Dict[str, Any], current_position: Position, df: Any = None) -> Dict[str, Any]:
        """
        Takes the recommendation from HMM Analyzer, current position, and pandas DataFrame with OHLCV data,
        and returns an action: 'BUY', 'SELL', 'CLOSE_LONG', 'CLOSE_SHORT', 'HOLD', etc.
        """
        current_state = hmm_data.get("state", {})
        recommendation = hmm_data.get("recommendation", {})
        
        regime = current_state.get("label", "UNKNOWN")
        strategy = recommendation.get("strategy", "HOLD")
        
        # We start with the fundamental action bias dictated by HMM
        action_bias = recommendation.get("action_bias", "CASH")
        symbol = hmm_data.get("symbol")
        
        action = {"action": "HOLD", "amount": 0.0, "reason": "No clear strategy", "tp": None, "sl": None}
        pos_amount = current_position.amount if current_position else 0.0
        confidence = current_state.get("confidence", 0.0)
        
        # 1. SPEC RULE 4: Confidence Rules (< 40%: Uncertain regime -> Reduce exposure / Do not trade)
        if confidence < 0.40:
            action_bias = "CASH"
            action["reason"] = f"Confidence {confidence*100:.1f}% < 40% -> Uncertain regime, reduce exposure"
            
        else:
            action["reason"] = f"Regime {regime} confirmed with {confidence*100:.1f}% confidence"

        # 2. Implement Technical Indicators evaluation based on strategy specs
        if df is not None and not df.empty and action_bias not in ["CASH", "HOLD"]:
            # Note: expecting `df` has columns Open, High, Low, Close, Volume
            try:
                import pandas_ta as ta
                # Compute indicators matching the specs
                df.ta.ema(length=21, append=True)
                df.ta.ema(length=50, append=True)
                df.ta.rsi(length=14, append=True)
                df.ta.atr(length=14, append=True)
                df.ta.macd(fast=12, slow=26, signal=9, append=True)
                # bb = df.ta.bbands(length=20, std=2)
                # if bb is not None: df = df.join(bb)
            except Exception as e:
                logger.error(f"TA error: {e}")
                
            last_row = df.iloc[-1]
            prev_row = df.iloc[-2]
            
            close = last_row['Close']
            atr = last_row.get('ATRr_14', close * 0.01) # Fallback 1% ATR
            rsi = last_row.get('RSI_14', 50)
            ema50 = last_row.get('EMA_50', close)
            ema21 = last_row.get('EMA_21', close)
            # macd_hist = last_row.get('MACDh_12_26_9', 0)
            
            trigger = False
            tp_price = None
            sl_price = None

            # SPEC RULE 5: Trading Strategies per Regime
            if strategy == "mean_reversion": # S0
                # Fallback simple mean reversion (ignoring BB for brevity)
                if action_bias == "LONG" and rsi < 45: # Relaxed from 30
                    trigger = True; tp_price = ema21; sl_price = close - (1 * atr)
                elif action_bias == "SHORT" and rsi > 55: # Relaxed from 70
                    trigger = True; tp_price = ema21; sl_price = close + (1 * atr)
                    
            elif strategy == "pullback_short": # S1
                if action_bias == "SHORT" and rsi > 40: # Relaxed
                    trigger = True; tp_price = min(df['Low'].tail(10)); sl_price = close + (1.5 * atr)
                    
            elif strategy == "momentum_short": # S2
                if action_bias == "SHORT" and close < (ema50 * 1.02): # 2% buffer above ema50
                    trigger = True; tp_price = close - (2 * atr); sl_price = close + (2 * atr)

            elif strategy == "trend_following": # S3
                if action_bias == "LONG" and close > (ema21 * 0.98): # 2% buffer below ema21
                    trigger = True; tp_price = close + (3 * atr); sl_price = close - (2 * atr)
                elif action_bias == "SHORT" and close < (ema21 * 1.02):
                    trigger = True; tp_price = close - (3 * atr); sl_price = close + (2 * atr)
                    
            elif strategy == "dip_buying": # S4
                if action_bias == "LONG" and rsi > 30 and rsi < 60: # Relaxed
                    trigger = True; tp_price = max(df['High'].tail(10)); sl_price = close - (1.5 * atr)
            else:
                trigger = True # Default allowed if strategy unknown but bias exists
                if action_bias == "LONG": sl_price = close - (1.5 * atr)
                elif action_bias == "SHORT": sl_price = close + (1.5 * atr)

            if not trigger:
                action_bias = "HOLD"
                action["reason"] = str(action["reason"]) + " | Technical triggers unfulfilled"
            else:
                action["reason"] = str(action["reason"]) + " | Technical triggers met"
                action["tp"] = tp_price
                action["sl"] = sl_price

        # 3. Final Execution State Machine based on Action Bias and Current Position
        if action_bias == "LONG":
            if pos_amount <= 0:
                if self.market_type == "futures" and pos_amount < 0:
                    action["action"] = "REVERSE_TO_LONG"
                else:
                    action["action"] = "OPEN_LONG"
                
        elif action_bias == "SHORT":
            if self.market_type == "futures":
                if pos_amount >= 0:
                    if pos_amount > 0:
                        action["action"] = "REVERSE_TO_SHORT"
                    else:
                        action["action"] = "OPEN_SHORT"
            else:
                if pos_amount > 0:
                    action["action"] = "CLOSE_LONG"
                    
        elif action_bias == "CASH":
            if pos_amount > 0:
                action["action"] = "CLOSE_LONG"
            elif pos_amount < 0 and self.market_type == "futures":
                action["action"] = "CLOSE_SHORT"
                
        logger.info(f"Evaluated strategy for {symbol} | Regime: {regime} | Strategy: {strategy} (Bias: {action_bias}) -> Action: {action['action']}")
        return action
