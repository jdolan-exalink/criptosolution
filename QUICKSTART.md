# 🚀 QuickStart - CriptoSolution

## Inicio Rápido (2 minutos)

### 1️⃣ Iniciar el sistema

**Opción A - Usando el script (Recomendado):**
```bash
d:\DEVs\CriptoSolution\start.bat
# Seleccionar opción 1 o 2
```

**Opción B - Manual:**
```bash
cd d:\DEVs\CriptoSolution
docker-compose up -d
```

### 2️⃣ Acceder a las interfaces

| Servicio | URL | Usuario/Password |
|----------|-----|------------------|
| **WandaNarabot** | http://localhost:80 | Ver docs del proyecto |
| **ChatarrinHMM** | http://localhost:9999 | Ver docs del proyecto |

### 3️⃣ ¡Listo!

El sistema está:
- ✅ Conectado a **Binance Spot Testnet**
- ✅ Keys pre-configuradas
- ✅ HMM analizando el mercado cada 60 segundos
- ✅ Trader monitoreando recomendaciones

---

## 🔑 Keys Actuales (Testnet)

El sistema ya incluye estas keys de testnet:

```
API Key: ZIBJjdGa3EfbP9ig3T81n8YhQzawMUdlVDNLDaIC1hORJ6yvZnAMR2yaAWezseoe
Secret:  gkUqAWsMBXsGAhONT0NmBVmzkAXTwCYdR1dmgNvmCi2JfFTKmXIZlhNR95uOae3H
```

**Origen:** https://testnet.binance.vision

---

## ⚠️ Para usar en PRODUCTION (Spot Real)

### Faltan las siguientes keys:

#### 1. Binance Production API Keys
Obtener en: https://www.binance.com → API Management

**En `ChatarrinHMM/.env`:**
```env
MODE=production
BINANCE_API_KEY=TU_PRODUCTION_KEY_AQUI
BINANCE_API_SECRET=TU_PRODUCTION_SECRET_AQUI
```

**En `WandaNarabot/.env`:**
```env
BINANCE_ENV=prod
BINANCE_PROD_API_KEY=TU_PRODUCTION_KEY_AQUI
BINANCE_PROD_API_SECRET=TU_PRODUCTION_SECRET_AQUI
```

#### 2. Actualizar seguridad

**En `ChatarrinHMM/.env`:**
```env
SECRET_KEY=generar_nueva_key_segura
API_KEY_BOT=nueva_key_para_el_bot
```

**En `WandaNarabot/.env`:**
```env
SECRET_KEY=nueva_key_segura
HMM_API_KEY=nueva_key_para_conectar_con_hmm
```

#### 3. Reiniciar servicios
```bash
docker-compose restart
```

---

## 📊 Puertos del Sistema

| Puerto | Servicio | Acceso |
|--------|----------|--------|
| 80 | WandaNarabot Frontend | http://localhost:80 |
| 8000 | WandaNarabot API | http://localhost:8000 |
| 9999 | ChatarrinHMM Frontend | http://localhost:9999 |
| 9998 | ChatarrinHMM API | http://localhost:9998 |
| 5432 | PostgreSQL HMM | localhost:5432 |
| 5433 | PostgreSQL Wanda | localhost:5433 |
| 6379 | Redis HMM | localhost:6379 |
| 6380 | Redis Wanda | localhost:6380 |

---

## 🛠️ Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f wanda-api

# Detener todo
docker-compose down

# Reiniciar desde cero (borra datos)
docker-compose down -v && docker-compose up --build

# Ver estado de contenedores
docker-compose ps
```

---

## 🎯 Configuración Actual

| Parámetro | Valor |
|-----------|-------|
| **Ambiente** | Testnet |
| **Mercado** | Spot |
| **Leverage** | 1x |
| **Allocación por trade** | 1% |
| **Refresh HMM** | 60 segundos |
| **Máx trades simultáneos** | 20 |
| **Máx exposición margen** | 80% |
| **Take Profit portfolio** | 2% |

---

## 📝 Checklist para Production

- [ ] Obtener API Keys de Binance Production
- [ ] Actualizar `BINANCE_PROD_API_KEY` en ambos `.env`
- [ ] Cambiar `MODE=production` en ChatarrinHMM
- [ ] Cambiar `BINANCE_ENV=prod` en WandaNarabot
- [ ] Generar nuevas `SECRET_KEY`
- [ ] Actualizar `API_KEY_BOT` y `HMM_API_KEY`
- [ ] Reiniciar servicios
- [ ] Verificar conexión con Binance
- [ ] Monitorear primeros trades
- [ ] Configurar Telegram (opcional)

---

## 🆘 Soporte

- **Documentación completa:** `README.md`
- **ChatarrinHMM:** `ChatarrinHMM/README.md`
- **Logs:** `docker-compose logs -f`
