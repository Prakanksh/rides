const notificationService = require('../../services/admins/notification.services')
const { responseData } = require('../../helpers/responseData')
module.exports = {
  list: async (req, res) => {
    try {
      await notificationService.List(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  sendNotification: async (req, res) => {
    try {
      await notificationService.sendNotification(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}
