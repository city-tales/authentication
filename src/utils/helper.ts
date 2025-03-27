import { pool } from "../config/postgres.js";

interface Helper {
    createQueryColumn(columns: any) : any; 
    createQueryValues(values: any) : any; 
    executeQueryAsync(query : any) : any;
};

export class HelperImpl implements Helper {
    createQueryColumn(columns: any): any {
        const column = Object.keys(columns).join(', ');
        return column;
    }

    createQueryValues(values: any): any {
        const value = Object.values(values);
        const placeholder = value.map((_, index) => `$${index + 1}`).join(', ');

        return placeholder;
    }

    async executeQueryAsync(query : any) {
        try {
            const response = await pool.query(query);
            return response;
        }
        catch(error) {
            throw error(error);
        }
    }
}

export const helper = new HelperImpl();