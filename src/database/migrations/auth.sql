CREATE TABLE IF NOT EXISTS AUTH(
    _id VARCHAR(256) PRIMARY KEY,
    is_email_verified Boolean,
    is_google_verified Boolean,
    is_passwordless Boolean,
    is_mfa_enabled Boolean,
    password VARCHAR(256),
    salt CHAR(32),
    user_id VARCHAR(256),
    FOREIGN KEY(user_id) REFERENCES USERS(_id)
);