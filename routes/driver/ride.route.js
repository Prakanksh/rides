// driver/ride.route.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middlewares/verifyToken");
const rideController = require("../../controllers/ride/driverRide.controller");

// Driver accepts a ride
router.post("/accept", verifyToken, rideController.acceptRide);

// Driver marks ARRIVED
router.post("/arrived", verifyToken, rideController.arrivedAtPickup);

// Driver starts ride (OTP later)
router.post("/start", verifyToken, rideController.startRide);

// Driver completes ride
router.post("/complete", verifyToken, rideController.completeRide);

module.exports = router;
