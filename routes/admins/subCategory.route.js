const express = require('express')
const router = express.Router()
const subCategory = require('../../controllers/admins/subCategory.controller')
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/admins/subCategory')

router.post('/', [verifyToken], validationRule.validate('add'), subCategory.addSubCategory)
router.get('/', [verifyToken], subCategory.listSubCategory)
router.put('/:id', [verifyToken], validationRule.validate('edit'), subCategory.updateSubCategory)
router.put('/status-change/:id', [verifyToken], validationRule.validate('status'), subCategory.statusChange)
router.get('/category-list', [verifyToken], subCategory.listCategory)


module.exports = router