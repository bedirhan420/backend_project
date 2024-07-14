const mongoose = require("mongoose")
const {isValidEmail,isValidPassword} = require("../../config/check");
const {HTTP_CODES}=require("../../config/Enum");
const CustomError = require("../../library/Error");
const crypto = require('crypto');
require("dotenv").config()


const schema = mongoose.Schema({
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    is_active:{type:Boolean,default:true},
    first_name:String,
    last_name:String,
    phone_number:String,
    language:{type:String,default:process.env.DEFAULT_LANG} },
    {
        versionKey:false,
        timestamps:{
            createdAt:"created_at",
            updatedAt:"updated_at"
        }
    }
);

class Users extends mongoose.Model {

    isValidPassword(password){
        const hashedPassword = crypto
        .createHash('md5')
        .update(password)
        .digest('hex');
      
        return hashedPassword === this.password;
    }

    static validateFieldsBeforeAuth(email,password){
        if (!(isValidEmail(email) || isValidPassword(password) )) {
            throw new CustomError(HTTP_CODES.UNAUTHORIZED,"Validation Error","email or password wrong")
        }
        return null;
    }
}

schema.loadClass(Users);
module.exports = mongoose.model("users",schema)