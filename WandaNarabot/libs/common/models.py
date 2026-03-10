from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from libs.common.database import Base

class HMMDecision(Base):
    __tablename__ = "hmm_decisions"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    symbol = Column(String, index=True)
    regime = Column(String)  # e.g., 'BULL', 'BEAR', 'CHOP'
    strategy = Column(String) # e.g., 'LONG_HOLD', 'SHORT', 'CASH'
    confidence = Column(Float, nullable=True)
    raw_data = Column(JSON, nullable=True)
    calculation_time = Column(Float, default=0.0)

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    exchange_order_id = Column(String, unique=True, index=True)
    symbol = Column(String, index=True)
    side = Column(String) # BUY / SELL
    order_type = Column(String) # MARKET / LIMIT
    price = Column(Float)
    amount = Column(Float)
    status = Column(String) # FILLED / NEW / CANCELED
    market_type = Column(String) # SPOT / FUTURES
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)
    amount = Column(Float, default=0.0) # > 0 Long, < 0 Short
    entry_price = Column(Float, default=0.0)
    unrealized_pnl = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    market_type = Column(String) # SPOT / FUTURES
    leverage = Column(Integer, default=1)
    take_profit = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EquityTick(Base):
    __tablename__ = "equity_ticks"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    total_balance = Column(Float)
    available_balance = Column(Float)
    unrealized_pnl = Column(Float)

class BotState(Base):
    __tablename__ = "bot_state"

    id = Column(Integer, primary_key=True, index=True)
    is_running = Column(Boolean, default=False)
    active_symbols = Column(String) # comma separated e.g., "BTC/USDT,ETH/USDT"
    market_type = Column(String, default="futures")
    run_duration_hours = Column(Integer, default=0) # 0 means indefinite
    start_time = Column(DateTime(timezone=True), nullable=True)
    close_positions_on_stop = Column(Boolean, default=False)
    leverage = Column(Integer, default=1)  # leverage applied on this session
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TradeLog(Base):
    __tablename__ = "trade_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    symbol = Column(String, index=True)
    action = Column(String) # OPEN_LONG, CLOSE_LONG, OPEN_SHORT, CLOSE_SHORT
    amount = Column(Float)
    price = Column(Float)
    realized_pnl = Column(Float, nullable=True)

class BotSession(Base):
    __tablename__ = "bot_sessions"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_hours = Column(Integer, default=0)
    initial_capital = Column(Float, default=0.0)
    final_capital = Column(Float, nullable=True)
    profit_pct = Column(Float, nullable=True)
    session_type = Column(String, default='normal')  # 'normal' | 'daily'
