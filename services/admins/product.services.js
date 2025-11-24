const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const {
  checkIfRecordExists,
  handleEditFieldFunction,
  sortData,
  filterByKeyword,
  filterByStatus,
  filterByDateRange,
  getPaginationArray
} = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const Product = require('../../models/product.model')
const SubCategory = require('../../models/subCategory.model')
const { default: mongoose } = require('mongoose')

module.exports = {
  listProduct: async (req, res) => {
    try {
      let {
        page,
        pageSize,
        category,
        subCategory,
        keyword,
        status,
        startDate,
        endDate,
        sortKey,
        sortType
      } = req.query
      const whereStatement = {}
      const condition = {}

      page = parseInt(page) || 1
      const limit = parseInt(pageSize) || 10
      filterByKeyword(whereStatement, keyword)
      filterByStatus(whereStatement, status)
      filterByDateRange(condition, startDate, endDate)
      if (category) {
        whereStatement.category = mongoose.Types.ObjectId(category)
      }
      if (subCategory) {
        whereStatement.subCategory = mongoose.Types.ObjectId(subCategory)
      }
      const finalCondition = {
        ...whereStatement,
        ...condition
      }
      const sortPattern = { createdAt: -1 }
      sortData(sortPattern, sortKey, sortType)
      const aggregationPipeline = [
        { $match: finalCondition },
        { $sort: sortPattern },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryDetails'
          }
        },
        {
          $lookup: {
            from: 'subcategories',
            localField: 'subCategory',
            foreignField: '_id',
            as: 'subCategoryDetails'
          }
        },
        {
          $unwind: {
            path: '$categoryDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$subCategoryDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            images: {
              $map: {
                input: '$images',
                as: 'file',
                in: {
                  $cond: [
                    { $eq: ['$$file.value', ''] }, // Check if the value is empty
                    '$$file', // If it's empty, keep the object as is
                    {
                      $mergeObjects: [
                        '$$file', // Retain the original object
                        {
                          value: {
                            $concat: [process.env.AWS_MEDIA_URL, '$$file.value']
                          }
                        } // Append the URL to the value
                      ]
                    }
                  ]
                }
              }
            },
            file: {
              $cond: [
                { $eq: ['$file', ''] },
                '',
                { $concat: [process.env.AWS_MEDIA_URL, '$file'] }
              ]
            }
          }
        },
        ...getPaginationArray(parseInt(page), limit)
      ]
      const queryResult = await Product.aggregate(aggregationPipeline)
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
  listSubCategory: async (req, res) => {
    try {
      const { id } = req.params
      const resp = await SubCategory.find({ category: id }).sort({ name: 1 })

      return res.json(responseData('GET_LIST', resp, req, true))
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  updateProduct: async (req, res) => {
    try {
      let { id } = req.params
      const check = await Product.findOne({ _id: id })
      if (!isEmpty(check)) {
        let {
          images,
          description,
          fullName,
          subCategory,
          category,
          categoryType,
          file
        } = req.body

        const updateObj = {}
        handleEditFieldFunction(updateObj, 'images', images)
        handleEditFieldFunction(updateObj, 'description', description)
        handleEditFieldFunction(updateObj, 'file', file)
        handleEditFieldFunction(updateObj, 'fullName', fullName)
        handleEditFieldFunction(updateObj, 'subCategory', subCategory)
        handleEditFieldFunction(updateObj, 'category', category)
        handleEditFieldFunction(updateObj, 'categoryType', categoryType)
        if (
          await checkIfRecordExists(
            Product,
            { fullName, subCategory, category, categoryType, _id: { $ne: id } },
            'PRODUCT_EXIST',
            req,
            res
          )
        )
          return
        await Product.findOneAndUpdate({ _id: id }, { $set: updateObj })
        return res.json(responseData('PRODUCT_UPDATE_SUCCESS', {}, req, true))
      } else {
        return res.json(responseData('ID_UNAVAILABLE', {}, req, false))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  addProduct: async (req, res) => {
    try {
      let {
        images,
        description,
        fullName,
        subCategory,
        category,
        categoryType,
        file
      } = req.body
      if (
        await checkIfRecordExists(
          Product,
          { fullName, subCategory, category, categoryType },
          'PRODUCT_EXIST',
          req,
          res
        )
      )
        return
      const createObj = {
        images,
        description,
        fullName,
        subCategory,
        category,
        categoryType,
        file
      }
      const resp = await Product.create(createObj)
      console.log('resp', resp)

      res.json(responseData('PRODUCT_ADD_SUCCESS', {}, req, true))
    } catch (err) {
      console.log('err: ', err)
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  statusChange: async (req, res) => {
    try {
      const { status } = req.body
      const resp = await Product.updateOne(
        { _id: req.params.id },
        { $set: { status } }
      )
      if (resp.modifiedCount) {
        return res.json(responseData('PRODUCT_STATUS_UPDATED', {}, req, true))
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  productRatingList: async (req, res) => {
    try {
      let { sortKey, sortType, startDate, endDate } = req.query
      console.log(sortKey, sortType, startDate, endDate)
      const docs = [
        {
          _id: '66b9d1ca874b1c1f2e616c52',
          userId: '1011',
          name: 'John Doe 1',
          rating: 3.5,
          description: 'Nice',
          createdAt: '2024-08-12T09:11:38.157Z'
        },
        {
          _id: '66b9d1ca874b1c1f2e616c52',
          userId: '1012',
          name: 'John Doe 2', //
          rating: 2, //
          description: 'Nice',
          createdAt: '2024-08-12T09:11:38.157Z'
        },
        {
          _id: '66b9d1ca874b1c1f2e616c52',
          userId: '1013',
          name: 'John Doe 3',
          rating: 5,
          description: 'Nice',
          createdAt: '2024-08-12T09:11:38.157Z'
        },
        {
          _id: '66b9d1ca874b1c1f2e616c52',
          userId: '1014', //
          name: 'John Doe 4',
          rating: 4.5,
          description: 'Nice',
          createdAt: '2024-08-12T09:11:38.157Z'
        }
      ]
      const queryResultData = [
        {
          docs: docs,
          totalDocsCount: 73,
          limit: 10,
          page: 1,
          totalPages: 8
        }
      ]
      return res.json(
        responseData(
          'GET_LIST',
          queryResultData.length > 0
            ? queryResultData[0]
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
