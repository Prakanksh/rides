const Faq = require('../../models/faq.model')
const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const StaticContent = require('../../models/staticcontent.model')
module.exports = {
  getStaticContentBySlug: async (req, res) => {
    try {
      let slug = req.query.slug
      if (isEmpty(slug)) {
        return res.json(responseData('SLUG_EMPTY', {}, req, false))
      }
      let queryResult = await StaticContent.findOne({ slug })
      if (!queryResult || !queryResult?.content) {
        return res.json(responseData('CONTENT_NOT_FOUND', {}, req, false))
      }
      return res.json(
        responseData(
          'CONTENT_LIST',
          { content: Buffer.from(queryResult.content, 'base64').toString('ascii') },
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  getStaticSlug: async (req, res) => {
    try {
      let queryResult = await StaticContent.find({})
        .select('content slug title')
        .lean()

      queryResult = queryResult.map((item) => {
        return {
          ...item,
          content: Buffer.from(item.content, 'base64').toString('ascii')
        }
      })
      return res.json(responseData('GET_LIST', queryResult, req, true))
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  getFaq: async (req, res) => {
    try {

      const query = await Faq.find({ status: 'active'})
      if (!isEmpty(query)) {
        return res.json(responseData('GET_LIST', query, req, true))
      } else {
        return res.json(responseData('NOT_FOUND', {}, req, true))
      }
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
}