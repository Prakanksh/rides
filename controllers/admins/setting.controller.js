const { responseData } = require('../../helpers/responseData')
const settingService = require('../../services/admins/setting.services')

module.exports = {
 
  updateSetting: async (req, res) => {
    try {
      await settingService.updateSetting(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  settingData: async (req, res) => {
    try {
      await settingService.settingData(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}
