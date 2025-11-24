const express = require('express')
const router = express.Router()
const staticContent = require('../../controllers/admins/staticcontent.controller')
const { verifyToken } = require('../../middlewares/verifyToken')

router.get('/', [verifyToken], staticContent.staticContentList)
router.put('/:id', [verifyToken], staticContent.staticContentEdit)

module.exports = router
