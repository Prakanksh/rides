const Faq = require('../../models/faq.model')
const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const {
  handleListRequest
} = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const { default: mongoose } = require('mongoose')

module.exports = {
  listFAQ: async (req, res) => {
    try {
      req.query.sortKey = 'sequence'
      req.query.sortType = 'asc'
      const aggregationPipeline = await handleListRequest(req.query)
      const queryResult = await Faq.aggregate(aggregationPipeline)

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
  updateFAQ: async (req, res) => {
    try {
      let { id } = req.params
      const check = await Faq.findOne({ _id: id })
      if (!isEmpty(check)) {
        const { title, content } = req.body
        const updateDetails = {}
        if (title) updateDetails.title = title
        if (content) updateDetails.content = content
        await Faq.findOneAndUpdate({ _id: id }, { $set: updateDetails })
        return res.json(responseData('FAQ_UPDATED', {}, req, true))
      } else {
        return res.json(responseData('ID_UNAVAILABLE', {}, req, true))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  addFAQ: async (req, res) => {
    try {
      const { title, content } = req.body
      let info = {
        title,
        content
      }
      const check = await Faq.findOne({ title })
      if (isEmpty(check)) {
        const faq = await Faq.create(info)
        return res.json(responseData('FAQ_CREATED', faq, req, true))
      } else {
        return res.json(responseData('FAQ_EXIST', {}, req, false))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  reOrderFaq: async (req, res) => {
    try {
      const { sequence } = req.body
      sequence.forEach(async faqObject => {
        await Faq.findOneAndUpdate({ _id: mongoose.Types.ObjectId(faqObject._id) }, { sequence: faqObject.sequence })
      })
      return res.json(responseData('FAQ_SEQUENCE_UPDATED', {}, req, true))
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  deleteFAQ: async (req, res) => {
    try {
      let { id } = req.params
      const check = await Faq.findOne({ _id: id })
      if (!isEmpty(check)) {
        await Faq.findOneAndDelete({ _id: id })
        return res.json(responseData('FAQ_DELETED', {}, req, true))
      } else {
        return res.json(responseData('ID_UNAVAILABLE', {}, req, true))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  }
}
