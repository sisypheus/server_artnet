FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=8082

EXPOSE 8082

CMD [ "node", "index.js" ]