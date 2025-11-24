const express = require('express')
const router = express.Router()
const { verifyToken } = require('../../middlewares/verifyToken')
const earningController = require('../../controllers/admins/earning.controller')

router.get('/', [verifyToken], earningController.listEarning)

module.exports = router
