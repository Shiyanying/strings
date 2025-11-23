# Build Frontend
FROM node:18-alpine as build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Setup Backend
FROM node:18-alpine
WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

COPY server/package*.json ./
RUN npm install --production

# Copy Backend Code
COPY server/ ./

# Copy Built Frontend to Backend's public folder
COPY --from=build /app/client/dist ./public

# Create data directory with proper permissions
RUN mkdir -p data/uploads && \
    chmod -R 755 data

EXPOSE 3000
CMD ["node", "server.js"]
