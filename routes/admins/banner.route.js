const express = require('express')
const router = express.Router()
const { verifyToken } = require('../../middlewares/verifyToken')
const validationRule = require('../../validations/admins/banner')
const banner = require('../../controllers/admins/banner.controller')

router.post('/', [verifyToken], validationRule.validate('add-banner'), banner.addBanner)
router.get('/', [verifyToken], banner.listBanner)
router.put('/re-order', [verifyToken], banner.reOrderBanner)
router.put('/:id', [verifyToken], validationRule.validate('add-banner'), banner.updateBanner)
router.put('/:id', [verifyToken], banner.deleteBanner)
router.put('/status-change/:id', [verifyToken], validationRule.validate('status-banner'), banner.statusChange)

module.exports = router
