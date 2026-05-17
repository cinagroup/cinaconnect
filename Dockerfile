# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json ./
COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/ apps/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install
RUN pnpm build --filter=@cinaconnect/core-sdk --filter=@cinaconnect/react

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/core-sdk/dist ./packages/core-sdk/dist
COPY --from=builder /app/packages/react/dist ./packages/react/dist
RUN npm install -g pnpm
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "--version"]
