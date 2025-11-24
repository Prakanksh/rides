const express = require('express')
const router = express.Router()
const { verifyToken } = require('../../middlewares/verifyToken')
const { updateSetting, settingData } = require('../../controllers/admins/setting.controller')
router
  .put('/', [verifyToken], updateSetting)
  .get('/', [verifyToken], settingData)
module.exports = router
