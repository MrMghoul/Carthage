FROM node:18-alpine

WORKDIR /app

# Copier et installer les dépendances du backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Copier le code source
COPY backend/tsconfig.json ./
COPY backend/src ./src

# Build TypeScript
RUN npm run build

# Exposer le port
EXPOSE 3000

# Désactiver IPv6 et forcer IPv4
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Démarrer
CMD ["npm", "start"]
CMD ["npm", "start"]
