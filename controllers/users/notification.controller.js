const notificationService = require('../../services/users/notification.services')
const { responseData } = require('../../helpers/responseData')
module.exports = {
  notificationToggle: async (req, res) => {
    try {
      await notificationService.notificationToggle(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  notificationList: async (req, res) => {
    try {
      await notificationService.notificationList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}
