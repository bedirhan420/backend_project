const mongoose = require("mongoose");
const RolePrevileges = require("./RolePrevileges");

const schema = mongoose.Schema({
    role_name: { type: String, required: true, unique: true },
    is_active: { type: Boolean, default: true },
    createdBy: { type: mongoose.SchemaTypes.ObjectId },
},
{
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Roles extends mongoose.Model {
    static async deleteOne(query) {
        if (query._id) {
            await RolePrevileges.deleteMany({ role_id: query._id });
        }
        return await super.deleteOne(query); 
    }
}

schema.loadClass(Roles);
module.exports = mongoose.model("roles", schema);
