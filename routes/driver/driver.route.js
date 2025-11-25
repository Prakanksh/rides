const express = require('express')
const router = express.Router()

const { verifyToken } = require('../../middlewares/verifyToken')
const driverController = require('../../controllers/driver/driver.controller')


// Register new driver
router.post('/register', driverController.register)

// Update driver profile (allowed only when logged in)
router.put('/update-profile', verifyToken, driverController.updateProfile)
router.post("/update-location", verifyToken, driverController.updateLocation);


module.exports = router
