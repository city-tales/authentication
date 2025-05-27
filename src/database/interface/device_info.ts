import { StringOrNull } from "../../utils/custom_types.js";

export interface DeviceInterface {
    _id: string,
    device_type?: StringOrNull,
    browser_info?: StringOrNull,
    ip_address?: StringOrNull,
    device_id?: StringOrNull,
    platform?: StringOrNull,
    device_name?: StringOrNull,
    login_time: Date,
    user_id?: StringOrNull,
}

export interface GPRCDeviceInterface {
    deviceType?: StringOrNull,
    browserInfo?: StringOrNull,
    ipAddress?: StringOrNull,
    deviceId?: StringOrNull,
    platform?: StringOrNull,
    deviceName?: StringOrNull,
    loginTime?: Date | string,
    userId?: StringOrNull,
};