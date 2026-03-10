from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, text
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

Base = declarative_base()

class Symbol(Base):
    __tablename__ = "symbols"
    id = Column(Integer, primary_key=True, index=True)
    pair = Column(String, unique=True, index=True)
    base_asset = Column(String)
    quote_asset = Column(String)
    is_active = Column(Boolean, default=True)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(Integer, primary_key=True)
    symbol_id = Column(Integer)
    timeframe = Column(String)
    n_states = Column(Integer)
    version = Column(String)
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class AnalysisHistory(Base):
    __tablename__ = "analysis_history"
    id = Column(Integer, primary_key=True)
    symbol_id = Column(Integer)
    timeframe = Column(String)
    timestamp = Column(DateTime)
    detected_state_id = Column(Integer)
    state_label = Column(String)
    confidence = Column(Float)
    probabilities_json = Column(JSONB)
    recommended_strategy = Column(String)
