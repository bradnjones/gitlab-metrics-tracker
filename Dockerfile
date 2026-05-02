# Stage 1: Build the Vite frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/server ./src/server
COPY src/lib ./src/lib
COPY --from=builder /app/dist ./dist

# Seed default data files; these are overridden by the named volume on first run
COPY src/data/annotations.json ./src/data/annotations.json
COPY src/data/metrics.json ./src/data/metrics.json

EXPOSE 3000
CMD ["node", "src/server/app.js"]
