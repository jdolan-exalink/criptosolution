# 🐧 Deployment Guide - Linux

## Estructura de Directorios Requerida

Para que el docker-compose.yml funcione correctamente en Linux, la estructura debe ser:

```
/root/CriptoSolution/
├── docker-compose.yml              # ← En la RAÍZ del proyecto
├── .env.example
├── .gitignore
├── README.md
│
├── ChatarrinHMM/                   # ← Carpeta con el proyecto HMM
│   ├── .env                        # ← Crear después de clonar
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── app/
│   │   └── requirements.txt
│   └── frontend/
│       ├── Dockerfile
│       └── src/
│
└── WandaNarabot/                   # ← Carpeta con el proyecto Bot
    ├── .env                        # ← Crear después de clonar
    ├── apps/
    │   ├── api/
    │   │   └── Dockerfile
    │   ├── trader/
    │   │   └── Dockerfile
    │   ├── worker/
    │   │   └── Dockerfile
    │   └── frontend/
    │       └── Dockerfile
    └── libs/
        └── common/
```

## ⚠️ Importante - Paths Relativos

El `docker-compose.yml` usa paths relativos desde la raíz:

```yaml
# CORRECTO ✅
services:
  hmm-api:
    build:
      context: ./ChatarrinHMM/backend    # Desde raíz
      dockerfile: Dockerfile
  
  wanda-api:
    build:
      context: ./WandaNarabot            # Desde raíz
      dockerfile: ./apps/api/Dockerfile
```

## 📋 Pasos de Instalación

### 1. Instalar Docker y Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version
```

### 2. Clonar/Copiar el Proyecto

```bash
# Opción A: Clonar desde GitHub
cd /root
git clone https://github.com/TU_USUARIO/criptosolution.git CriptoSolution
cd CriptoSolution

# Opción B: Copiar archivos
# Asegurarse de que la estructura sea exactamente como arriba
```

### 3. Configurar Variables de Entorno

```bash
cd /root/CriptoSolution

# Copiar template
cp .env.example .env

# Editar con tus keys
nano .env
```

**Contenido mínimo del `.env`:**

```env
# HMM
HMM_MODE=testnet

# WandaNarabot
BINANCE_ENV=testnet
BINANCE_MARKET_TYPE=spot
BINANCE_TESTNET_API_KEY=tu_api_key
BINANCE_TESTNET_API_SECRET=tu_api_secret

# Keys de producción (dejar vacío para testnet)
BINANCE_PROD_API_KEY=
BINANCE_PROD_API_SECRET=

# Seguridad
SECRET_KEY=cambia_esto_por_una_key_segura
HMM_API_KEY=changeme_bot_key
```

### 4. Crear .env en cada sub-proyecto

```bash
# ChatarrinHMM
cp .env ChatarrinHMM/.env

# WandaNarabot
cp .env WandaNarabot/.env
```

### 5. Verificar Estructura

```bash
# Verificar que existen los Dockerfiles
ls -la ChatarrinHMM/backend/Dockerfile
ls -la WandaNarabot/apps/api/Dockerfile
ls -la WandaNarabot/apps/trader/Dockerfile
ls -la WandaNarabot/apps/worker/Dockerfile
ls -la WandaNarabot/apps/frontend/Dockerfile

# Verificar docker-compose.yml
ls -la docker-compose.yml
```

### 6. Construir y Levantar

```bash
cd /root/CriptoSolution

# Build completo
docker-compose build

# Levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 7. Verificar Servicios

```bash
# Estado de contenedores
docker-compose ps

# Debería mostrar 10 servicios UP
```

## 🔧 Comandos Útiles

```bash
# Ver logs
docker-compose logs -f

# Ver logs de un servicio
docker-compose logs -f wanda-api

# Reiniciar servicio
docker-compose restart wanda-trader

# Detener todo
docker-compose down

# Limpiar y reiniciar (borra datos!)
docker-compose down -v
docker-compose up -d

# Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Ver uso de recursos
docker stats
```

## 🌐 Acceder a los Servicios

| Servicio | URL | Puerto |
|----------|-----|--------|
| WandaNarabot Frontend | http://tu-servidor:80 | 80 |
| WandaNarabot API | http://tu-servidor:8000 | 8000 |
| ChatarrinHMM Frontend | http://tu-servidor:9999 | 9999 |
| ChatarrinHMM API | http://tu-servidor:9998 | 9998 |

## 🔓 Configurar Firewall (si es necesario)

```bash
# Ubuntu UFW
sudo ufw allow 80/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 9998/tcp
sudo ufw allow 9999/tcp
sudo ufw enable
```

## ⚠️ Errores Comunes

### Error: `lstat /root/CriptoSolution/apps: no such file or directory`

**Causa:** El docker-compose.yml no está en la raíz del proyecto.

**Solución:**
```bash
# Mover docker-compose.yml a la raíz
cd /root
mv CriptoSolution/docker-compose.yml CriptoSolution/

# O verificar estructura
tree -L 2 /root/CriptoSolution/
```

### Error: `Cannot open '/app/.env'`

**Causa:** El archivo .env no existe en el contenedor.

**Solución:**
```bash
# Crear .env en cada sub-proyecto
cp /root/CriptoSolution/.env /root/CriptoSolution/ChatarrinHMM/.env
cp /root/CriptoSolution/.env /root/CriptoSolution/WandaNarabot/.env

# Reiniciar
docker-compose restart wanda-api
```

### Error: `port already in use`

**Causa:** Otro servicio está usando el puerto.

**Solución:**
```bash
# Ver qué usa el puerto
sudo netstat -tulpn | grep :80

# Cambiar puerto en docker-compose.yml
ports:
  - "8080:80"  # Usar 8080 en lugar de 80
```

### Error: `permission denied`

**Causa:** Docker necesita permisos de root.

**Solución:**
```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# O usar sudo
sudo docker-compose up -d
```

## 🔄 Actualizar Market Type (Spot ↔ Futures)

### Método 1: Desde la UI (Recomendado)

1. Abrir http://tu-servidor:80
2. Ir a Configuración
3. Cambiar `BINANCE_MARKET_TYPE`
4. Guardar
5. **Reiniciar servicios WandaNarabot:**
   ```bash
   docker-compose restart wanda-api wanda-trader wanda-worker
   ```

### Método 2: Editando .env

```bash
# Editar .env
nano /root/CriptoSolution/.env

# Cambiar
BINANCE_MARKET_TYPE=futures  # o spot

# Copiar a sub-proyectos
cp /root/CriptoSolution/.env /root/CriptoSolution/ChatarrinHMM/.env
cp /root/CriptoSolution/.env /root/CriptoSolution/WandaNarabot/.env

# Reiniciar TODO
docker-compose restart
```

## 📊 Monitoreo

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver uso de CPU/RAM
docker stats

# Ver contenedores corriendo
docker ps

# Ver volúmenes
docker volume ls
```

## 🛡️ Seguridad Production

1. **Cambiar SECRET_KEY** en `.env`
2. **Usar HTTPS** con reverse proxy (nginx/traefik)
3. **No exponer puertos de DB** (5432, 5433)
4. **Usar firewall** (ufw/iptables)
5. **Actualizar regularmente**
6. **Backup de volúmenes**

## 📞 Soporte

Si hay errores en Linux:

1. Verificar estructura de directorios
2. Verificar que .env existe en todos lados
3. Revisar logs: `docker-compose logs`
4. Rebuild completo: `docker-compose down && docker-compose build --no-cache && docker-compose up -d`
