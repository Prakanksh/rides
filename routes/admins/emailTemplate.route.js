const express = require('express')
const router = express.Router()
const EmailTemplate = require('../../controllers/admins/emailTemplate.controller')
const validationRule = require('../../validations/admins/auth')
const { verifyToken } = require('../../middlewares/verifyToken')

router.get('/', [verifyToken], EmailTemplate.listEmailTemplates)
router.put('/:id', [verifyToken], EmailTemplate.editEmailTemplate)
router.put('/change-status/:id',[verifyToken], EmailTemplate.changeStatusEmailTemplate )

module.exports = router
