const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middlewares/verifyToken");
const driverController = require("../../controllers/driver/online.controller");

router.post("/go-online", verifyToken, driverController.goOnline);

module.exports = router;
