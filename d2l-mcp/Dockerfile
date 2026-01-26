FROM node:20-alpine

# Install Playwright system dependencies for Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev \
    ttf-opensans \
    bash \
    libstdc++ \
    libgcc

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for Playwright)
RUN npm ci && \
    npx playwright install chromium && \
    npx playwright install chromium-headless-shell

# Remove devDependencies to reduce image size (but keep Playwright binaries)
# Note: We skip install-deps because we already installed Alpine packages manually above
RUN npm prune --production

COPY dist ./dist
COPY scripts ./scripts

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http

EXPOSE 3000

CMD ["npm", "start"]
