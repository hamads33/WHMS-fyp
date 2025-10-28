# Backend/Dockerfile - cache friendly for dev
# Use small image
FROM node:20-alpine AS base
WORKDIR /usr/src/app
ENV NODE_ENV=development

# Install build deps (first layer) — only changes when package.json changes
FROM base AS deps
COPY package.json package-lock.json* ./
# Use npm ci when package-lock.json exists (faster, reproducible)
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --production; fi

# Copy source (later layer so changes to code don't bust deps cache)
FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Expose port and default command (dev)
EXPOSE 4000
CMD ["npm", "run", "dev"]

# Install all dependencies (including dev)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Generate Prisma client
RUN npx prisma generate

RUN npm install -g nodemon
