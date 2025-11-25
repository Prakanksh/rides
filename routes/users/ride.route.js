const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middlewares/verifyToken");
const rideController = require("../../controllers/user/ride.controller");

// Create new ride
router.post("/create", verifyToken, rideController.createRide);

// User fetches nearby drivers
router.get("/nearby", verifyToken, rideController.getNearbyDrivers);

module.exports = router;
