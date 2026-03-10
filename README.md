# CriptoSolution - Automated Trading Platform with HMM Analysis

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-compose-latest-blue.svg)](https://docs.docker.com/compose/)

Plataforma unificada de trading automático de criptomonedas que integra análisis de mercados con **Hidden Markov Models (HMM)** y ejecución de trades en **Binance Spot**.

## 🚀 Características

- **Análisis HMM**: Detección de regímenes de mercado usando Modelos Ocultos de Markov
- **Trading Automático**: Ejecución de trades basados en señales del HMM
- **Multi-servicio**: Arquitectura basada en microservicios Docker
- **Testnet Ready**: Configurado para Binance Spot Testnet
- **Dashboard Web**: Interfaces modernas para monitoreo y control
- **Base de Datos**: PostgreSQL para persistencia de datos
- **Redis**: Caché y colas para tareas asíncronas

## 📋 Requisitos

- Docker Desktop (Windows/Mac) o Docker + Docker Compose (Linux)
- Python 3.11+ (solo para desarrollo)
- Cuenta en [Binance Testnet](https://testnet.binance.vision)

## 🎯 Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/criptosolution.git
cd criptosolution
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus keys de Binance:

```env
# Binance Spot Testnet
BINANCE_ENV=testnet
BINANCE_MARKET_TYPE=spot
BINANCE_TESTNET_API_KEY=tu_api_key
BINANCE_TESTNET_API_SECRET=tu_api_secret
```

### 3. Iniciar servicios

```bash
docker-compose up -d
```

### 4. Acceder a las interfaces

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **WandaNarabot** | http://localhost:80 | UI principal del bot |
| **ChatarrinHMM** | http://localhost:9999 | Dashboard de análisis HMM |
| **WandaNarabot API** | http://localhost:8000 | API REST del bot |
| **ChatarrinHMM API** | http://localhost:9998 | API REST del HMM |

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     WandaNarabot Network                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │ Frontend │  │   API    │  │ Trader   │  │    Worker    ││
│  │  Port 80 │  │ Port 8000│  │          │  │              ││
│  └──────────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘│
│                     │             │                │        │
│               ┌─────┴─────────────┴────────────────┴────┐   │
│               │         Shared Network Bridge            │   │
│               └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ http://hmm-api:8000/api/v1
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     ChatarrinHMM Network                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │ Frontend │  │   API    │  │  Worker  │  │  PostgreSQL  ││
│  │Port 9999 │  │Port 9998 │  │          │  │    Redis     ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 📦 Servicios

### ChatarrinHMM (Analizador de Mercado)

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `hmm-api` | 9998 | API REST FastAPI |
| `hmm-frontend` | 9999 | Dashboard React |
| `hmm-worker` | - | Celery worker |
| `hmm-db` | 5432 | PostgreSQL |
| `hmm-redis` | 6379 | Redis |

### WandaNarabot (Bot de Trading)

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `wanda-api` | 8000 | API REST FastAPI |
| `wanda-frontend` | 80 | Dashboard React |
| `wanda-trader` | - | Trader principal |
| `wanda-worker` | - | Celery worker |
| `wanda-db` | 5433 | PostgreSQL |
| `wanda-redis` | 6380 | Redis |

## 🔧 Comandos Útiles

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f wanda-api

# Detener todos los servicios
docker-compose down

# Reiniciar desde cero (borra datos)
docker-compose down -v && docker-compose up -d

# Ver estado de contenedores
docker-compose ps

# Rebuild completo
docker-compose up -d --build
```

## 🔐 Configuración para Production

### 1. Obtener API Keys de Binance

1. Ir a [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Crear nueva API Key
3. Habilitar **Spot Trading**
4. Copiar Key y Secret

### 2. Actualizar `.env`

```env
# Production
BINANCE_ENV=prod
BINANCE_MARKET_TYPE=spot
BINANCE_PROD_API_KEY=tu_production_key
BINANCE_PROD_API_SECRET=tu_production_secret

# Seguridad
SECRET_KEY=tu_secret_key_segura_generada
HMM_API_KEY=tu_api_key_para_el_bot
```

### 3. Generar keys seguras

```bash
# OpenSSL
openssl rand -hex 32

# Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Reiniciar servicios

```bash
docker-compose restart
```

## 📊 Endpoints API

### WandaNarabot API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/v1/status` | GET | Estado del bot |
| `/api/v1/balance/details` | GET | Balance detallado |
| `/api/v1/positions` | GET | Posiciones activas |
| `/api/v1/trades` | GET | Historial de trades |
| `/api/v1/sessions` | GET | Sesiones de trading |
| `/api/v1/equity` | GET | Curva de equity |
| `/api/v1/hmm/regime?symbol=X` | GET | Régimen HMM por símbolo |
| `/api/v1/bot/start` | POST | Iniciar bot |
| `/api/v1/bot/stop` | POST | Detener bot |

### ChatarrinHMM API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/v1/recommendation?symbol=X` | GET | Recomendación HMM |
| `/api/v1/analyze` | POST | Iniciar análisis |
| `/docs` | GET | Swagger docs |

## 🛠️ Desarrollo

### Estructura del proyecto

```
criptosolution/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── ChatarrinHMM/
│   ├── .env
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── app/
│   │   └── requirements.txt
│   └── frontend/
│       ├── Dockerfile
│       └── src/
└── WandaNarabot/
    ├── .env
    ├── apps/
    │   ├── api/
    │   ├── trader/
    │   ├── worker/
    │   └── frontend/
    └── libs/
        └── common/
```

### Correr localmente (sin Docker)

```bash
# ChatarrinHMM Backend
cd ChatarrinHMM/backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# WandaNarabot API
cd WandaNarabot
pip install -r requirements.txt
uvicorn apps.api.main:app --reload
```

## ⚠️ Advertencias

1. **Testnet primero**: Probá siempre en testnet antes de usar en production
2. **Keys seguras**: Nunca commitear archivos `.env` con keys reales
3. **Riesgo financiero**: El trading de criptomonedas es riesgoso
4. **Sin garantía**: Este software se provee "AS IS", sin garantías

## 📝 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/TU_USUARIO/criptosolution/issues)
- **Discusión**: [GitHub Discussions](https://github.com/TU_USUARIO/criptosolution/discussions)

## 🔗 Enlaces útiles

- [Binance Testnet Spot](https://testnet.binance.vision)
- [Binance API Docs](https://binance-docs.github.io/apidocs/)
- [HMM Learn Documentation](https://hmmlearn.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)

---

**Hecho con ❤️ para la comunidad crypto**
