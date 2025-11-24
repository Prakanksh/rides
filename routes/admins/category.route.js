const express = require('express')
const router = express.Router()
const category = require('../../controllers/admins/category.controller')
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/admins/category')

router.post('/', [verifyToken], validationRule.validate('add-category'), category.addCategory)
router.get('/', [verifyToken], category.listCategory)
router.put('/re-order', [verifyToken], category.reOrderCategory)
router.put('/:id', [verifyToken], validationRule.validate('add-category'), category.updateCategory)
router.put('/status-change/:id', [verifyToken], validationRule.validate('status-category'), category.statusChange)


module.exports = router
