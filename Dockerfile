# Multi-stage build for optimized image size

# Stage 1: Build dependencies
FROM node:25-alpine AS builder

# Use domestic mirrors to speed up package installation in CN deployments.
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    npm config set registry https://registry.npmmirror.com

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ py3-setuptools

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Stage 2: Production image
FROM node:25-alpine

# Use the same mirrors in the runtime image for any future package operations.
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    npm config set registry https://registry.npmmirror.com

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install curl before copying files
RUN apk add --no-cache curl

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application files
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD if [ "$SSL_ENABLED" = "true" ] || [ "$SSL_ENABLED" = "1" ]; then curl -kf https://localhost:3000/api/health || exit 1; else curl -f http://localhost:3000/api/health || exit 1; fi

# Start application
CMD ["npm", "start"]
