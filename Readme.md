Twister
=======

Twister is a convenient and simple clone of Twitter

## Setup

1. Clone the repository

```bash
git clone https://github.com/sekretov/twister.git
```

2. Create the `.env` file specigyng the database and web server configuration parameters.


```bash
# inside .env file...

# Database Configuration
TWISTER_DB_HOST= 
TWISTER_DB_PORT=
TWISTER_DB_NAME=
TWISTER_DB_USER=
TWISTER_DB_PASSWORD=
TWISTER_DB_DIALECT= # one of 'mysql' | 'mariadb' | 'postgres' | 'mssql'
# Web Server Configuration
TWISTER_PORT=
# WEB APP CONFIGURATIONS
TWISTER_ADMIN_LOGIN=
TWISTER_ADMIN_PASSWORD=
TWISTER_SESSION_SECRET=
TWISTER_PASSWORD_SALT_ROUND=
```
3. Install all the dependencies

```bash
npm install
```

4. Start the Server

```bash
node index.js
```



## Credits

Sekretov Maksim Vasilievich <makc9207@mail.ru>
