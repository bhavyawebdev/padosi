FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
COPY .env.example ./env.example

RUN npm ci
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
