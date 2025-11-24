const express = require('express')
const router = express.Router()
const { sendNotification, list } = require('../../controllers/admins/notification.controller')
const { verifyToken } = require('../../middlewares/verifyToken')

router
  .post('/', [verifyToken], sendNotification)
  .get('/', [verifyToken], list)

module.exports = router
