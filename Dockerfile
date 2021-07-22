FROM node:14

WORKDIR /usr/src/app
COPY . /usr/src/app
RUN yarn install
RUN yarn build

EXPOSE 9001
ENTRYPOINT [ "./http-server.sh", "./dist" ]
