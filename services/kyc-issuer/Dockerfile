FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# Install ALL deps (including @types/* for compilation)
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Production deps only (separate layer for smaller image)
RUN rm -rf node_modules && npm ci --omit=dev

# ── Production stage ──
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends libsqlite3-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN mkdir -p /app/data
COPY start.sh ./
RUN chmod +x start.sh
EXPOSE 3100
CMD ["./start.sh"]
