var express = require("express");
const Users = require("../db/models/Users");
var router = express.Router();
const crypto = require("crypto");
const Response = require("../library/Response");
const CustomError = require("../library/Error");
const Enum = require("../config/Enum");
const {
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
} = require("../config/check");
const UserRoles = require("../db/models/UserRoles");
const Roles = require("../db/models/Roles");
const AuditLogs = require("../library/AuditLogs");
const logger = require("../library/logger/loggerClass");
require("dotenv").config()
const jwt = require("jwt-simple");
const auth = require("../library/auth")();
const i18n = new (require("../library/i18n"))(process.env.DEFAULT_LANG);


/* Register users listing. */
router.post("/register", async (req, res) => {
  let body = req.body;
  let userExists = false;

  if (!body.email) {
    return res
      .status(Enum.HTTP_CODES.BAD_REQUEST)
      .json(
        Response.errorResponse(
          new CustomError(
            Enum.HTTP_CODES.BAD_REQUEST,
            "Validation Error",
            "Email field must be filled"
          )
        )
      );
  }

  try {
    let user = await Users.findOne({ email: body.email });

    if (user) {
      userExists = true;
    }
  } catch (error) {
    AuditLogs.error(req.user?.email, "Users", "Register Check", error.message);
    logger.error(req.user?.email, "Users", "Register Check", error.message);

    let errorResponse = Response.errorResponse(error,req.user?.language);
    return res.status(errorResponse.code).json(errorResponse);
  }

  if (userExists) {
    return res
      .status(Enum.HTTP_CODES.NOT_FOUND)
      .json(
        Response.errorResponse(
          new CustomError(
            Enum.HTTP_CODES.NOT_FOUND,
            "Validation Error",
            "User with this email already exists"
          )
        )
      );
  }

  try {
    if (!isValidPassword(body.password))
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
      );

    if (!isValidPhoneNumber(body.phone_number))
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "Phone Number must be 11 characters long"
      );

    const password = crypto
      .createHash("md5")
      .update(body.password)
      .digest("hex");

    let created_user = await Users.create({
      email: body.email,
      password,
      is_active: true,
      first_name: body.first_name,
      last_name: body.last_name,
      phone_number: body.phone_number,
    });

    let role = await Roles.create({
      role_name: Enum.SUPER_ADMIN,
      is_active: true,
      created_by: created_user._id,
    });

    await UserRoles.create({
      role_id: role._id,
      user_id: created_user._id,
    });

    AuditLogs.info(req.user?.email, "Users", "Register", created_user);
    logger.info(req.user?.email, "Users", "Register", created_user);

    res
      .status(Enum.HTTP_CODES.CREATED)
      .json(
        Response.successResponse({ success: true }, Enum.HTTP_CODES.CREATED)
      );
  } catch (error) {
    AuditLogs.error(req.user?.email, "Users", "Register", error.message);
    logger.error(req.user?.email, "Users", "Register", error.message);

    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

/* Auth users listing. */
router.post("/auth", async (req, res) => {
  try {
    let { email, password } = req.body;

    Users.validateFieldsBeforeAuth(email, password);

    let user = await Users.findOne({ email });

    if (!user) throw new CustomError(Enum.HTTP_CODES.UNAUTHORIZED, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", config.DEFAULT_LANG), i18n.translate("USERS.AUTH_ERROR", config.DEFAULT_LANG));
    
    if(!user.isValidPassword(password)) throw new CustomError(Enum.HTTP_CODES.UNAUTHORIZED, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", config.DEFAULT_LANG), i18n.translate("USERS.AUTH_ERROR", config.DEFAULT_LANG));


    let payload={
      id:user._id,
      exp: parseInt(Date.now() / 1000) * (process.env.JWT_EXP || 24*60*60),
    }

    let token = jwt.encode(payload, process.env.JWT_SECRET);

    let userData = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name
    }

    res.json(Response.successResponse({ token, user: userData }));
    AuditLogs.info(req.user?.email, "Users", "Auth",user.email );
    logger.info(req.user?.email, "Users", "Auth",user.email);

  } catch (error) {
    AuditLogs.error(req.user?.email, "Users", "Auth", error.message);
    logger.error(req.user?.email, "Users", "Auth", error.message);

    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.all("*", auth.authenticate(),(req,res,next)=>{
    next();
} )

/* GET users listing. */
router.get("/", auth.checkRoles("user_view") , async (req, res) => {
  try {
    let users = await Users.find({});
    res.json(Response.successResponse(users));
  } catch (error) {
    AuditLogs.error(req.user?.email, "Users", "Get", error.message);
    logger.error(req.user?.email, "Users", "Get", error.message);
    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

/* POST users listing. */
router.post("/add",auth.checkRoles("user_add") ,  async (req, res) => {
  let body = req.body;
  try {
    if (!body.email) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["email"]));

    if (!body.password) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["password"]));

    if (!isValidEmail(body.email)) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("USERS.EMAIL_FORMAT_ERROR", req.user.language));

    if (!isValidPassword(body.password)) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("USERS.PASSWORD_LENGTH_ERROR", req.user.language, [Enum.PASS_LENGTH]));

    if (!isValidPhoneNumber(body.phone_number)) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("USERS.PHONE_NUMBER_LENGTH_ERROR", req.user.language, [Enum.NUM_LENGTH]));

    if (!(body.roles && Array.isArray(body.roles) && !body.roles.length == 0)) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_TYPE", req.user.language, ["roles", "Array"]));


    let roles = await Roles.find({ _id: { $in: body.roles } });

    if (roles.length == 0) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_TYPE", req.user.language, ["roles", "Array"]));

    const password = crypto
      .createHash("md5")
      .update(body.password)
      .digest("hex");

    let user = await Users.create({
      email: body.email,
      password,
      is_active: true,
      first_name: body.first_name,
      last_name: body.last_name,
      phone_number: body.phone_number,
    });

    for (let i = 0; i < roles.length; i++) {
      await UserRoles.create({
        role_id: roles[i]._id,
        user_id: user._id,
      });
    }

    AuditLogs.info(req.user?.email, "Users", "Add", user);
    logger.info(req.user?.email, "Users", "Add", user);

    res
      .status(Enum.HTTP_CODES.CREATED)
      .json(
        Response.successResponse({ success: true }, Enum.HTTP_CODES.CREATED)
      );
  } catch (error) {
    AuditLogs.error(req.user?.email, "Users", "Add", error.message);
    logger.error(req.user?.email, "Users", "Add", error.message);
    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

/* PUT user listing. */
router.put("/update",auth.checkRoles("user_update") ,  async (req, res) => {
  let body = req.body;
  try {
    if (!body._id) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));

    let updates = {};
    if (body.password && isValidPassword(body.password))
      updates.password = crypto
        .createHash("md5")
        .update(body.password)
        .digest("hex");
    if (body.email && isValidEmail(body.email)) updates.email = body.email;
    if (body.phone_number && isValidPhoneNumber(body.phone_number))
      updates.phone_number = body.phone_number;
    if (body.first_name) updates.first_name = body.first_name;
    if (body.last_name) updates.last_name = body.last_name;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    if (Array.isArray(body.roles) && body.roles.length > 0) {
      let userRoles = await UserRoles.find({ user_id: body._id });

      let removedRoles = userRoles.filter(
        (c) => !body.roles.includes(c.role_id)
      );
      let newRoles = body.roles.filter(
        (c) => !userRoles.map((r) => r.role_id).includes(c)
      );

      if (removedRoles.length > 0) {
        await UserRoles.deleteMany({
          _id: { $in: removedRoles.map((c) => c._id) },
        });
      }

      if (newRoles.length > 0) {
        for (let i = 0; i < newRoles.length; i++) {
          let userRole = new UserRoles({
            role_id: newRoles[i],
            user_id: body._id,
          });

          await UserRoles.insertMany(userRole);
        }
      }
    }
    await Users.updateOne({ _id: body._id }, updates);

    AuditLogs.info(req.user?.email, "Users", "Update", {
      _id: body._id,
      ...updates,
    });
    logger.info(req.user?.email, "Users", "Update", {
      _id: body._id,
      ...updates,
    });

    res.json(Response.successResponse({ success: true }));
  } catch (error) {
    AuditLogs.error(req.user?.email, "Users", "Update", error.message);
    logger.error(req.user?.email, "Users", "Update", error.message);
    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

/* DELETE user listing. */
router.delete("/delete",auth.checkRoles("user_delete") ,  async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));

    const result = await Users.deleteOne({ _id: body._id });
    await UserRoles.deleteMany({ user_id: body._id });

    if (result.deletedCount === 0) {
      throw new CustomError(
        Enum.HTTP_CODES.NOT_FOUND,
        "Not Found",
        `No user found with _id: ${body._id}`
      );
    }

    AuditLogs.info(req.user?.email, "Users", "Delete", { _id: body._id });
    logger.info(req.user?.email, "Users", "Delete", { _id: body._id });

    res.json(Response.successResponse({ success: true }));
  } catch (error) {
    AuditLogs.error(req.user?.email, "Users", "Delete", error.message);
    logger.error(req.user?.email, "Users", "Delete", error.message);
    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

module.exports = router;
