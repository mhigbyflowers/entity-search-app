# Dockerfile

# 1. Use an official Node.js runtime as a parent image
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

# Use a startup script that handles database initialization
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]