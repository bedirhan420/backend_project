const express = require("express");
const router = express.Router();
const Categories = require("../db/models/Categories");
const Response = require("../library/Response");
const CustomError = require("../library/Error");
const Enum = require("../config/Enum");
const AuditLogs = require("../library/AuditLogs");
const logger = require("../library/logger/loggerClass");
const auth = require("../library/auth")();
const i18n = new (require("../library/i18n"))(process.env.DEFAULT_LANG);
const emitter = require("../library/Emitter");
const excelExport = new (require("../library/Export"))();
const fs = require("fs");
const path = require('path');
const multer = require("multer");
const Import = new (require("../library/Import"))();
require("dotenv").config()


let multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: (req, file, next) => {
        next(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
})

const upload = multer({ storage: multerStorage }).single("pb_file");

router.all("*", auth.authenticate(), (req, res, next) => {
  next();
});

/* GET categories listing. */
router.get("/", auth.checkRoles("category_view"), async (req, res) => {
  try {
    let categories = await Categories.find({});
    AuditLogs.info(
      req.user?.email,
      "Categories",
      "Get",
      "Retrieved all categories"
    );
    res.json(Response.successResponse(categories));
  } catch (error) {
    AuditLogs.error(req.user?.email, "Categories", "Get", error.message);
    logger.error(req.user?.email, "Categories", "Get", error.message);
    res.json(Response.errorResponse(error, req.user?.language));
  }
});

/* POST categories listing. */
router.post("/add", auth.checkRoles("category_add"), async (req, res) => {
  let body = req.body;
  try {
    if (!body.name)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "name",
        ])
      );

    let category = new Categories({
      name: body.name,
      is_active: true,
      createdby: req.user?.id,
    });

    await category.save();

    AuditLogs.info(
      req.user?.email,
      "Categories",
      "Add",
      `Added new category: ${category.name}`
    );
    logger.info(
      req.user?.email,
      "Categories",
      "Add",
      `Added new category: ${category.name}`
    );
    emitter
      .getEmitter("notifications")
      .emit("messages", { message: category.name + " is added" });

    res
      .status(Enum.HTTP_CODES.CREATED)
      .json(
        Response.successResponse({ success: true }, Enum.HTTP_CODES.CREATED)
      );
  } catch (error) {
    AuditLogs.error(req.user?.email, "Categories", "Add", error.message);
    logger.error(req.user?.email, "Categories", "Add", error.message);
    let errorResponse = Response.errorResponse(error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

/* PUT categories listing. */
router.put("/update", auth.checkRoles("category_update"), async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "_id",
        ])
      );

    let updates = {};
    if (body.name) updates.name = body.name;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    await Categories.updateOne({ _id: body._id }, updates);

    AuditLogs.info(
      req.user?.email,
      "Categories",
      "Update",
      `Updated category with _id: ${body._id}`
    );
    logger.info(
      req.user?.email,
      "Categories",
      "Update",
      `Updated category with _id: ${body._id}`
    );

    res.json(Response.successResponse({ success: true }));
  } catch (error) {
    AuditLogs.error(req.user?.email, "Categories", "Update", error.message);
    logger.error(req.user?.email, "Categories", "Update", error.message);
    let errorResponse = Response.errorResponse(error, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

/* DELETE categories listing. */
router.delete(
  "/delete",
  auth.checkRoles("category_delete"),
  async (req, res) => {
    let body = req.body;
    try {
      if (!body._id)
        throw new CustomError(
          Enum.HTTP_CODES.BAD_REQUEST,
          i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language),
          i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
            "_id",
          ])
        );

      const result = await Categories.deleteOne({ _id: body._id });

      if (result.deletedCount === 0) {
        throw new CustomError(
          Enum.HTTP_CODES.NOT_FOUND,
          "Not Found",
          `No category found with _id: ${body._id}`
        );
      }

      AuditLogs.info(
        req.user?.email,
        "Categories",
        "Delete",
        `Deleted category with _id: ${body._id}`
      );
      logger.info(
        req.user?.email,
        "Categories",
        "Delete",
        `Deleted category with _id: ${body._id}`
      );

      res.json(Response.successResponse({ success: true }));
    } catch (error) {
      AuditLogs.error(req.user?.email, "Categories", "Delete", error.message);
      logger.error(req.user?.email, "Categories", "Delete", error.message);
      let errorResponse = Response.errorResponse(error, req.user?.language);
      res.status(errorResponse.code).json(errorResponse);
    }
  }
);

router.post("/export", /*auth.checkRoles("category_export"),   */ async (req, res) => {
  try {
    let categories = await Categories.find({});
    let excel = excelExport.toExcel(
      ["NAME", "IS_ACTIVE", "USER_ID", "CREATED_AT", "UPDATED_AT"],
      ["name", "is_active", "created_by", "created_at", "update_at"],
      categories
    );
    let tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    let file_path = path.join(tmpDir, `categories_excel_${Date.now()}.xlsx`);
    fs.writeFileSync(file_path, excel, "utf-8");
    res.download(file_path, (err) => {
      if (err) {
        console.error("Error downloading the file:", err);
      } else {
        fs.unlinkSync(file_path); 
      }
    });

    AuditLogs.info(
      req.user?.email,
      "Categories",
      "Export Excel",
      "Export Excel"
    );
  } catch (error) {
    AuditLogs.error(req.user?.email, "Categories", "Export Excel", error.message);
    logger.error(req.user?.email, "Categories", "Export Excel", error.message);
    res.json(Response.errorResponse(error, req.user?.language));
  }
});

router.post("/import", auth.checkRoles("category_add"), upload, async (req, res) => {
  try {

      let file = req.file;
      let body = req.body;

      let rows = Import.fromExcel(file.path);

      for (let i = 1; i < rows.length; i++) {
        let [name, is_active, user, created_at, updated_at] = rows[i];
        if (name) {
          // Convert is_active to Boolean
          is_active = is_active === "TRUE" || is_active === "true" || is_active === 1;
          await Categories.create({
            name,
            is_active,
            created_by: req.user._id
          });
        }
      }

      res.status(Enum.HTTP_CODES.CREATED).json(Response.successResponse(req.body, Enum.HTTP_CODES.CREATED));

  } catch (err) {
      let errorResponse = Response.errorResponse(err);
      res.status(errorResponse.code).json(Response.errorResponse(err));
  }
})

module.exports = router;
