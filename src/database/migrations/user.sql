CREATE TABLE IF NOT EXISTS USER(
    _id VARCHAR(256) PRIMARY KEY,
    email VARCHAR(50) UNIQUE,
    password CHAR(256),
    name VARCHAR(25),
    username VARCHAR(50) UNIQUE NOT NULL,
    primary_country_code VARCHAR(4),
    phone_number VARCHAR(16) UNIQUE,
    secondary_country_code VARCHAR(4),
    alternate_phone VARCHAR(16) UNIQUE,
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
    CHECK (email IS NOT NULL OR phone_number IS NOT NULL)
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