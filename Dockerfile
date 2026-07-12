# Build stage
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Retried: npm's own "Exit handler never called!" bug intermittently kills
# `npm install` under CPU/network contention (common on shared build hosts).
RUN npm install --legacy-peer-deps \
    || (sleep 5 && npm install --legacy-peer-deps) \
    || (sleep 15 && npm install --legacy-peer-deps)

# Copy source files
COPY . .

# Build arguments for API URLs -- Docker silently drops any docker-compose
# build.args entry that isn't declared with ARG here, baking in Vite's ""
# fallback instead (see api/gameService.js's getEnv default).
ARG VITE_SERVICE_API=https://procon25.haiuet.me
ENV VITE_SERVICE_API=$VITE_SERVICE_API
ARG VITE_GAME_SERVICE_API=http://127.0.0.1:8001/api
ENV VITE_GAME_SERVICE_API=$VITE_GAME_SERVICE_API

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
