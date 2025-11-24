const Category = require('../../models/category.model')
const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const { handleListRequest } = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const { default: mongoose } = require('mongoose')
const Banner = require('../../models/banner.model')

module.exports = {
  listBanner: async (req, res) => {
    try {
      req.query.sortKey = 'sequence'
      req.query.sortType = 'asc'
      const aggregationPipeline = await handleListRequest(req.query)
      const queryResult = await Banner.aggregate([
        {
          $addFields: {
            file: {
              $cond: [
                { $eq: ['$file', ''] },
                '',
                { $concat: [process.env.AWS_MEDIA_URL, '$file'] }
              ]
            }
          }
        },
        ...aggregationPipeline,
      ]
      )

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
  updateBanner: async (req, res) => {
    try {
      let { id } = req.params
      const check = await Banner.findOne({ _id: id })
      if (!isEmpty(check)) {
        let { title, file } = req.body
        let updateObj = {
          title
        }
        if (file) updateObj.file = file
        const checkCategory = await Banner.findOne({
          _id: { $ne: id },
          title: { $regex: new RegExp(`^${title}$`, 'i') }
        })
        if (isEmpty(checkCategory)) {
          await Banner.findOneAndUpdate({ _id: id }, { $set: updateObj })
          return res.json(responseData('BANNER_UPDATED', {}, req, true))
        } else {
          return res.json(
            responseData('BANNER_ALREADY_EXIST', {}, req, false)
          )
        }
      } else {
        return res.json(responseData('ID_UNAVAILABLE', {}, req, true))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  addBanner: async (req, res) => {
    try {
      let { title, file } = req.body
      let createObj = {
        title,
        file,
      }
      const check = await Banner.findOne({
        title: { $regex: new RegExp(`^${title}$`, 'i') }
      })
      if (isEmpty(check)) {
        const category = await Banner.create(createObj)
        return res.json(responseData('BANNER_ADDED', category, req, true))
      } else {
        return res.json(responseData('BANNER_ALREADY_EXIST', {}, req, false))
      }
    } catch (err) {
      console.log('err: ', err)
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  statusChange: async (req, res) => {
    try {
      const { status } = req.body
      const resp = await Banner.updateOne(
        { _id: req.params.id },
        { $set: { status } }
      )
      if (resp.modifiedCount) {
        return res.json(responseData('BANNER_UPDATED', {}, req, true))
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  reOrderBanner: async (req, res) => {
    try {
      const { sequence } = req.body
      sequence.forEach(async bannerObject => {
        await Banner.findOneAndUpdate({ _id: mongoose.Types.ObjectId(bannerObject._id) }, { sequence: bannerObject.sequence })
      })
      return res.json(responseData('BANNER_SEQUENCE_UPDATED', {}, req, true))
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  deleteBanner: async (req, res) => {
    try {
      let { id } = req.params
      const check = await Banner.findOne({ _id: id })
      if (!isEmpty(check)) {
        await Banner.deleteOne({ _id: id })
        return res.json(responseData('BANNER_DELETED', {}, req, true))
      } else {
        return res.json(responseData('ID_UNAVAILABLE', {}, req, true))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
}
