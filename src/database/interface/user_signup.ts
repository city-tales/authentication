export interface Users {
    _id: string,
    email: string,
    password: string,
    name: string,
    username: string,
    primary_country_code?: string,
    phone_number?: string,
    secondary_country_code?: string,
    alternate_phone?: string,
};

export interface GPRCUsers {
    email: string,
    password: string,
    name: string,
    primaryCountryCode?: string,
    phoneNumber?: string,
    secondaryCountryCode?: string,
    alternatePhone?: string,
};