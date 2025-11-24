const express = require('express')
const router = express.Router()
const controller = require('../../controllers/admins/subscription.controller')
const validationRule = require('../../validations/admins/subscription')
const { verifyToken } = require('../../middlewares/verifyToken')
router
  .post('/', [verifyToken], validationRule.validate('create-subscription'), controller.createSubscription)
  .get('/', [verifyToken], controller.subscriptionList)
  .post('/:id', [verifyToken], validationRule.validate('create-subscription'), controller.editSubscription)
  .get('/:id', [verifyToken], controller.viewSubscription)
  .put('/update-status/:id', [verifyToken], controller.statusChange)

module.exports = router