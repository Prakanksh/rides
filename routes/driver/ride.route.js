const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middlewares/verifyToken");
const rideController = require("../../controllers/driver/ride.controller");

// Driver accepts ride
router.post("/accept", verifyToken, rideController.acceptRide);

module.exports = router;
