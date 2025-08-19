# Redis Setup

## Redis Cloud Setup

1. Go to [Redis Cloud Console](https://app.redislabs.com/#/).
2. Create a database, select a name, and proceed with the creation.

## Redis GUI (Redis Insight)

1. Download **Redis Insight**.
2. Open the application and go to **Connection Settings**.
3. Enter the credentials and connect to your Redis instance.

## Local Setup

1. Go to [Redis Cloud Console](https://app.redislabs.com/#/).
2. Click on **Connect using Redis CLI, Client, or Insight**.
3. Select the appropriate language for your setup.
4. Copy the provided connection values and store them in your environment variables.

## Environment Variables

```env
CACHE_DB_REDIS_USERNAME=<your_redis_username>
CACHE_DB_REDIS_PASSWORD=<your_redis_password>
CACHE_DB_REDIS_HOST=<your_redis_host>
CACHE_DB_REDIS_PORT=<your_redis_port>
```

## Environment-based roles/databases (NODE_ENV)

To isolate cache data across environments (development, staging, production):

- Prefer using separate Redis databases/instances or users per environment.
- Configure credentials in `.env` based on `NODE_ENV`.
- Optionally use environment-specific key prefixes to avoid collisions.

### Recommended ENV variables per environment

```env
NODE_ENV=development|staging|production
CACHE_DB_REDIS_USERNAME=<env-specific-username>
CACHE_DB_REDIS_PASSWORD=<env-specific-password>
CACHE_DB_REDIS_HOST=<host>
CACHE_DB_REDIS_PORT=<port>
```

### Key prefixing example (pseudo-code)

```ts
const env = process.env.NODE_ENV || "demo";
const key = `${env}:auth:session:${userId}`;
```
