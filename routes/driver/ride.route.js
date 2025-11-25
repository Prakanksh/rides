const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middlewares/verifyToken");
const rideController = require("../../controllers/ride/driverRide.controller");

// Fetch assigned ride
router.get("/assigned", verifyToken, rideController.getAssignedRide);

// Accept ride
router.post("/accept", verifyToken, rideController.acceptRide);

// Driver arrived
router.post("/arrived", verifyToken, rideController.arrivedAtPickup);

// Start ride
router.post("/start", verifyToken, rideController.startRide);

// Complete ride
router.post("/complete", verifyToken, rideController.completeRide);

module.exports = router;
