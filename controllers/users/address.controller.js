const { responseData } = require('../../helpers/responseData')
const addressService = require('../../services/users/address.services')
module.exports = {
  list: async (req, res) => {
    try {
      await addressService.list(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  address: async (req, res) => {
    try {
      await addressService.address(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  updateAddress: async (req, res) => {
    try {
      await addressService.updateAddress(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  deleteAddress: async (req, res) => {
    try {
      await addressService.deleteAddress(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  changeDefaultAddress: async (req, res) => {
    try {
      await addressService.changeDefaultAddress(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}
