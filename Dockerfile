# Alternative to the nginx setup script: build and serve with Docker.
#   docker build -t carnet-francais . && docker run -d -p 8080:80 --restart unless-stopped carnet-francais
FROM python:3.12-alpine AS build
WORKDIR /src
COPY . .
RUN python3 build.py

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i -e 's|__PORT__|80|g' -e 's|__WEBROOT__|/usr/share/nginx/html|g' /etc/nginx/conf.d/default.conf
COPY --from=build /src/public /usr/share/nginx/html
