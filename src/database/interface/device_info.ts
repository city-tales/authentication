export interface DeviceInterface {
    _id: string,
    device_type?: string,
    browser_info?: string,
    ip_address?: string,
    device_id?: string,
    platform?: string,
    device_name?: string,
    login_time: Date,
    user_id?: string | null,
}

export interface GPRCDeviceInterface {
    deviceType?: string,
    browserInfo?: string,
    ipAddress?: string,
    deviceId?: string,
    platform?: string,
    deviceName?: string,
    loginTime: Date,
};