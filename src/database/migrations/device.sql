CREATE TABLE IF NOT EXISTS DEVICE(
    _id VARCHAR(256) PRIMARY KEY,
    device_type VARCHAR(256),
    browser_info VARCHAR(256),
    ip_address VARCHAR(256),
    device_id VARCHAR(256),
    platform VARCHAR(256),
    device_name VARCHAR(256),
    login_time Date NOT NULL,
    user_id VARCHAR(256),
    FOREIGN KEY(user_id) REFERENCES users(_id)
);