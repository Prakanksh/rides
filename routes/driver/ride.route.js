// routes/driver/ride.route.js
const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middlewares/verifyToken");
const rideController = require("../../controllers/ride/driverRide.controller");

router.get("/assigned", verifyToken, rideController.getAssignedRide);
router.post("/accept", verifyToken, rideController.acceptRide);
router.post("/arrived", verifyToken, rideController.arrivedAtPickup);
router.post("/start", verifyToken, rideController.startRide);
router.post("/complete", verifyToken, rideController.completeRide);

module.exports = router;
