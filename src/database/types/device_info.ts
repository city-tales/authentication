import { StringOrNull } from "../../utils/custom_types.js";

export type DeviceType = {
    _id: string;
    device_type?: StringOrNull;
    browser_info?: StringOrNull;
    ip_address?: StringOrNull;
    platform?: StringOrNull;
    device_name?: StringOrNull;
    login_time: Date | string;
    user_id?: StringOrNull;
};
export type GPRCDeviceType = {
    deviceType?: StringOrNull;
    browserInfo?: StringOrNull;
    ipAddress?: StringOrNull;
    platform?: StringOrNull;
    deviceName?: StringOrNull;
    loginTime?: Date | string;
};
