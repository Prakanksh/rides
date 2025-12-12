const express = require('express')
const router = express.Router()
const { verifyToken } = require('../../middlewares/verifyToken')
const driver= require('../../controllers/admins/driver.controller')

router
  .post('/change-status', [verifyToken], driver.changeStatus)
   .put('/temp-delete',[verifyToken], driver.tempDelete)
    .patch('/:driverId/documents/:docType/status', [verifyToken], driver.updateDocStatus);
// /drivers/:driverId/documents/:docType/status
module.exports = router
