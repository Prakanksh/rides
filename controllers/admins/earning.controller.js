const { responseData } = require('../../helpers/responseData')
const earningServices = require('../../services/admins/earning.services')

module.exports = {
  listEarning: async (req, res) => {
    try {
      await earningServices.listEarning(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  }
}
