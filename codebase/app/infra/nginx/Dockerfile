FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf

# Validate config at build time
RUN nginx -t

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]