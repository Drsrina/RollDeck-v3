# ==============================================================================
# RollDeck V3 - Production Dockerfile (Multi-stage)
# High performance, secure, minimal footprint Node.js container
# ==============================================================================

# Stage 1: Build application assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies required for vite build)
COPY package.json package-lock.json* bun.lock* ./
RUN npm install

# Copy source code and build client bundle
COPY . .
RUN npm run build

# Stage 2: Lightweight Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for container healthchecks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies and tsx for execution
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --omit=dev && npm install -g tsx

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Run container as non-root user for security
USER node

CMD ["tsx", "server.ts"]
