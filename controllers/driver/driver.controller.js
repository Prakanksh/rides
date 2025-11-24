const { responseData } = require('../../helpers/responseData')
const driverService = require('../../services/driver/driver.services')

module.exports = {
  register: async (req, res) => {
    try {
      await driverService.register(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, false))
    }
  },

  updateProfile: async (req, res) => {
    try {
      await driverService.updateProfile(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, false))
    }
  }
}
