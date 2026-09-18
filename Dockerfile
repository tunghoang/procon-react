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
# Defaults are the SAME-ORIGIN paths nginx.conf proxies (team-manager under
# /manager, game service under /api) -- not a previous contest year's host.
# A stale absolute default is worse than an empty one: the built bundle talked
# to procon25.haiuet.me and looked "up" while every call 404'd/CORS-failed.
ARG VITE_SERVICE_API=/manager/api
ENV VITE_SERVICE_API=$VITE_SERVICE_API
ARG VITE_GAME_SERVICE_API=/api
ENV VITE_GAME_SERVICE_API=$VITE_GAME_SERVICE_API
# Verbose client logging (src/utils/debug.js). Empty = off; declared here so a
# compose build.arg can actually reach the build, since an arg without a
# matching ARG is silently dropped.
ARG VITE_DEBUG=
ENV VITE_DEBUG=$VITE_DEBUG

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
