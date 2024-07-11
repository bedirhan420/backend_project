class CustomError extends Error {
    constructor(code, msg, desc) {
        super(msg);
        this.code = code;
        this.description = desc;
    }
}

module.exports = CustomError;
