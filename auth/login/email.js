const emailLogin = (call, callback) => {
    const request = call.request;
    console.log("EmailLogin Request:", request);

    const response = {
        success: true,
        message: "Email login successful!"
    };

    callback(null, response);
};

module.exports = {
    emailLogin,
}