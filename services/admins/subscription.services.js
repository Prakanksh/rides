const Subscription = require('../../models/subscription.model')
const { responseData } = require('../../helpers/responseData')
const {
  filterByStatus,
  filterByDateRange,
  getPaginationArray,
  filterByKeyword,
  sortData,
  filterByUserType,
} = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const { default: mongoose } = require('mongoose')

module.exports = {
  createSubscription: async (req, res) => {
    try {
      let {
        name, description, price, duration, months
      } = req.body;
      name = name.trim().toLowerCase();
      description = description.trim()
      let descLimit = description.split(" ")
      if (descLimit.length > 300) {
        return res.json(responseData('LIMIT_REACHED', {}, req, false))
      }
      let subscriptionObj = {
        name, description, price, duration, months
      }
      const subscription = await Subscription.findOne({ name });
      if (subscription) {
        return res.json(responseData('SUBSCRIPTION_ALREADY_EXIST', {}, req, false))
      }
      await Subscription.create(subscriptionObj);
      return res.json(responseData('SUBSCRIPTION_CREATED', {}, req, true));
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  subscriptionList: async (req, res) => {
    try {
      let {
        page,
        pageSize,
        keyword,
        status,
        sortKey,
        sortType,
        startDate,
        endDate
      } = req.query
      let whereStatement = {}
      let condition = {}
      page = parseInt(page) || 1
      const limit = parseInt(pageSize) || 10
      filterByKeyword(whereStatement, keyword)
      filterByStatus(whereStatement, status)
      filterByDateRange(condition, startDate, endDate)
      sortKey = req.query?.sortBy ? req.query?.sortBy : sortKey
      const finalCondition = {
        ...whereStatement,
        ...condition
      }
      const sortPattern = { createdAt: -1 }
      sortData(sortPattern, sortKey, sortType)
      const aggregationPipeline = [
        { $match: finalCondition },
        { $sort: sortPattern },
        ...getPaginationArray(parseInt(page), limit)
      ]
      let queryResult = await Subscription.aggregate(aggregationPipeline)

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
  },

  editSubscription: async (req, res) => {
    try {
      const { id } = req.params;
      let {
        name, description, price, duration, months
      } = req.body;
      name = name.trim().toLowerCase();
      description = description.trim()
      const checkSubs = await Subscription.findOne({ name, _id: { $ne: id } });
      if (checkSubs) {
        return res.json(responseData('SUBSCRIPTION_ALREADY_EXIST', {}, req, false))
      }
      let descLimit = description.split(" ")
      if (descLimit.length > 300) {
        return res.json(responseData('LIMIT_REACHED', {}, req, false))
      }

      const updateData = {
        name, description, price, duration, months
      };

      const subscription = await Subscription.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!subscription) {
        return res.json(responseData('SUBSCRIPTION_NOT_FOUND', {}, req, false))
      }

      return res.json(responseData('SUBSCRIPTION_UPDATED', subscription, req, true));
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  viewSubscription: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.json(responseData('SUBSCRIPTION_NOT_FOUND', {}, req, false));
      }
      const subscription = await Subscription.findById(id);

      if (!subscription) {
        return res.json(responseData('SUBSCRIPTION_NOT_FOUND', {}, req, false));
      }

      return res.json(responseData('SUBSCRIPTION_FOUND', subscription, req, true));
    } catch (error) {
      console.log('error', error);
      return res.json(responseData('ERROR_OCCUR', error.message, req, false));
    }
  },
  statusChange: async (req, res) => {
    try {
      const { status } = req.body
      if (!['active', 'inactive'].includes(status)) {
        return res
          .status(400)
          .json(responseData('INVALID_STATUS', {}, req, false))
      }
      await Subscription.updateOne(
        { _id: req.params.id },
        { $set: { status } }
      )
      return res.json(responseData('STATUS_UPDATE', {}, req, true))

    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
};
