const UserNotifications = require('../../models/userNotifications.model')
const { responseData } = require('../../helpers/responseData')
const User = require('../../models/user.model')
const { filterByDateRange, sendNotificationAndroidIos, getPaginationArray } = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const { isEmpty } = require('lodash')
module.exports = {
  sendNotification: async (req, res) => {
    try {
      const { title, description, sendTo, user } = req.body
      const data = {
        title,
        description,
        sendTo,
        user
      }
      const notification = await UserNotifications.create(data)
      res.json(responseData('NOTIFICATION_CREATED', notification, req, true))
      if (['user']?.includes(sendTo)) {
        const batchSize = 100
        let totalRecords;
        totalRecords = await countDocumentsResults(sendTo, totalRecords)
        let processedRecords = 0
        while (processedRecords < totalRecords) {
          const remainingRecords = totalRecords - processedRecords
          const currentBatchSize = Math.min(batchSize, remainingRecords)
          await sendNotificationConditions(sendTo, processedRecords, currentBatchSize, title, description)
          processedRecords += currentBatchSize
        }
      } else {
        const userDetails = await User.findOne({ _id: user })
        await sendNotificationAndroidIos(userDetails, title, description)
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  List: async (req, res) => {
    try {
      let {
        page,
        pageSize,
        startDate,
        endDate,
        sortBy,
        sortType,
        keyword,
        sendTo
      } = req.query

      page = parseInt(page) || 1
      const limit = parseInt(pageSize) || 10
      let whereStatement = {}

      if (keyword) {
        whereStatement['$or'] = [{ title: { $regex: keyword, $options: 'i' } }]
      }

      let condition = {}
      filterByDateRange(condition, startDate, endDate)

      if(sendTo){
        condition.sendTo = sendTo
      }

      let sortPattern = {
        createdAt: -1
      }

      if (sortBy && sortType) {
        delete sortPattern['createdAt']
        sortPattern[sortBy] = sortType == 'asc' ? 1 : -1
      }
      const aggregationPipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails',
            pipeline: [
              {
                $addFields: {
                  userType: "User"
                }
              }
            ]
          }
        },        
        // { $unwind: "$userData" },
        { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            userData: {
              $mergeObjects: ["$userDetails"]
            }
          }
        },
        {
          $project: {
            title: 1,
            description: 1,
            sendTo: 1,
            createdAt: 1,
            userData: {
              firstName : "$userData.firstName",
              lastName : "$userData.lastName",
              userType: "$userData.userType"
            },
          }
        },
        {
          $match: {
            ...condition,
            ...whereStatement
          }
        },
        {
          $sort: sortPattern
        },
        ...getPaginationArray(parseInt(page), limit)
      ]
      let finalData = await UserNotifications.aggregate(aggregationPipeline)
      return res.json(
        responseData(
          'GET_LIST',
          finalData.length > 0
            ? finalData[0]
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  }
}

const countDocumentsResults = async (sendTo, totalRecords) => {
  if(sendTo === 'user'){
    totalRecords = await User.countDocuments({
      status: 'active',
      isMobileVerified: 1,
      notifications: true
    })
    return totalRecords
  }
}

const sendNotificationConditions = async (sendTo, processedRecords, currentBatchSize, title, description) => {
  if(sendTo === 'user'){
    const results = await User.find({
      status: 'active',
      isMobileVerified: 1,
      notifications: true
    })
    .skip(processedRecords)
    .limit(currentBatchSize)
    for (const item of results) {
      const userData = await User.findOne({ _id: item?._id })
      await sendNotificationAndroidIos(userData, title, description)
    }
  }
}
