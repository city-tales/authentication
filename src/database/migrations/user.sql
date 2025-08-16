CREATE TABLE IF NOT EXISTS USERS(
    _id VARCHAR(256) PRIMARY KEY,
    created_at VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS USERS_DATA (
	_id VARCHAR(256) PRIMARY KEY,
	email VARCHAR(50) UNIQUE,
	name VARCHAR(25),
    username VARCHAR(50) UNIQUE NOT NULL,
    primary_country_code VARCHAR(4),
    phone_number VARCHAR(16) UNIQUE,
    secondary_country_code VARCHAR(4),
    alternate_phone VARCHAR(16) UNIQUE,
    profile_picture VARCHAR(512),
    updated_at VARCHAR(256),
    user_id VARCHAR(256),
    CHECK (
        (phone_number IS NULL AND primary_country_code IS NULL) OR 
        (phone_number IS NOT NULL AND primary_country_code IS NOT NULL)
    ),
    CHECK (
        (alternate_phone IS NULL AND secondary_country_code IS NULL) OR 
        (alternate_phone IS NOT NULL AND secondary_country_code IS NOT NULL AND phone_number IS NOT NULL)
    ),
    CHECK (
        alternate_phone IS NULL OR 
        (alternate_phone IS NOT NULL AND alternate_phone != phone_number)
    ),
    CHECK (email IS NOT NULL OR phone_number IS NOT NULL),
    FOREIGN KEY(user_id) REFERENCES USERS(_id)
);

/*
    // Permutations to be checked -
    * CHECK (phone_number IS NULL AND primary_country_code IS NULL),
    * CHECK (alternate_phone IS NULL AND secondary_country_code IS NULL),
    * CHECK (phone_number IS NOT NULL AND primary_country_code IS NOT NULL),
    * CHECK (alternate_phone IS NOT NULL AND secondary_country_code IS NOT NULL AND phone_number IS NOT NULL),
    * CHECK (alternate_phone IS NOT NULL AND alternate_phone != phone_number),
    * CHECK (email IS NOT NULL OR phone_number IS NOT NULL)
*/