CREATE TABLE IF NOT EXISTS AUTH(
    _id VARCHAR(256) PRIMARY KEY,
    google_email VARCHAR(50) UNIQUE,
    apple_email VARCHAR(50) UNIQUE,
    is_email_verified Boolean,
    is_google_verified Boolean,
    is_apple_verified Boolean,
    is_passwordless Boolean,
    is_mfa_enabled Boolean,
    salt CHAR(32),
    user_id VARCHAR(256),
    FOREIGN KEY(user_id) REFERENCES USERS(_id)
);