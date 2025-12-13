const express = require('express')
const router = express.Router()
const { verifyToken } = require('../../middlewares/verifyToken')
const driver= require('../../controllers/admins/driver.controller')

router
  .post('/change-status', [verifyToken], driver.changeStatus)
   .put('/temp-delete',[verifyToken], driver.tempDelete)
   .patch('/status/:driverId/:docType', [verifyToken], driver.updateDocStatus)
   .patch('/vehicles/:driverId/status', [verifyToken], driver.updateVehicleStatus)
    .get('/all-drivers', [verifyToken],driver.getAllDrivers);

module.exports = router
