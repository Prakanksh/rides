const express = require('express')
const router = express.Router()
const controller = require('../../controllers/admins/subAdmin.controller')
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')

router
  .get('/', [verifyToken], controller.subAdminList)
  .post('/', [verifyToken], validationRule.validate('addSubAdmin'), controller.addSubAdmin)
  .put('/:id', [verifyToken], controller.editSubAdmin)

module.exports = router
