# PostgreSQL Setup Documentation

## PostgreSQL Hosting on Render
PostgreSQL is hosted on Render, and the deployment will expire every month. Follow the steps below to set up PostgreSQL on Render:

### Steps to Host PostgreSQL on Render
1. Click on **New**, then select **PostgreSQL**.
2. Enter the following details:
   - **Name**: Choose a name for your database.
   - **Database**: Specify the database name.
   - **User**: Set a database user.
   - **PostgreSQL Version**: Use version **15** for this project.
3. Select the **Free** instance type.

### Creating the Database
Once the setup is complete, Render will generate an **External Database URL** that can be used for connecting to the database.

## TablePlus Setup
TablePlus can be used to connect and manage the PostgreSQL database.

### Steps to Connect to PostgreSQL using TablePlus
1. Open **TablePlus** and click on the **+** icon.
2. Select **Import from URL**.
3. Copy the **External Database URL** from Render.
4. Click on **Import** to establish the connection.

## Local Setup
For local development, create an `.env` file with the following keys:

```
DATABASE_URL=<your_database_url>
DB_USERNAME=<your_database_username>
DB_DATABASE=<your_database_name>
DB_HOST=<your_database_host>
DB_PASSWORD=<your_database_password>
DB_PORT=<your_database_port>
```

### Retrieving the DB Host
To get the correct **DB_HOST**, follow these steps:
1. Open **TablePlus**.
2. Edit the connection and copy the **Host Name**.
3. Paste the value in the `.env` file under `DB_HOST`.

This setup ensures a smooth integration of PostgreSQL with your project.

