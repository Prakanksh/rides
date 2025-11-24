const { responseData } = require('../../helpers/responseData')
const staticContentService = require('../../services/admins/staticcontent.services')
module.exports = {
  staticContentList: async (req, res) => {
    try {
      await staticContentService.staticContentList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  staticContentEdit: async (req, res) => {
    try {
      await staticContentService.staticContentEdit(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}
