FROM node:20-alpine

WORKDIR /app

# Install production deps first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source (the homepage, the form, server, views, lib)
COPY . .

ENV NODE_ENV=production
ENV PORT=8090
EXPOSE 8090

CMD ["node", "server.js"]
