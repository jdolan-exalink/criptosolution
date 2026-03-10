# 📋 Configuración del Sistema Unificado

## ✅ Lo que ya está configurado (Plug & Play Testnet)

### Keys de Binance Spot Testnet
Ambos proyectos usan las mismas keys de testnet pre-configuradas:

```
API Key:    ZIBJjdGa3EfbP9ig3T81n8YhQzawMUdlVDNLDaIC1hORJ6yvZnAMR2yaAWezseoe
API Secret: gkUqAWsMBXsGAhONT0NmBVmzkAXTwCYdR1dmgNvmCi2JfFTKmXIZlhNR95uOae3H
```

**Válido para:** https://testnet.binance.vision (Spot Testnet)

### Archivos `.env` creados

#### 1. `ChatarrinHMM/.env`
```env
MODE=testnet
BINANCE_API_KEY=ZIBJjdGa3EfbP9ig3T81n8YhQzawMUdlVDNLDaIC1hORJ6yvZnAMR2yaAWezseoe
BINANCE_API_SECRET=gkUqAWsMBXsGAhONT0NmBVmzkAXTwCYdR1dmgNvmCi2JfFTKmXIZlhNR95uOae3H
SECRET_KEY=super_secret_key_change_in_production
API_KEY_BOT=changeme_bot_key
```

#### 2. `WandaNarabot/.env`
```env
BINANCE_ENV=testnet
BINANCE_MARKET_TYPE=spot
BINANCE_TESTNET_API_KEY=ZIBJjdGa3EfbP9ig3T81n8YhQzawMUdlVDNLDaIC1hORJ6yvZnAMR2yaAWezseoe
BINANCE_TESTNET_API_SECRET=gkUqAWsMBXsGAhONT0NmBVmzkAXTwCYdR1dmgNvmCi2JfFTKmXIZlhNR95uOae3H
HMM_API_URL=http://hmm-api:8000/api/v1
HMM_API_KEY=changeme_bot_key
```

### Docker Compose Unificado

El archivo `docker-compose.yml` en la raíz:
- ✅ 10 servicios orquestados
- ✅ 2 redes Docker interconectadas
- ✅ Volúmenes persistentes
- ✅ Variables de entorno mapeadas
- ✅ Dependencies configuradas

### Servicios que se levantan

**ChatarrinHMM (5 servicios):**
- `hmm-api` - API REST (puerto 9998)
- `hmm-worker` - Celery worker
- `hmm-frontend` - UI React (puerto 9999)
- `hmm-db` - PostgreSQL (puerto 5432)
- `hmm-redis` - Redis (puerto 6379)

**WandaNarabot (5 servicios):**
- `wanda-api` - API REST (puerto 8000)
- `wanda-trader` - Bot de trading
- `wanda-worker` - Worker tasks
- `wanda-frontend` - UI (puerto 80)
- `wanda-db` - PostgreSQL (puerto 5433)
- `wanda-redis` - Redis (puerto 6380)

### Conexión entre proyectos

WandaNarabot se conecta a ChatarrinHMM mediante:
```
http://hmm-api:8000/api/v1
```

Esta es una ruta interna de Docker que no requiere exposición de puertos adicionales.

---

## 🔑 Lo que FALTA para Production (Spot Real)

### 1. API Keys de Binance Production

**Obtener en:** https://www.binance.com → Profile → API Management

#### Pasos:
1. Iniciar sesión en Binance
2. Ir a API Management
3. Crear nueva API Key
4. Habilitar **Spot Trading**
5. Copiar Key y Secret

#### Actualizar archivos:

**`ChatarrinHMM/.env`:**
```env
# Cambiar esto:
MODE=production
BINANCE_API_KEY=TU_KEY_PRODUCTION
BINANCE_API_SECRET=TU_SECRET_PRODUCTION
```

**`WandaNarabot/.env`:**
```env
# Cambiar esto:
BINANCE_ENV=prod
BINANCE_PROD_API_KEY=TU_KEY_PRODUCTION
BINANCE_PROD_API_SECRET=TU_SECRET_PRODUCTION
```

### 2. Seguridad - Keys Personalizadas

**Importante:** Generar nuevas keys seguras

**`ChatarrinHMM/.env`:**
```env
# Generar una nueva key segura
SECRET_KEY=tu_nueva_secret_key_generada_con_openssl
API_KEY_BOT=tu_nueva_api_key_para_el_bot
```

**`WandaNarabot/.env`:**
```env
# Generar una nueva key segura
SECRET_KEY=tu_nueva_secret_key
HMM_API_KEY=tu_nueva_key_para_conectar_con_hmm
```

**Para generar keys seguras:**
```bash
# OpenSSL
openssl rand -hex 32

# O usar Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Opcional: Configurar Telegram

Para recibir notificaciones de trades:

**`WandaNarabot/.env`:**
```env
TELEGRAM_BOT_TOKEN=tu_bot_token
TELEGRAM_CHAT_ID=tu_chat_id
```

---

## 📁 Estructura de Archivos

```
d:\DEVs\CriptoSolution\
│
├── docker-compose.yml          # ⭐ Orquestador principal
├── README.md                    # Documentación completa
├── QUICKSTART.md                # Guía rápida de inicio
├── CONFIGURACION_RESUMEN.md     # Este archivo
├── start.bat                    # Script de inicio para Windows
│
├── ChatarrinHMM\
│   ├── .env                     # ⭐ Config de ChatarrinHMM
│   ├── .env.example
│   ├── docker-compose.yml       # (ya no se usa, está unificado)
│   ├── README.md
│   ├── backend\
│   │   ├── Dockerfile
│   │   ├── app\
│   │   └── requirements.txt
│   └── frontend\
│       ├── Dockerfile
│       └── ...
│
└── WandaNarabot\
    ├── .env                     # ⭐ Config de WandaNarabot
    ├── docker-compose.yml       # (ya no se usa, está unificado)
    ├── apps\
    │   ├── api\
    │   │   └── Dockerfile
    │   ├── trader\
    │   │   └── Dockerfile
    │   ├── worker\
    │   │   └── Dockerfile
    │   └── frontend\
    │       └── Dockerfile
    └── libs\
        └── common\
            └── config.py
```

---

## 🎯 Checklist de Verificación

### Para Testnet (Ya está listo ✅)

- [x] Keys de testnet en ambos `.env`
- [x] `MODE=testnet` en ChatarrinHMM
- [x] `BINANCE_ENV=testnet` en WandaNarabot
- [x] `BINANCE_MARKET_TYPE=spot` en ambos
- [x] `HMM_API_URL` configurado correctamente
- [x] Docker Compose unificado
- [x] Redes Docker configuradas

### Para Production (Falta ⚠️)

- [ ] Obtener API Keys de Binance Production
- [ ] Actualizar `BINANCE_PROD_API_KEY` en ambos `.env`
- [ ] Cambiar `MODE=production` en ChatarrinHMM
- [ ] Cambiar `BINANCE_ENV=prod` en WandaNarabot
- [ ] Generar nuevas `SECRET_KEY` en ambos proyectos
- [ ] Actualizar `API_KEY_BOT` y `HMM_API_KEY`
- [ ] (Opcional) Configurar Telegram
- [ ] Reiniciar servicios con `docker-compose restart`
- [ ] Verificar logs: `docker-compose logs -f`
- [ ] Monitorear primeros trades

---

## 🚀 Comandos para iniciar

### Testnet (Listo para usar)

```bash
cd d:\DEVs\CriptoSolution

# Opción 1: Usando el script
.\start.bat

# Opción 2: Manual
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

### Production (Después de configurar keys)

```bash
cd d:\DEVs\CriptoSolution

# Editar archivos .env primero
# Luego reiniciar
docker-compose restart

# O reconstruir si hay cambios en Dockerfile
docker-compose up -d --build
```

---

## 🔍 Verificación del Sistema

### 1. Verificar que los contenedores estén corriendo

```bash
docker-compose ps
```

Debe mostrar 10 servicios con estado "Up"

### 2. Verificar conexión entre servicios

```bash
# Logs de WandaNarabot API
docker-compose logs wanda-api

# Logs de ChatarrinHMM API
docker-compose logs hmm-api

# Buscar errores de conexión
docker-compose logs | findstr "error"
```

### 3. Acceder a las APIs

```bash
# WandaNarabot API
curl http://localhost:8000

# ChatarrinHMM API
curl http://localhost:9998/api/v1
```

### 4. Verificar bases de datos

```bash
# PostgreSQL HMM
docker-compose exec hmm-db psql -U postgres -d hmm_db

# PostgreSQL Wanda
docker-compose exec wanda-db psql -U wanda -d wandanarabot
```

---

## 📞 Soporte y Documentación

- **Documentación Principal:** `README.md`
- **Guía Rápida:** `QUICKSTART.md`
- **ChatarrinHMM:** `ChatarrinHMM/README.md`
- **WandaNarabot:** `WandaNarabot/docs/` (si existe)

---

## ⚠️ Importante

1. **Nunca commitear archivos `.env`** con keys de production
2. **Backup de volúmenes:** Los datos están en volúmenes Docker
3. **Actualizaciones:** Hacer `docker-compose pull` para actualizar imágenes
4. **Monitoreo:** Revisar logs regularmente con `docker-compose logs -f`
