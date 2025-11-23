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
COPY server/package*.json ./
RUN npm install --production

# Copy Backend Code
COPY server/ ./

# Copy Built Frontend to Backend's public folder
COPY --from=build /app/client/dist ./public

# Create data directory
RUN mkdir -p data/uploads

EXPOSE 3000
CMD ["node", "server.js"]
