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

# Install build dependencies for native modules and wget for healthcheck
RUN apk add --no-cache \
    wget \
    python3 \
    py3-setuptools \
    make \
    g++

# Copy Backend Dependencies and Install
COPY server/package*.json ./

# Install dependencies (sqlite3 will auto-compile during install)
RUN npm install --production && \
    npm rebuild sqlite3 --build-from-source && \
    ls -la node_modules/sqlite3/build/Release/ && \
    apk del python3 py3-setuptools make g++

# Copy Backend Code
COPY server/ ./

# Copy Built Frontend to Backend's public folder
COPY --from=build /app/client/dist ./public

# Create data directory with proper permissions
RUN mkdir -p data/uploads && \
    chmod -R 755 data

EXPOSE 3000
CMD ["node", "server.js"]
