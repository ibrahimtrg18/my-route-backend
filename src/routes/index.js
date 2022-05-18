const express = require("express");
const router = express.Router();

router.use("/api/business", require("./business"));
router.use("/api/employee", require("./employee"));
router.use("/api/admin", require("./admin"));

module.exports = router;
