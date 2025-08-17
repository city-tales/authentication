ARG NODE_VERSION=20.19.2
FROM node:${NODE_VERSION}-alpine3.21

WORKDIR /home/authentication

COPY shared-proto /home/shared-proto
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build
RUN chmod +x ./start_app.sh && adduser -D app && chown -R app:app /home/authentication

# Expose single gRPC port (Cloud Run will set PORT)
EXPOSE 8080
CMD ["./start_app.sh"]