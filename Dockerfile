# Dockerfile

# 1. Use an official Node.js runtime as a parent image
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY .env ./

RUN npm install
RUN npx prisma generate
RUN npm run db:seed
COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]