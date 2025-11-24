const { responseData } = require('../../helpers/responseData')
const Service = require('../../services/admins/faq.services')

module.exports = {
  addFAQ: async (req, res) => {
    try {
      await Service.addFAQ(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  reOrderFaq: async (req, res) => {
    try {
      await Service.reOrderFaq(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  updateFAQ: async (req, res) => {
    try {
      await Service.updateFAQ(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },

  deleteFAQ: async (req, res) => {
    try {
      await Service.deleteFAQ(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  listFAQ: async (req, res) => {
    try {
      await Service.listFAQ(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },


}
