const express = require("express");
const router = express.Router();
const Categories = require("../db/models/Categories");
const Response = require("../library/Response");
const CustomError = require("../library/Error");
const Enum = require("../config/Enum");
const AuditLogs = require("../library/AuditLogs");
const logger = require("../library/logger/loggerClass");

/* GET categories listing. */
router.get("/", async (req, res) => {
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
    res.json(Response.errorResponse(error));
  }
});

/* POST categories listing. */
router.post("/add", async (req, res) => {
  let body = req.body;
  try {
    if (!body.name)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "name field must be filled"
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

    res
      .status(Enum.HTTP_CODES.CREATED)
      .json(
        Response.successResponse({ success: true }, Enum.HTTP_CODES.CREATED)
      );
  } catch (error) {
    AuditLogs.error(req.user?.email, "Categories", "Add", error.message);
    logger.error(req.user?.email, "Categories", "Add", error.message);
    let errorResponse = Response.errorResponse(error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

/* PUT categories listing. */
router.put("/update", async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "_id field must be filled"
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
    let errorResponse = Response.errorResponse(error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

/* DELETE categories listing. */
router.delete("/delete", async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "_id field must be filled"
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
    let errorResponse = Response.errorResponse(error);
    res.status(errorResponse.code).json(errorResponse);
  }
});

module.exports = router;
