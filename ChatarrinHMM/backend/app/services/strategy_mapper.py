from typing import Dict, Any

class StrategyMapper:
    """
    Mapeo configurable entre el estado detectado (probabilidad máxima)
    y la estrategia recomendada al bot. Puede leerse desde DB.
    """
    
    DEFAULT_MAPPING = {
        "Trend": {
            "strategy": "trend_following",
            "action_bias": "LONG",
            "risk_hint": "LOW",
        },
        "Trend down": {
            "strategy": "trend_following_short",
            "action_bias": "SHORT",
            "risk_hint": "HIGH",
        },
        "Range": {
            "strategy": "mean_reversion",
            "action_bias": "NEUTRAL",
            "risk_hint": "LOW",
        },
        "High vol": {
            "strategy": "breakout",
            "action_bias": "NEUTRAL",
            "risk_hint": "HIGH"
        },
        "Low confidence": {
            "strategy": "no_trade",
            "action_bias": "NONE",
            "risk_hint": "N/A"
        }
    }
    
    @classmethod
    def get_recommendation(cls, state_label: str) -> Dict[str, Any]:
        return cls.DEFAULT_MAPPING.get(state_label, cls.DEFAULT_MAPPING["Low confidence"])
