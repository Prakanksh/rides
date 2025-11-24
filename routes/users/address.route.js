const express = require('express')
const router = express.Router()
const validationRule = require('../../validations/users/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const {
  address,
  updateAddress,
  deleteAddress,
  changeDefaultAddress,
  list
} = require('../../controllers/users/address.controller')

router.get('/', [verifyToken], list)
router.post('/', [verifyToken], address)
router.put('/:id', [verifyToken], updateAddress)
router.delete('/:id', [verifyToken], deleteAddress)
router.put('/change-default-address/:id', [verifyToken], validationRule.validate('changeDefaultAddress'), changeDefaultAddress)

module.exports = router
