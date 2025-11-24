const { responseData } = require('../../helpers/responseData')
const service = require('../../services/admins/subscription.services')
module.exports = {
    createSubscription: async (req, res) => {
    try {
      await service.createSubscription(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
    subscriptionList: async (req, res) => {
    try {
      await service.subscriptionList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  editSubscription: async (req, res) => {
    try {
      await service.editSubscription(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  viewSubscription: async (req, res) => {
    try {
      await service.viewSubscription(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  statusChange: async (req, res) => {
    try {
      await service.statusChange(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}
