# Setting Up Loki with Grafana Cloud

Follow these steps to set up **Loki** in **Grafana Cloud** for log aggregation and monitoring.

## 1. Create a Grafana Cloud Account

1. Go to [Grafana](https://grafana.com/).
2. Click on **Sign Up**.
3. Use your **Google account** (or other methods) to create an account and log in.

## 2. Navigate to Grafana Cloud

Once you're logged in:

1. After logging in, you’ll be directed to the Grafana Cloud dashboard.
2. If you are new to Grafana Cloud, you may need to create an **organization** to get started.
3. From the Grafana Cloud dashboard, click on **Loki** from the list of available services.

## 3. Enable Loki for Log Aggregation

1. Once you are inside the **Loki** service page, click on **Enable Loki**.
2. Follow the prompts to set up Loki in your Grafana Cloud account.
3. You'll be provided with an endpoint URL and credentials to access Loki, which will be used later in your application or server to send logs.

## 4. Create a New Token with Write Access

By default, the token created during setup only has **read access**. To send logs to Loki, you need to create a custom token with **write access**.

### Steps to create the custom token:

1. Go to **Access Policies**.
2. Click on **Edit > Update Permission**.
3. Give it a name (e.g., "Loki Write Token") and ensure you set it with **write** access.
4. After creating the token, make sure to **copy the token** and store it safely. You’ll need this token to send logs to Loki.

> **Important**: Do not share your token publicly, as it provides write access to your logs.

## 5. Sending Logs to Loki

Now that you have Loki enabled and a custom API token with write access, you can start sending logs to Grafana Loki.

### Example Setup for Sending Logs Using `winston`:

```
const options = {
    transports: [
        new LokiTransport({
            host: lokiLoggerUrl!,
            labels: { 
                app: Constants.LOKI_LOGGER.APPLICATION,
                env: Constants.LOKI_LOGGER.DEMOENV, // For local environment
                // env: Constants.LOKI_LOGGER.PRODENV, // For prod environment
            }, // default labels
            // json: Helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.TRUE),
            basicAuth: `${lokiLoggerUser}:${lokiLoggerToken}`,
            format: winston.format.json(),
            // replaceTimestamp: true,
            onConnectionError: (error) => console.error(error),
        }),
    ]
};

export const logger = createLogger(options);
```
