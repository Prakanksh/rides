const express = require('express')
const controller = require('../../controllers/admins/testimonial.controller')
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/admins/auth')

const router = express.Router()
router.get('/', [verifyToken], controller.listTestimonials)
router.post('/', [verifyToken], controller.addTestimonials)
router.put('/:id', [verifyToken], controller.updateTestimonials)
router.delete('/:id', [verifyToken], controller.deleteTestimonials)
router.put('/status/:id/:status', [verifyToken], controller.updateStatus)
router.post('/reOrderTestimonial', [verifyToken], controller.reOrder)

module.exports = router
