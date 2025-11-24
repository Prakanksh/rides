const express = require('express')
const router = express.Router()
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/admins/product')
const productController = require('../../controllers/admins/product.controller')

router.post('/', [verifyToken], productController.addProduct)
router.get('/', [verifyToken], productController.listProduct)
router.put('/:id', [verifyToken], productController.updateProduct)
router.put('/status-change/:id', [verifyToken], validationRule.validate('status'), productController.statusChange)
router.get('/rating-list/:id', [verifyToken], productController.productRatingList)
router.get('/sub-category-list/:id', [verifyToken], productController.listSubCategory)


module.exports = router