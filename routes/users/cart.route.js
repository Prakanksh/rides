const express = require('express')
const router = express.Router()
const cartController = require('../../controllers/users/cart.controller')
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/users/auth')

router.get('/list', [verifyToken], cartController.addToCartList)
router.post('/add', [verifyToken], validationRule.validate('addToCart'), cartController.createCart)

module.exports = router
