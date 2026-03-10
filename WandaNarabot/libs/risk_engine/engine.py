class RiskEngine:
    def __init__(self, max_drawdown: float = 0.1, max_position_size: float = 0.05):
        self.max_drawdown = max_drawdown
        self.max_position_size = max_position_size

    def calculate_position_size(self, balance: float, symbol_risk: float = 1.0) -> float:
        # Simple percentage based position sizing
        return balance * self.max_position_size * symbol_risk

    def check_exposure_limit(self, current_exposure: float, new_order_cost: float, total_balance: float) -> bool:
        if current_exposure + new_order_cost > total_balance * (self.max_position_size * 5): # Allow max 5 positions
            return False
        return True
