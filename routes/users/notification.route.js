const express = require('express')
const router = express.Router()
const {
  notificationToggle,
  notificationList
} = require('../../controllers/users/notification.controller')
const { verifyToken } = require('../../middlewares/verifyToken')

router
  .post('/notification-toggle', [verifyToken], notificationToggle)
  .get('/', [verifyToken], notificationList)

module.exports = router
