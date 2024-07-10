const mongoose = require("mongoose");

let instance = null;

class Database {
    constructor() {
        if (!instance) {
            this.mongoConnection = null;
            instance = this;
        }

        return instance;
    }

    async connect(connectionString) {
        try {
            console.log("DB Connecting ... ");
            let db = await mongoose.connect(connectionString, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            this.mongoConnection = db;
            console.log("DB Connected!");
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }
}

module.exports = Database;
