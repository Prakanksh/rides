const EmailTemplate = require('../../models/emailTemplate')
const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const {sortData} = require('../../helpers/helper')

module.exports = {
  listEmailTemplates: async (req, res) => {
    try {
      let {
        sortKey,
        sortType
      } = req.query

      const sortPattern = { createdAt: -1 }
      sortData(sortPattern, sortKey, sortType)

      const aggregationPipeline = [
        { $sort: sortPattern }
      ]
      let queryResult = await EmailTemplate.aggregate(aggregationPipeline)
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
  editEmailTemplate: async (req, res) => {
    try {
      const { title, subject, description } = req.body
      const findRecord = await EmailTemplate.findOne({
        $and: [
          { _id: { $ne: req.params.id } }, // Exclude the current document being edited
          { title: { $regex: new RegExp(`^${title}$`, 'i') } } // Use ^ and $ to match the exact name
        ]
      })
      if (!isEmpty(findRecord)) {
        return res.json(
          responseData('EMAIL_TEMPLATE_ALREADY_EXIST', {}, req, false)
        )
      }
      const updateValues = {}
      if (title) updateValues.title = title
      if (subject) updateValues.subject = subject
      if (description) updateValues.description = description
      const emailTemplate = await EmailTemplate.findOneAndUpdate(
        { _id: req.params.id },
        updateValues,
        { new: true }
      )
      if (!isEmpty(emailTemplate)) {
        return res.json(
          responseData('EMAIL_TEMPLATE_UPDATED', emailTemplate, req, true)
        )
      } else {
        return res.json(responseData('NOT_FOUND', {}, req, false))
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  changeStatusEmailTemplate: async (req,res) => {
    try {
      const { status } = req.body 
      const resp = await EmailTemplate.updateOne(
        { _id: req.params.id },
        { $set: { status } }
      )
      if (resp.modifiedCount) {
        return res.json(responseData('EMAIL_TEMPLATE_UPDATE_SUCCESSFULLY', {}, req, true))
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  }
}
