FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/backend/node_modules ./apps/backend/node_modules
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN pnpm build

FROM base AS deploy
WORKDIR /app
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/package.json ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
