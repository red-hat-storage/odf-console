FROM docker.io/library/node:18.12.1 AS builder
WORKDIR /app
COPY . /app
RUN yarn install --prod --frozen-lockfile
RUN yarn build

# TODO: write dockerfile
