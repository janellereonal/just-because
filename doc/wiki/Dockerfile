FROM node:22-alpine AS build

WORKDIR /site
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm docs:build

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/.vitepress/dist /usr/share/nginx/html

EXPOSE 8080
