# Analizador HMM - Documentación de Arquitectura

## A. Resumen ejecutivo
El Analizador HMM es un microservicio independiente encargado de ingerir datos de mercado de criptomonedas (Binance Spot), procesarlos para extraer características clave (Feature Engineering), entrenar modelos Ocultos de Markov (HMM) para detectar regímenes de mercado, y recomendar la estrategia óptima para un próximo período. Es consumido pasivamente por bots de trading externos y ofrece una UI web de supervisión. La restricción fundamental es que **no ejecuta órdenes en mercados reales**.

## B. Arquitectura propuesta
La arquitectura sigue un patrón modular basado en servicios:
1. **Market Data Layer**: Abstrae la conexión con Binance API (Testnet/Production).
2. **Feature Engineering**: Calcula `log_return`, `rolling_volatility`, `momentum`, `volume_normalized`, y `ATR`. Maneja normalización.
3. **HMM Engine**: Administra ciclo de vida de modelos Gaussian HMM (entrenamiento, guardado, inferencia).
4. **Strategy Mapper**: Mapea estados detectados a estrategias recomendadas vía diccionario configurable.
5. **API & Security Layer**: Expone endpoints RESTful con autenticación JWT / API Keys y un Rate Limiter.
6. **Persistence Layer**: PostgreSQL usando SQLAlchemy para históricos y metadata.
7. **Scheduler / Jobs Worker**: Celery para coordinar el `POST /analyze` asíncrono y los reentrenamientos en background.

## C. Stack sugerido y justificación
- **Backend Core**: Python 3.11+ con **FastAPI** (alto rendimiento, validación automática con Pydantic, tipado fuerte).
- **Machine Learning**: `hmmlearn`, `pandas`, `numpy`, `scikit-learn` (estándares de la industria, muy robustos y probados).
- **Base de Datos**: **PostgreSQL** + **SQLAlchemy** (ACID, JSON para almacenar listas de probabilidades).
- **Caché y Tareas**: **Redis** + **Celery** (ideal para schedulers distribuidos y manejo de tareas pesadas).
- **Frontend**: **React** con **Vite** y TypeScript + TailwindCSS (Rendimiento rápido, dashboard moderno).
- **Infraestructura**: **Docker & Docker Compose**.

## D. Diseño de backend
Estructura basada en Domain-Driven Design simplificada:
- `api/`: Controladores de FastAPI.
- `core/`: Configuración (`pydantic-settings`), utilidades de contexto (Market config Testnet vs Prod), seguridad.
- `services/`: Lógica de negocio (FeatureEngineer, HMMEngine, MarketDataService).
- `models/`: Modelos ORM y Data Transfer Objects.
- `worker/`: Tasks Celery.

## E. Diseño de frontend
Un dashboard SPA (Single Page Application):
- **Layout**: Sidebar con navegación (Dashboard, Análisis, Modelos, Configuración, API Keys).
- **Componentes**: 
  - Vista gráfica de OHLC.
  - Heatmap overlay de colores para los tipos de régimen de mercado detectados por el modelo.

## F. Diseño del modelo HMM y pipeline analítico
1. **Ingesta**: Download de `klines`.
2. **Features**: 
   - `log_return = log(close_t / close_{t-1})`
   - `rolling_vol_windows = log_return.rolling(window).std()`
3. **Preprocesamiento**: Normalización StandardScaler de las features. Drop NaNs iniciales.
4. **HMM Engine**: `GaussianHMM(n_components=K)`. Fit vía EM. Ordenar gaussianas luego de entrenadas para tener etiquetas de estados coherentes a lo largo de los reentrenamientos.
5. **Inferencia**: `model.predict_proba()` entrega los `probabilities`. Etiqueta de estado en base a la Gaussiana actual.

## G. Modelo de datos
- `symbols`: Activos.
- `model_versions`: Metadata de los diferentes hmm guardados.
- `analysis_history`: Almacena el snapshot de un análisis evaluado y la recomendación dada, útil para la UI y la re-auditoría.
- `strategy_mapping`: Tabla para configuración estática de Label->Recommendation.

## H. Contrato API completo
El contrato crítico implementa en `GET /api/v1/recommendation`. Revise la carpeta de la API en el backend para detalles específicos.

## I. Seguridad
- Autenticación mediante **JWT** (Sesión de la UI).
- Autenticación por **API Key estática** segura almacenada en `.env` (o DB) requerida explícitamente por el Bot.
- CORS estricto. Limitado por `slowapi` sobre Redis (Ej: 10 req/s al `/recommendation`).

## J. Scheduler y jobs
Worker Celery corriendo de fondo encargado de ejecutar los Jobs retornados al invocar `POST /analyze`. 

## K. Testing
`pytest` para la capa analítica de los pandas y la creación del pipeline.

## L. Dockerización y despliegue
Imágenes separadas para `api`, `worker` y `frontend`.

## M/N/O/P. Estructura y Código
Scaffolding definido en el presente repositorio.
