FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

ENV TRANSPORT=http
ENV MONGO_URL=mongodb://mongodb:27017/mcp

EXPOSE 3000

CMD ["npm", "start"]