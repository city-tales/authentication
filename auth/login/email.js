const { pool } = require("../../database/connection.js");

const emailLogin = async (call, callback) => {
    const request = call.request;

    /* */
    const dbRes = await pool.query(`select * from users`); // testing
    console.log(dbRes); // testing

    const response = {
        success: true,
        message: "Email login successful!"
    };

    callback(null, response);
};

module.exports = {
    emailLogin,
}