# Build Stage - Node 24 Alpine
FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY apps/uplox/package.json ./apps/uplox/

# Install dependencies (including dev dependencies for build)
RUN pnpm install -r --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/uplox/ ./apps/uplox/

# Build the application
RUN pnpm run build

# Production dependencies stage
FROM node:24-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/uplox/package.json ./apps/uplox/

# Install only production dependencies and clean cache
RUN pnpm install --prod --frozen-lockfile \
    && pnpm store prune \
    && rm -rf ~/.pnpm-store \
    && rm -rf /tmp/* \
    && rm -rf /var/cache/apk/*

# Production Stage - Conditionally include ClamAV
FROM node:24-alpine AS production

# Build argument to control ClamAV inclusion
ARG INCLUDE_CLAMAV=false

# Install base system dependencies
RUN apk add --no-cache --virtual .build-deps \
        curl \
        wget \
    && apk add --no-cache \
        tini \
    && if [ "$INCLUDE_CLAMAV" = "true" ]; then \
        apk add --no-cache \
            clamav \
            clamav-daemon \
            freshclam \
            dumb-init; \
    fi \
    && apk del .build-deps \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Create app user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Configure ClamAV directories and permissions (only if ClamAV is included)
RUN if [ "$INCLUDE_CLAMAV" = "true" ]; then \
        mkdir -p /var/log/clamav /var/lib/clamav /var/run/clamav \
        && chown -R clamav:clamav /var/log/clamav /var/lib/clamav /var/run/clamav \
        && chmod 755 /var/lib/clamav; \
    fi

# Set working directory
WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=deps --chown=appuser:appgroup /app/apps/uplox/node_modules ./apps/uplox/node_modules

# Copy built application from build stage
COPY --from=builder --chown=appuser:appgroup /app/apps/uplox/dist ./apps/uplox/dist

# Copy package.json files needed for runtime
COPY --chown=appuser:appgroup package.json ./
COPY --chown=appuser:appgroup apps/uplox/package.json ./apps/uplox/

# Update ClamAV database (only if ClamAV is included)
RUN if [ "$INCLUDE_CLAMAV" = "true" ]; then \
        freshclam --config-file=/etc/clamav/freshclam.conf || true; \
    fi

# Check ClamAV version (only if ClamAV is included)
RUN if [ "$INCLUDE_CLAMAV" = "true" ]; then \
        freshclam --version; \
    fi

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check (lightweight)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use tini as PID 1 for proper signal handling (or dumb-init if ClamAV is included)
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "apps/uplox/dist/index.js"]
