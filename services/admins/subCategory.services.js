const Category = require('../../models/category.model')
const SubCategory = require('../../models/subCategory.model')
const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const {
  filterByStatus,
  filterByDateRange,
  filterByKeyword,
  filterByDynamicKey,
  sortData,
  getPaginationArray
} = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const { ObjectId } = require('mongodb');

module.exports = {
  listSubCategory: async (req, res) => {
    try {
      let { page, pageSize, startDate, endDate, sortKey, sortType,  status, category, keyword } = req.query
      page = Number(page) || 1
      pageSize = Number(pageSize) || 10
      const whereStatement = {}
      const condition = {}
      filterByKeyword(whereStatement, keyword)
      filterByDateRange(condition, startDate, endDate)
      filterByStatus(whereStatement, status)
      filterByDynamicKey(whereStatement, 'category', category ? ObjectId(category): "")
      const finalCondition = {
        ...whereStatement,
        ...condition
      }
      const sortPattern = { createdAt: -1 }
      sortData(sortPattern, sortKey, sortType)
      const queryResult = await SubCategory.aggregate([
        { $match: finalCondition },
        { $sort: sortPattern },
        {
          $lookup: {
            from: 'categories',
            as: 'categoryDetails',
            let: { categoryId: '$category' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$$categoryId', '$_id']
                  }
                }
              },
              {
                $project: {
                  status: 1,
                  name: 1
                }
              }
            ]
          }
        },
        {
          $unwind: {
            path: '$categoryDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        ...getPaginationArray(page, pageSize)
      ])
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
  updateSubCategory: async (req, res) => {
    try {
      let { id } = req.params
      const check = await SubCategory.findOne({ _id: id })
      if (!isEmpty(check)) {
        let { name, category, unit } = req.body
        const updateObj = {
          name,
          category
        }

        if (unit) updateObj.unit = unit

        const checkSubCategory = await SubCategory.findOne({
          _id: { $ne: id },
          name: { $regex: new RegExp(`^${name}$`, 'i')},
          category
        })
        if (isEmpty(checkSubCategory)) {
          await SubCategory.findOneAndUpdate({ _id: id }, { $set: updateObj })
          return res.json(responseData('SUB_CATEGORY_UPDATED', {}, req, true))
        } else {
          return res.json(
            responseData('SUB_CATEGORY_ALREADY_EXIST', {}, req, false)
          )
        }
      } else {
        return res.json(responseData('ID_UNAVAILABLE', {}, req, true))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  addSubCategory: async (req, res) => {
    try {
      let { category, name, unit } = req.body
      let createObj = {
        unit,
        name,
        category
      }
      const check = await SubCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i')}, category })
      if (isEmpty(check)) {
        const subCategory = await SubCategory.create(createObj)
        return res.json(responseData('SUB_CATEGORY_ADDED', subCategory, req, true))
      } else {
        return res.json(
          responseData('SUB_CATEGORY_ALREADY_EXIST', {}, req, false)
        )
      }
    } catch (err) {
      console.log('err: ', err)
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  statusChange: async (req, res) => {
    try {
      const { status } = req.body
      const resp = await SubCategory.updateOne(
        { _id: req.params.id },
        { $set: { status } }
      )
      if (resp.modifiedCount) {
        return res.json(
          responseData('SUB_CATEGORY_STATUS_UPDATED', {}, req, true)
        )
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  listCategory: async (req, res) => {
    try {
      const resp = await Category.find({status: "active"}).sort({ name: 1 })
      return res.json(responseData('GET_LIST', resp, req, true))
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  }
}
