const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middlewares/verifyToken");
const rideController = require("../../controllers/ride/driverRide.controller");

router.get("/assigned", verifyToken, rideController.getAssignedRide);
router.get("/available", verifyToken, rideController.getAvailableRides);
router.post("/accept", verifyToken, rideController.acceptRide);
router.post("/arrived", verifyToken, rideController.arrivedAtPickup);
router.post("/start", verifyToken, rideController.startRide);
router.post("/reachedDestination", verifyToken, rideController.reachedDestination);
router.post("/receivedPayment", verifyToken, rideController.receivedPayment);
router.post("/cancel", verifyToken, rideController.cancelRide);

module.exports = router;
