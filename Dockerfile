FROM docker.io/library/node:14.17.3 AS builder
WORKDIR /app
COPY . /app
RUN yarn install
RUN yarn build


FROM docker.io/library/node:14.17.3 as serverpackage
RUN yarn global add http-server
RUN export PATH="$(yarn global bin):$PATH"

FROM serverpackage
COPY --from=builder /app/plugins/odf/dist /app
COPY --from=builder /app/http-server.sh .
ENTRYPOINT [ "./http-server.sh", "./app", "-S", "true", "-C", "/var/serving-cert/tls.crt", "-K", "/var/serving-cert/tls.key" ]
