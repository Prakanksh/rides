const dashboardService = require('../../services/admins/dashboard.services')
const { responseData } = require('../../helpers/responseData')

module.exports = {
  dashboard: async (req, res) => {
    try {
      await dashboardService.dashboard(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  graphManager: async (req, res) => {
    try {
      await dashboardService.graphManager(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  }
}
