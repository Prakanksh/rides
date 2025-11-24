const Category = require('../../models/category.model')
const SubCategory = require('../../models/subCategory.model')
const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const { handleListRequest } = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const { default: mongoose } = require('mongoose')

module.exports = {
  listCategory: async (req, res) => {
    try {
      req.query.sortKey = 'sequence'
      req.query.sortType = 'asc'
      const aggregationPipeline = await handleListRequest(req.query)
      const queryResult = await Category.aggregate([
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
  updateCategory: async (req, res) => {
    try {
      let { id } = req.params
      const check = await Category.findOne({ _id: id })
      if (!isEmpty(check)) {
        let { categoryType, name, file, colorCode } = req.body
        let updateObj = {
          categoryType,
          name 
        }
        if(file) updateObj.file = file
        if(colorCode) updateObj.colorCode = colorCode
        const checkCategory = await Category.findOne({
          _id: { $ne: id },
          categoryType,
          name: { $regex: new RegExp(`^${name}$`, 'i') }
        })
        if (isEmpty(checkCategory)) {
          await Category.findOneAndUpdate({ _id: id }, { $set: updateObj })
          return res.json(responseData('CATEGORY_UPDATED', {}, req, true))
        } else {
          return res.json(
            responseData('CATEGORY_ALREADY_EXIST', {}, req, false)
          )
        }
      } else {
        return res.json(responseData('ID_UNAVAILABLE', {}, req, true))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  addCategory: async (req, res) => {
    try {
      let { categoryType, name, file, colorCode } = req.body
      let createObj = {
        categoryType,
        name,
        file,
        colorCode
      }
      const check = await Category.findOne({
        categoryType,
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      })
      if (isEmpty(check)) {
        const category = await Category.create(createObj)
        return res.json(responseData('CATEGORY_ADDED', category, req, true))
      } else {
        return res.json(responseData('CATEGORY_ALREADY_EXIST', {}, req, false))
      }
    } catch (err) {
      console.log('err: ', err)
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  statusChange: async (req, res) => {
    try {
      const { status } = req.body 
      const resp = await Category.updateOne(
        { _id: req.params.id },
        { $set: { status } }
      )
      if (resp.modifiedCount) {
        await SubCategory.updateMany({ category: req.params.id }, { $set: { status } })
        return res.json(responseData('CATEGORY_STATUS_UPDATED', {}, req, true))
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  reOrderCategory: async (req, res) => {
    try {
      const { sequence } = req.body
      sequence.forEach(async categoryObject => {
        await Category.findOneAndUpdate({ _id: mongoose.Types.ObjectId(categoryObject._id) }, { sequence: categoryObject.sequence })
      })
      return res.json(responseData('CATEGORY_SEQUENCE_UPDATED', {}, req, true))
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
}
