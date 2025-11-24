const express = require('express')
const router = express.Router()
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const admin = require('../../controllers/admins/admin.controller')

router
  .get('/', [verifyToken], admin.adminProfile)
  .post('/login', validationRule.validate('adminLogin'), admin.adminLogin)
  .post('/forgot-password', validationRule.validate('forgot-password'), admin.adminForgotPassword)
  .post('/reset-password/:token', validationRule.validate('reset-password'), admin.adminResetPassword)
  .post('/change-password', [verifyToken], validationRule.validate('change-password'), admin.changePassword)
  .post('/edit-profile', [verifyToken], admin.editAdmin)
  .put('/change-status/:id', [verifyToken], admin.changeStatus)
  .post('/generatePreSignedUrl', [verifyToken], admin.generatePresignedURL)
  .get('/country-list', [verifyToken], admin.countryList)

module.exports = router
