const mongoose = require("mongoose")

const schema = mongoose.Schema({
    role_id:{type:mongoose.SchemaTypes.ObjectId,required:true},
    permission:{type:String,required:true},
    createdBy:{type:mongoose.SchemaTypes.ObjectId}
    },
    {
        versionKey:false,
        timestamps:{
            createdAt:"created_at",
            updatedAt:"updated_at"
        }
    }
);

class RolePrevileges extends mongoose.Model {

}

schema.loadClass(RolePrevileges);
module.exports = mongoose.model("role_previleges",schema)