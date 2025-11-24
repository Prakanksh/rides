const { responseData } = require('../../helpers/responseData')
const service = require('../../services/admins/subAdmins.services')
module.exports = {
  subAdminList: async (req, res) => {
    try {
      await service.subAdminList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  addSubAdmin: async (req, res) => {
    try {
      await service.addSubAdmin(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  editSubAdmin: async (req, res) => {
    try {
      await service.editSubAdmin(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}
