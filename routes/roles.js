var express = require("express");
var router = express.Router();
const Roles = require("../db/models/Roles");
const RolePrivileges = require("../db/models/RolePrevileges");
const Response = require("../library/Response");
const CustomError = require("../library/Error");
const Enum = require("../config/Enum");
const role_privileges = require("../config/role_privileges");
const AuditLogs = require("../library/AuditLogs");
const logger = require("../library/logger/loggerClass");
const auth = require("../library/auth")();
const i18n = new (require("../library/i18n"))(process.env.DEFAULT_LANG);
const UserRoles = require("../db/models/UserRoles");


router.all("*", auth.authenticate(),(req,res,next)=>{
    next();
} )

/* GET roles listing. */
router.get("/", auth.checkRoles("role_view") , async (req, res) => {
  try {
    let roles = await Roles.find({}).lean();
    for (let i = 0; i < roles.length; i++) {      
      let permissions = await RolePrivileges.find({role_id:roles[i]._id});
      roles[i].permissions = permissions;
    }
    res.json(Response.successResponse(roles));
    AuditLogs.info(req.user?.email, "Roles", "Get", "Fetched roles listing");
    logger.info(req.user?.email, "Roles", "Get", "Fetched roles listing");
  } catch (error) {
    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
    AuditLogs.error(req.user?.email, "Roles", "Get", error.message);
    logger.error(req.user?.email, "Roles", "Get", error.message);
  }
});

/* POST roles listing. */
router.post("/add",auth.checkRoles("role_add") , async (req, res) => {
  let body = req.body;
  try {
    if (!body.role_name) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["role_name"]));
    if (
      !(
        body.permissions &&
        Array.isArray(body.permissions) &&
        body.permissions.length > 0
      )
    )
    throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),i18n.translate("COMMON.FIELD_MUST_BE_TYPE", req.user.language, ["permissions", "Array"]));

    let role = new Roles({
      role_name: body.role_name,
      is_active: true,
      created_by: req.user?.id,
    });

    await role.save();

    for (let i = 0; i < body.permissions.length; i++) {
      let priv = new RolePrivileges({
        role_id: role._id,
        permission: body.permissions[i],
        created_by: req.user?.id,
      });

      await priv.save();
    }

    res
      .status(Enum.HTTP_CODES.CREATED)
      .json(
        Response.successResponse({ success: true }, Enum.HTTP_CODES.CREATED)
      );
    AuditLogs.info(
      req.user?.email,
      "Roles",
      "Add",
      `Added role: ${body.role_name}`
    );
    logger.info(
      req.user?.email,
      "Roles",
      "Add",
      `Added role: ${body.role_name}`
    );
  } catch (error) {
    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
    AuditLogs.error(req.user?.email, "Roles", "Add", error.message);
    logger.error(req.user?.email, "Roles", "Add", error.message);
  }
});

/* PUT roles listing. */
router.put("/update", auth.checkRoles("role_update"), async (req, res) => {
  let body = req.body;
  try {
    if (!body._id) {throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));}
    
    let userRole = await UserRoles.findOne({user_id: req.user.id, role_id: body._id});

    if (userRole) {
        throw new CustomError(Enum.HTTP_CODES.FORBIDDEN, i18n.translate("COMMON.NEED_PERMISSIONS", req.user.language),i18n.translate("COMMON.NEED_PERMISSIONS", req.user.language));
    }
    
    let updates = {};
    if (body.role_name) updates.role_name = body.role_name;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    if (
      body.permissions &&
      Array.isArray(body.permissions) &&
      body.permissions.length > 0
    ) {
      let permissions = await RolePrivileges.find({ role_id: body._id });

      let removedPermissions = permissions.filter(
        (c) => !body.permissions.includes(c.permission)
      );
      let newPermissions = body.permissions.filter(
        (c) => !permissions.map((p) => p.permission).includes(c)
      );

      if (removedPermissions.length > 0) {
        await RolePrivileges.deleteMany({
          _id: { $in: removedPermissions.map((c) => c._id) },
        });
      }

      if (newPermissions.length > 0) {
        let newPrivs = newPermissions.map((permission) => ({
          role_id: body._id,
          permission,
          created_by: req.user?.id,
        }));

        await RolePrivileges.insertMany(newPrivs);
      }
    }

    await Roles.updateOne({ _id: body._id }, updates);

    // Send the response before logging
    res.json(Response.successResponse({ success: true }));

    // Logging after sending the response
    AuditLogs.info(
      req.user?.email,
      "Roles",
      "Update",
      `Updated role: ${body._id}`
    );
    logger.info(
      req.user?.email,
      "Roles",
      "Update",
      `Updated role: ${body._id}`
    );
  } catch (error) {
    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);

    // Error logging after sending the error response
    AuditLogs.error(req.user?.email, "Roles", "Update", error.message);
    logger.error(req.user?.email, "Roles", "Update", error.message);
  }
});


/* DELETE roles listing. */
router.delete("/delete", auth.checkRoles("role_delete") , async (req, res) => {
  let body = req.body;
  try {
    if (!body._id) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));

    const result = await Roles.deleteOne({ _id: body._id });

    if (result.deletedCount === 0) {
      throw new CustomError(
        Enum.HTTP_CODES.NOT_FOUND,
        "Not Found",
        `No role found with _id: ${body._id}`
      );
    }

    res.json(Response.successResponse({ success: true }));
    AuditLogs.info(
      req.user?.email,
      "Roles",
      "Delete",
      `Deleted role: ${body._id}`
    );
    logger.info(
      req.user?.email,
      "Roles",
      "Delete",
      `Deleted role: ${body._id}`
    );
  } catch (error) {
    let errorResponse = Response.errorResponse(error,req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
    AuditLogs.error(req.user?.email, "Roles", "Delete", error.message);
    logger.error(req.user?.email, "Roles", "Delete", error.message);
  }
});

router.get("/role_privileges", async (req, res) => {
  try {
    // Fetch role privileges logic
    res.json(role_privileges);

    // Log success
    AuditLogs.info(req.user?.email, "Role Privileges", "Get", "Fetched role privileges");
    logger.info(req.user?.email, "Role Privileges", "Get", "Fetched role privileges");
  } catch (error) {
    let errorResponse = Response.errorResponse(error,req.user?.language);
    
    // Ensure no duplicate response is sent
    if (!res.headersSent) {
      res.status(errorResponse.code).json(errorResponse);
    }

    // Log error
    AuditLogs.error(req.user?.email, "Role Privileges", "Get", error.message);
    logger.error(req.user?.email, "Role Privileges", "Get", error.message);
  }
});


module.exports = router;
