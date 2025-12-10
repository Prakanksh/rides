const express = require('express')
const router = express.Router()
const user = require('../../controllers/admins/user.controller')
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/admins/auth')

router
  .get('/', [verifyToken], user.adminUserList)
  .get('/search', [verifyToken], user.keywordFilter)
  .get('/details', [verifyToken], user.userDetail)
  .get('/orders', [verifyToken], user.userOrderList)
  .put('/status-change/:id', [verifyToken], user.statusChange)
   
  // .get('/unused-aws-url',[verifyToken], user.awsUrl)
module.exports = router
