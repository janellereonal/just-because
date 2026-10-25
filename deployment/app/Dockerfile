FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_POSTHOG_KEY=
ARG VITE_POSTHOG_REGION=us
ARG VITE_MEDIA_STORAGE_PROVIDER=r2
ARG VITE_R2_PUBLIC_URL=
ENV NITRO_PRESET=node
ENV VITE_MEDIA_STORAGE_PROVIDER=$VITE_MEDIA_STORAGE_PROVIDER VITE_R2_PUBLIC_URL=$VITE_R2_PUBLIC_URL
RUN bun run build

FROM oven/bun:1-alpine AS production-deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --production --frozen-lockfile

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=production-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.output ./.output
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/bun.lock ./bun.lock
COPY --from=build --chown=app:app /app/bunfig.toml ./bunfig.toml
COPY --from=build --chown=app:app /app/scripts ./scripts
USER app
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
