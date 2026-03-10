FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Exponer el puerto de Vite por defecto (5173)
EXPOSE 5173

# Correr el server de Vite indicando que escuche en 0.0.0.0 para que Docker pueda rutearlo
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
