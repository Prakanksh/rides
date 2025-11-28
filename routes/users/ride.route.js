const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middlewares/verifyToken");
const rideController = require("../../controllers/users/ride.controller");

// Create a new ride
router.post("/create", verifyToken, rideController.createRide);
// Get nearby drivers
router.get("/nearby", verifyToken, rideController.nearbyDrivers);

// Get details of one ride
router.get("/get-one", verifyToken, rideController.getOneRide);

// Get user's active ride (requested / accepted / arrived / ongoing)
router.get("/active", verifyToken, rideController.getActiveRide);

// Cancel a ride
router.post("/cancel", verifyToken, rideController.cancelRide);

module.exports = router;
