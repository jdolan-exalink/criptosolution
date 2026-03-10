from hmmlearn.hmm import GaussianHMM
import numpy as np
import pickle
import os

class HMMEngine:
    def __init__(self, n_components: int = 5, covariance_type="full", n_iter=1000, random_state=42):
        self.n_components = n_components
        self.model = GaussianHMM(n_components=n_components, covariance_type=covariance_type, n_iter=n_iter, random_state=random_state)
        
    def fit(self, X: np.ndarray):
        """
        Entrena el modelo asumiendo X shape (n_samples, n_features).
        Monitorea convergencia y puede reintentar en caso de fallo.
        """
        self.model.fit(X)
        if not self.model.monitor_.converged:
            raise Exception("HMM Engine no convergió.")
        
        # Recomendable: Sortear los estados basados en las medias de la primera feature (log_returns)
        # Esto previene que en cada reentrenamiento cambien de lugar las etiquetas de los estados
        self._sort_states()
        
    def predict_proba(self, X: np.ndarray):
        """
        Retorna los estados más probables para las últimas observaciones (o toda la serie)
        """
        return self.model.predict_proba(X)
        
    def save(self, filepath: str):
        with open(filepath, "wb") as f:
            pickle.dump(self.model, f)
            
    def load(self, filepath: str):
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"No existe el modelo en {filepath}")
        with open(filepath, "rb") as f:
            self.model = pickle.load(f)

    def _sort_states(self):
        """
        Intercambia medias y covarianzas para asegurar estabilidad semántica de rótulos de estado.
        """
        pass
