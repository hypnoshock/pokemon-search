# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install
COPY src ./src
COPY tsconfig.json ./
RUN pnpm run build

# Production stage
FROM node:24-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --prod
COPY --from=builder /app/dist ./dist
COPY data ./data
CMD ["node", "dist/index.js"]