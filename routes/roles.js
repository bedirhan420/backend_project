var express = require('express');
var router = express.Router();
const Roles =require("../db/models/Roles");
const RolePrivileges =require("../db/models/RolePrevileges");
const Response = require("../library/Response");
const CustomError = require("../library/Error");
const Enum = require("../config/Enum");
const role_privileges = require("../config/role_privileges");
 
/* GET roles listing. */
router.get('/',async (req, res, next)=> {
  try {
    let roles = await Roles.find({});
    res.json(Response.successResponse(roles));

  } catch (error) {
    let errorResponse = Response.errorResponse(error);
    res.status(errorResponse.code).json(errorResponse);  
  }
});

/* POST roles listing. */
router.post("/add",async(req,res)=>{
  let body = req.body;
  try {
    if (!body.role_name) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST,"Validation Error","name field must be filled");
    if (!(body.permissions && Array.isArray(body.permissions) && !body.permissions.length==0 )) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST,"Validation Error","permissions field must be an Array");
    
    let role = new Roles({
      role_name : body.role_name,
      is_active : true,
      created_by : req.user?.id,
    })

    await role.save();

    for (let i = 0; i < body.permissions.length; i++) {
      let priv = new RolePrivileges({
        role_id : role._id,
        permission :body.permissions[i],
        created_by : req.user?.id
      })

      await priv.save();
    }

    res.status(Enum.HTTP_CODES.CREATED).json(Response.successResponse({success:true},Enum.HTTP_CODES.CREATED))
  } catch (error) {
    let errorResponse = Response.errorResponse(error);
    res.status(errorResponse.code).json(errorResponse);  
  }
})

/* PUT roles listing. */
router.put("/update", async (req, res) => {
  let body = req.body;
  try {
    if (!body._id) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "_id field must be filled");

    let updates = {};
    if (body.role_name) updates.role_name = body.role_name; // Fix the role_name update logic
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    if (body.permissions && Array.isArray(body.permissions) && body.permissions.length > 0) {
      let permissions = await RolePrivileges.find({ role_id: body._id });
      
      let removedPermissions = permissions.filter(c => !body.permissions.includes(c.permission));
      let newPermissions = body.permissions.filter(c => !permissions.map(p => p.permission).includes(c));

      if (removedPermissions.length > 0) {
        await RolePrivileges.deleteMany({ _id: { $in: removedPermissions.map(c => c._id) } });
      }
      
      if (newPermissions.length > 0) {
        let newPrivs = newPermissions.map(permission => ({
          role_id: body._id,
          permission,
          created_by: req.user?.id
        }));

        await RolePrivileges.insertMany(newPrivs);
      }
    }

    await Roles.updateOne({ _id: body._id }, updates);

    res.json(Response.successResponse({ success: true }));

  } catch (error) {
    let errorResponse = Response.errorResponse(error);
    res.status(errorResponse.code).json(errorResponse);
  }
});


/* DELETE roles listing. */
router.delete("/delete", async (req, res) => {
  let body = req.body;
  try {
      if (!body._id) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, "Validation Error", "_id field must be filled");

      const result = await Roles.deleteOne({ _id: body._id });

      if (result.deletedCount === 0) {
          throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, "Not Found", `No role found with _id: ${body._id}`);
      }

      res.json(Response.successResponse({ success: true }));

  } catch (error) {
      let errorResponse = Response.errorResponse(error);
      res.status(errorResponse.code).json(errorResponse);
  }
});

router.get("/role_privileges",async(req,res)=>{
  res.json(role_privileges);
})


module.exports = router;
