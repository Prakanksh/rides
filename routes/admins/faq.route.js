const express = require('express')
const controller = require('../../controllers/admins/faq.controller')
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/admins/auth')


const router = express.Router()
router.get('/', [verifyToken], controller.listFAQ)
router.put('/:id', [verifyToken], controller.updateFAQ)
router.delete('/:id', [verifyToken], controller.deleteFAQ)
router.post('/reOrderFaq', [verifyToken], controller.reOrderFaq)

router.post(
    '/',
    [verifyToken],
    validationRule.validate('addFAQ'),
    controller.addFAQ
)
module.exports = router
