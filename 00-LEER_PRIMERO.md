# 🎯 CriptoSolution - Plataforma Unificada de Trading

> **Documetación principal:** [README.md](README.md)  
> **Inicio rápido:** [QUICKSTART.md](QUICKSTART.md)  
> **Configuración:** [CONFIGURACION_RESUMEN.md](CONFIGURACION_RESUMEN.md)

---

## ⚡ ¿Qué es esto?

Sistema unificado que combina:
- **ChatarrinHMM**: Analizador de mercado con Hidden Markov Models
- **WandaNarabot**: Bot de trading automático

Ambos proyectos funcionan juntos en un solo Docker Compose.

---

## 🚀 Inicio Rápido (30 segundos)

### 1. Iniciar el sistema

```bash
# Opción A: Script interactivo (Recomendado)
.\start.bat

# Opción B: Comando directo
docker-compose up -d
```

### 2. Acceder

| Servicio | URL |
|----------|-----|
| **WandaNarabot** | http://localhost:80 |
| **ChatarrinHMM** | http://localhost:9999 |

### 3. ¡Listo! ✅

El sistema está:
- ✅ Corriendo en **testnet** (sin riesgo)
- ✅ Con keys pre-configuradas
- ✅ Analizando el mercado
- ✅ Listo para operar en spot

---

## 📁 Archivos Principales

```
d:\DEVs\CriptoSolution\
│
├── 00-LEER_PRIMERO.md       # ⭐ ESTE ARCHIVO
├── README.md                  # Documentación completa
├── QUICKSTART.md              # Guía de inicio rápido
├── CONFIGURACION_RESUMEN.md   # Configuración detallada
├── start.bat                  # Script de inicio
├── docker-compose.yml         # Orquestador principal
│
├── ChatarrinHMM\              # Proyecto HMM
│   └── .env                   # Config HMM
│
└── WandaNarabot\              # Proyecto Bot
    └── .env                   # Config Bot
```

---

## 🎯 Estado Actual

### ✅ Listo para usar (Testnet Spot)

| Ítem | Estado |
|------|--------|
| Keys de Binance Testnet | ✅ Configuradas |
| Modo Spot | ✅ Activado |
| Docker Compose | ✅ Unificado |
| Redes | ✅ Conectadas |
| Variables de entorno | ✅ Configuradas |

### ⚠️ Para Production (Faltan keys)

| Ítem | Estado |
|------|--------|
| Keys de Binance Production | ❌ Faltan |
| Modo Production | ❌ Desactivado |
| Seguridad (SECRET_KEY) | ⚠️ Usar defaults |

**Ver guía completa:** [CONFIGURACION_RESUMEN.md](CONFIGURACION_RESUMEN.md#-lo-que-falta-para-production-spot-real)

---

## 🔧 Comandos Esenciales

```bash
# Iniciar todo
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener todo
docker-compose down

# Reiniciar un servicio
docker-compose restart wanda-api

# Ver estado
docker-compose ps

# Rebuild completo
docker-compose down -v && docker-compose up --build
```

---

## 📊 Servicios Activos

### ChatarrinHMM (Analizador)
| Servicio | Puerto | URL |
|----------|--------|-----|
| Frontend | 9999 | http://localhost:9999 |
| API | 9998 | http://localhost:9998/api/v1 |
| DB | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

### WandaNarabot (Bot)
| Servicio | Puerto | URL |
|----------|--------|-----|
| Frontend | 80 | http://localhost:80 |
| API | 8000 | http://localhost:8000 |
| DB | 5433 | localhost:5433 |
| Redis | 6380 | localhost:6380 |

---

## 🔐 Keys Actuales (Testnet)

```
API Key:    ZIBJjdGa3EfbP9ig3T81n8YhQzawMUdlVDNLDaIC1hORJ6yvZnAMR2yaAWezseoe
API Secret: gkUqAWsMBXsGAhONT0NmBVmzkAXTwCYdR1dmgNvmCi2JfFTKmXIZlhNR95uOae3H
```

**Válido para:** https://testnet.binance.vision

---

## ⚠️ Importante

1. **Testnet vs Production**: El sistema está en **testnet** por defecto (sin dinero real)
2. **Keys de Production**: Para usar en real, obtener keys en Binance y actualizar `.env`
3. **Seguridad**: Nunca commitear archivos `.env` con keys reales
4. **Backups**: Los datos están en volúmenes Docker persistentes

---

## 🆘 Soporte

### Problemas comunes

| Problema | Solución |
|----------|----------|
| Puerto ya en uso | Cambiar puerto en `docker-compose.yml` |
| No conecta a la API | Esperar 10-15 segundos a que inicien los servicios |
| Error de base de datos | Verificar que los contenedores DB estén `Up` |
| No carga el frontend | Limpiar caché del navegador |

### Ver logs

```bash
# Todos los logs
docker-compose logs -f

# Servicio específico
docker-compose logs wanda-api
docker-compose logs hmm-api
```

### Documentación adicional

- **README.md**: Documentación completa del sistema
- **QUICKSTART.md**: Guía paso a paso de inicio
- **CONFIGURACION_RESUMEN.md**: Detalle de configuración
- **ChatarrinHMM/README.md**: Docs específicas del HMM

---

## 📝 Checklist para Production

Antes de usar en production:

- [ ] Obtener API Keys en Binance (https://www.binance.com)
- [ ] Actualizar `BINANCE_PROD_API_KEY` en ambos `.env`
- [ ] Cambiar `MODE=production` en ChatarrinHMM
- [ ] Cambiar `BINANCE_ENV=prod` en WandaNarabot
- [ ] Generar nuevas `SECRET_KEY` seguras
- [ ] Actualizar `API_KEY_BOT` y `HMM_API_KEY`
- [ ] Reiniciar servicios
- [ ] Verificar conexión
- [ ] Monitorear primeros trades

**Guía completa:** [CONFIGURACION_RESUMEN.md](CONFIGURACION_RESUMEN.md#-lo-que-falta-para-production-spot-real)

---

## 🎉 ¡Listo!

El sistema está configurado para **testnet spot**. Para empezar a operar:

1. Abrir http://localhost:80 (WandaNarabot)
2. Configurar estrategias desde la UI
3. Monitorear en http://localhost:9999 (ChatarrinHMM)
4. Ver logs: `docker-compose logs -f`

**¡Happy Trading! 📈**
