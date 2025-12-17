const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middlewares/verifyToken");
const rideController = require("../../controllers/users/ride.controller");

// Create a new ride
router.post("/estimate", verifyToken, rideController.estimateRide);

router.post("/create/:rideId", verifyToken, rideController.createRide);
router.post("/apply-promo", verifyToken, rideController.applyPromo);

// Get nearby drivers
router.get("/nearby", verifyToken, rideController.nearbyDrivers);

// Get details of one ride
router.get("/get-one", verifyToken, rideController.getOneRide);

// Get user's active ride (requested / accepted / arrived / ongoing)
router.get("/active", verifyToken, rideController.getActiveRide);

// Cancel a ride
router.post("/cancel", verifyToken, rideController.cancelRide);

// Schedule a ride
router.post("/schedule/:rideId", verifyToken, rideController.scheduleRide);

// Reschedule a ride
router.put("/reschedule/:rideId", verifyToken, rideController.rescheduleRide);

// Get scheduled rides
router.get("/scheduled", verifyToken, rideController.getScheduledRides);

module.exports = router;
