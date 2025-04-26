CREATE TABLE IF NOT EXISTS AUTH(
    _id VARCHAR(256) PRIMARY KEY,
    is_email_verified Boolean,
    is_google_verified Boolean,
    is_apple_verified Boolean,
    is_passwordless Boolean,
    is_mfa_enabled Boolean,
    user_id VARCHAR(256),
    FOREIGN KEY(user_id) REFERENCES users(_id)
);