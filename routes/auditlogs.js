const express = require("express");
const router = express.Router();
const Response = require("../library/Response");
const AuditLogs = require("../db/models/AuditLogs");
const moment = require("moment");
const auth = require("../library/auth")();
const i18n = new (require("../library/i18n"))(process.env.DEFAULT_LANG);


router.all("*", auth.authenticate(),(req,res,next)=>{
    next();
} )

router.post('/',auth.checkRoles("auditlogs_view") ,async (req, res) => {
    let body = req.body;
    let query = {};
    let skip =0;
    let limit = 500;
    try {

        if (typeof body.skip !== "number" ) skip=0;
        if (typeof body.limit !== "number" || body.limit>500 ) limit =500;
        if (body.begin_date && body.end_date) {
            query.created_at = {
                $gte: moment(body.begin_date),
                $lte: moment(body.end_date)
            };
        } else {
            query.created_at = {
                $gte: moment().subtract(1, "day").startOf("day").toDate(),
                $lte: moment().toDate()
            };
        }

        let auditLogs = await AuditLogs.find(query)
            .limit(limit)
            .skip(body.skip || skip)
            .sort({ created_at : -1 });
        res.json(Response.successResponse(auditLogs));
    } catch (error) {
        let errorResponse = Response.errorResponse(error,req.user?.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

module.exports = router;
