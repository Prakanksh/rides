const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middlewares/verifyToken");
const rideController = require("../../controllers/users/ride.controller");

router.post("/create", verifyToken, rideController.createRide);

router.get("/nearby", verifyToken, rideController.nearbyDrivers);

module.exports = router;
