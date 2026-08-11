FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
RUN pnpm build

FROM base AS deploy
WORKDIR /app
COPY --from=build /app/apps/frontend/.next ./.next
COPY --from=build /app/apps/frontend/node_modules ./node_modules
COPY --from=build /app/apps/frontend/package.json ./
COPY --from=build /app/apps/frontend/public ./public
COPY --from=build /app/apps/frontend/next.config.ts ./

EXPOSE 3000
CMD ["pnpm", "start"]
