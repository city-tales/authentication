import { Device } from "../interface/device_info.js";
import { SignUpResponse } from "../interface/signup_response.js";
import { Users } from "../interface/user_signup.js";
import { helper } from "../../utils/helper.js";

interface User {
    createUser(userInfo: Users, deviceInfo: Device) : Promise<SignUpResponse> ;
}

class UserImpl implements User {
    async createUser(userInfo: Users, deviceInfo: Device) : Promise<SignUpResponse> {
        const columns = helper.createQueryColumn(userInfo);
        const values = helper.createQueryValues(userInfo);
        const tableName = "users";

        const response : SignUpResponse = {
            message: "",
            status_code: 201,
        };

        try {
            const query = await helper.executeQueryAsync(`INSERT INTO ${tableName}(${columns}) VALUES (${values})`);
            console.log(query);

            return query;
        }
        catch(error) {
            console.log(error);
        }

        return response;
    }
}

export const user = new UserImpl();