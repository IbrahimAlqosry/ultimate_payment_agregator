# Multi-stage build: compile the Angular SPA, then serve the static output with nginx.
# Build:  docker build -t atlas-console .
# Run:    docker run -p 8080:80 atlas-console
#         (or add to the backend's docker-compose.yml — see nginx.conf for the proxy target)

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS serve
# nginx's own entrypoint envsubst's this into /etc/nginx/conf.d/default.conf at container start,
# substituting ${API_BACKEND} — see nginx.conf.template for what that env var controls.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/atlas-console/browser /usr/share/nginx/html

ENV API_BACKEND=http://88.80.145.121:9519
EXPOSE 80
