const express = require('express');
const router = express.Router();
const rideController = require('../../controllers/ride/ride.controller');
const { verifyToken } = require('../../middlewares/verifyToken');

// Rider creates a ride request
router.post('/create', verifyToken, rideController.createRide);

module.exports = router;
