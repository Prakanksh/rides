const StaticContent = require('../../models/staticcontent.model')
const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const {
  filterByDateRange,
  filterByStatus, sortData,
  filterByTitle
} = require('../../helpers/helper')

module.exports = {
  staticContentList: async (req, res) => {
    try {
      const {
        keyword,
        status,
        startDate,
        endDate,
        sortKey,
        sortType
      } = req.query

      const whereStatement = {}
      const condition = {}
      filterByTitle(whereStatement, keyword)
      filterByStatus(whereStatement, status)
      filterByDateRange(condition, startDate, endDate)
      const finalCondition = { ...whereStatement, ...condition }
      const sortPattern = { createdAt: -1 }
      sortData(sortPattern, sortKey, sortType)
      const aggregationPipeline = [
        { $match: finalCondition },
        { $sort: sortPattern }
      ]
      const queryResult = await StaticContent.aggregate(aggregationPipeline)
      return res.json(
        responseData(
          'GET_LIST',
          queryResult.length > 0
            ? queryResult
            : [],
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  staticContentEdit: async (req, res) => {
    try {
      const { title, content, metaTitle, metaKeyword, metaDescription, StaticContentImage } = req.body
      const newValue = {}
      if (title) newValue.title = title
      if (metaTitle) newValue.metaTitle = metaTitle
      if (metaKeyword) newValue.metaKeyword = metaKeyword
      if (metaDescription) newValue.metaDescription = metaDescription
      if (content) {
        const encode = await new Buffer.from(content).toString('base64')
        newValue.content = encode
      }
      if (StaticContentImage) {
        newValue.StaticContentImage = StaticContentImage
      }
      const staticContent = await StaticContent.findOneAndUpdate(
        { _id: req.params.id },
        { $set: newValue }
      )
      if (!isEmpty(staticContent)) {
        return res.json(responseData('UPDATE_SUCCESS', {}, req, true))
      } else {
        return res.json(responseData('STATIC_CONTENT_NOT_FOUND', {}, req, true))
      }
    } catch (error) {
      return res.json(responseData(error.message, [], req, false))
    }
  }
}
