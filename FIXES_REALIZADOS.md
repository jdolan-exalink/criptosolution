# 🔧 Fixes Realizados

## 1. Error en Linux - `lstat /root/CriptoSolution/apps: no such file or directory`

### Problema
El docker-compose.yml tenía paths relativos incorrectos que no funcionaban en Linux.

### Solución
Se corrigieron los paths en `docker-compose.yml`:

**Antes:**
```yaml
wanda-api:
  build:
    context: ./WandaNarabot
    dockerfile: apps/api/Dockerfile  # ❌ Sin ./
```

**Después:**
```yaml
wanda-api:
  build:
    context: ./WandaNarabot
    dockerfile: ./apps/api/Dockerfile  # ✅ Con ./
```

### Archivos Modificados
- `docker-compose.yml` - Todos los paths de Dockerfile ahora usan `./`

### Estructura Requerida en Linux
```
/root/CriptoSolution/
├── docker-compose.yml          # ← En la RAÍZ
├── ChatarrinHMM/
│   └── backend/
│       └── Dockerfile
└── WandaNarabot/
    └── apps/
        ├── api/
        │   └── Dockerfile
        ├── trader/
        │   └── Dockerfile
        └── frontend/
            └── Dockerfile
```

---

## 2. Error al Guardar Market Type Futures - Nginx Error

### Problema
Al cambiar `BINANCE_MARKET_TYPE` de spot a futures:
1. El cambio no se guardaba correctamente
2. El endpoint `/api/v1/config` escribía en una ruta incorrecta
3. El contenedor no leía el `.env` actualizado

### Solución

#### A. Fix en el endpoint `/api/v1/config`

**Archivo:** `WandaNarabot/apps/api/main.py`

**Cambios:**
1. Ahora escribe en `/app/.env` (ruta absoluta del contenedor)
2. Agrega fallback a `.env` relativo
3. Loguea el éxito/error de la escritura
4. Retorna mensaje indicando que hay que reiniciar el trader

**Código nuevo:**
```python
@app.post("/api/v1/config")
async def update_config(config: BotConfig):
    env_file_path = "/app/.env"  # ✅ Ruta absoluta en el contenedor
    try:
        with open(env_file_path, "w") as f:
            for k, v in env_vars.items():
                f.write(f"{k}={v}\n")
        logger.info(f"Config saved to {env_file_path}")
    except Exception as e:
        logger.error(f"Failed to save .env: {e}")
        # Fallback...
    
    # Actualizar settings en memoria
    settings.BINANCE_MARKET_TYPE = config.BINANCE_MARKET_TYPE
    
    return {
        "status": "updated", 
        "message": "Config saved. Restart trader service for changes to take full effect."
    }
```

#### B. Reinicio necesario después de cambiar config

Después de cambiar el market type, hay que reiniciar los servicios de WandaNarabot:

```bash
docker-compose restart wanda-api wanda-trader wanda-worker
```

### Cómo Cambiar Market Type Correctamente

#### Método 1: Desde la UI
1. Abrir http://localhost:80
2. Ir a Configuración
3. Cambiar `BINANCE_MARKET_TYPE` a `futures` o `spot`
4. Click en Guardar
5. **Reiniciar servicios:**
   ```bash
   docker-compose restart wanda-api wanda-trader wanda-worker
   ```

#### Método 2: Editando .env
1. Editar `.env`:
   ```bash
   nano .env
   ```
2. Cambiar:
   ```env
   BINANCE_MARKET_TYPE=futures
   ```
3. Copiar a sub-proyectos:
   ```bash
   cp .env ChatarrinHMM/.env
   cp .env WandaNarabot/.env
   ```
4. Reiniciar TODO:
   ```bash
   docker-compose restart
   ```

---

## 3. Documentación para Linux

### Archivo Creado: `DEPLOYMENT_LINUX.md`

Incluye:
- ✅ Estructura de directorios requerida
- ✅ Pasos de instalación paso a paso
- ✅ Comandos útiles
- ✅ Errores comunes y soluciones
- ✅ Configuración de firewall
- ✅ Monitoreo

---

## 📋 Resumen de Cambios

| Archivo | Cambio | Motivo |
|---------|--------|--------|
| `docker-compose.yml` | Paths con `./` | Fix error Linux |
| `WandaNarabot/apps/api/main.py` | Ruta absoluta `/app/.env` | Fix guardado config |
| `DEPLOYMENT_LINUX.md` | Nuevo archivo | Guía deployment |
| `FIXES_REALIZADOS.md` | Nuevo archivo | Documentación fixes |

---

## ✅ Testing

### En Windows (Local)
```bash
cd d:\DEVs\CriptoSolution
docker-compose restart wanda-api
# Probar cambio de config desde UI
```

### En Linux (Production)
```bash
cd /root/CriptoSolution

# Build completo
docker-compose build

# Levantar
docker-compose up -d

# Verificar
docker-compose ps
```

---

## 🚀 Próximos Pasos

1. **Probar en Linux** - Seguir `DEPLOYMENT_LINUX.md`
2. **Probar cambio a Futures** - Desde UI y reiniciar
3. **Subir a GitHub** - Con toda la documentación

---

## ⚠️ Importante

- **Siempre reiniciar** después de cambiar `BINANCE_MARKET_TYPE`
- **Verificar estructura** de directorios en Linux
- **Paths relativos** deben ser desde la raíz del proyecto
- **Nunca commitear** `.env` con keys reales
