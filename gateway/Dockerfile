FROM nginx:alpine

# Install Node.js, npm, Redis
RUN apk add --no-cache \
    nodejs \
    npm

# Node app directory
WORKDIR /api-verification
COPY ./api-verification .
RUN npm install

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose ports
EXPOSE 80 3000