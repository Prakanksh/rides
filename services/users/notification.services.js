const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const User = require('../../models/user.model')
const UserNotification = require('../../models/userNotifications.model')
const Notification = require('../../models/notification.model')

const {
  filterByKeyword,
  filterByStatus,
  filterByDateRange,
  sortData,
  getPaginationArray
} = require('../../helpers/helper')
const { default: mongoose } = require('mongoose')
const constant = require('../../helpers/constant')

module.exports = {
  notificationToggle: async (req, res) => {
    try {
      const { _id } = req.user
      let { status } = req.body
      const user = await User.findOne({ _id })
      if (isEmpty(user)) {
        responseData('USER_NOT_FOUND', {}, req, false)
      }
      await User.updateOne({ _id }, { notifications: status })
      return res.json(
        responseData('NOTIFICATION_STATUS_UPDATED', {}, req, true)
      )
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  notificationList: async (req, res) => {
    try {
      let {
        page,
        pageSize,
      } = req.query
      let whereStatement = {}
      let condition = {}

      page = parseInt(page) || 1
      const limit = parseInt(pageSize) || 10
      const finalCondition = {
        userId: mongoose.Types.ObjectId(req.user?._id),
        ...whereStatement,
        ...condition
      }
      const sortPattern = { createdAt: -1 }
      const aggregationPipeline = [
        { $match: finalCondition },
        { $sort: sortPattern },
        ...getPaginationArray(parseInt(page), limit)
      ]
      let queryResult = await Notification.aggregate(aggregationPipeline)
      await Notification.updateMany({ userId: req.user?._id }, { $set: { isRead: true }})
      return res.json(
        responseData(
          'GET_LIST',
          queryResult.length > 0
            ? queryResult[0]
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  }
}
