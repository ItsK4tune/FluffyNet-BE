FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

EXPOSE 8080

CMD ["node", "dist/main.js"]