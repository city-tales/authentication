# Upstash Redis Setup Guide

## Prerequisites

- A Google account.
- Upstash account (if you don’t have one, sign up [here](https://upstash.com/)).

### 2. Create a New Redis Database

1. Once logged in, navigate to the **Dashboard**.
2. Click on the **Create Database** button.
3. Select **Redis** as the database type.
4. Select Region `Mumbai, India` and click **Create**.

### 3. Get the Redis Connection URL

After your Redis database is created, you will be provided with the **Redis Connection URL**. You’ll use this to connect to your Upstash Redis server.

### 4. Configure the Connection

#### For Node.js

1. Install the Redis client library: ``` npm install bullmq ```
2. ENV Variables
```
   QUEUE_DB_REDIS_URL = ""
   QUEUE_DB_REDIS_USERNAME = 
   QUEUE_DB_REDIS_PASSWORD = 
   QUEUE_DB_REDIS_HOST = 
   QUEUE_DB_REDIS_PORT = 
```
