import pandas as pd
import numpy as np

class FeatureEngineer:
    def __init__(self, warmup_period: int = 14):
        self.warmup_period = warmup_period

    def calculate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calcula las features obligatorias sugeridas.
        df debe tener las columnas ['open', 'high', 'low', 'close', 'volume']
        """
        df = df.copy()
        
        # log_return
        df['log_return'] = np.log(df['close'] / df['close'].shift(1))
        
        # rolling_volatility
        df['rolling_volatility'] = df['log_return'].rolling(window=self.warmup_period).std()
        
        # momentum
        df['momentum'] = (df['close'] / df['close'].shift(self.warmup_period)) - 1
        
        # volume_normalized
        df['volume_normalized'] = df['volume'] / df['volume'].rolling(window=self.warmup_period).mean()
        
        # ATR (Average True Range) opcional
        high_low = df['high'] - df['low']
        high_close_prev = np.abs(df['high'] - df['close'].shift(1))
        low_close_prev = np.abs(df['low'] - df['close'].shift(1))
        tr = pd.concat([high_low, high_close_prev, low_close_prev], axis=1).max(axis=1)
        df['atr'] = tr.rolling(window=self.warmup_period).mean()

        return df.dropna()

    def normalize(self, df: pd.DataFrame, features: list):
        # StandardScaler fit/transform
        pass
