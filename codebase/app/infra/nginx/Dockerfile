FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf

# NOTE: `nginx -t` cannot run at build time — upstream hostnames (backend,
# frontend) only resolve inside the compose network at runtime.

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]