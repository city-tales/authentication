ARG NODE_VERSION=20.19.2
FROM node:${NODE_VERSION}-alpine3.21

WORKDIR /home/authentication
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .

RUN npm run build
RUN chmod +x ./start_app.sh && adduser -D app && chown -R app:app /home/authentication

EXPOSE 2221
CMD ["./start_app.sh"]