ARG NODE_VERSION=22.22.0

FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /home/node/app

# Copy package files
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

# FINAL IMAGE
FROM node:${NODE_VERSION}-alpine

USER node
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
ENV NODE_ENV=production

# Copy prod dependencies
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts

# Copy built app
COPY --from=builder --chown=node:node /home/node/app/dist ./dist

# 🔍 DEBUG SCRIPT - ADDED!
COPY --chown=node:node debug-config.sh .
RUN chmod +x debug-config.sh

EXPOSE 8081

# 🚨 DEBUG MODE FIRST - Replace CMD temporarily
CMD ["./debug-config.sh"]
