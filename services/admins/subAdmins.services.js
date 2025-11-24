const Admin = require('../../models/admin.model')
const EmailTemplate = require('../../models/emailTemplate')
const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const fs = require('fs')
const ejs = require('ejs')
const bcrypt = require('bcryptjs')
const {
  sendEmailVerificationEmail,
  filterByStatus,
  filterByDateRange,
  getPaginationArray,
  filterByKeyword,
  sortData,
  generateRandomAlphanumeric,
  sendEmail
} = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const { default: mongoose } = require('mongoose')

module.exports = {
  subAdminList: async (req, res) => {
    try {
      let {
        page,
        pageSize,
        keyword,
        status,
        startDate,
        endDate,
        sortKey,
        sortType
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
        ...condition,
        role: 'subAdmin',
        _id: { $ne:mongoose.Types.ObjectId(req.user._id) }
      }
      const sortPattern = { createdAt: -1 }
      sortData(sortPattern, sortKey, sortType)
      console.log(sortPattern, "sortPattern")
      const aggregationPipeline = [
        { $addFields: { name: { $concat: ['$firstName', ' ', '$lastName'] } } },
        { $match: finalCondition },
        { $sort: sortPattern },
        {
          $addFields: {
            name: { $concat: ['$firstName', ' ', '$lastName'] },
            permissionCount: {
              $size: {
                $filter: {
                  input: '$permission',
                  //   cond: { $eq: [{ $toString: "$$artwork.artworkId" }, (userId ? userId: req)] },
                  cond: {
                    $and: [
                      {
                        $or: [
                          { $eq: ['$$permissions.add', true] },
                          { $eq: ['$$permissions.edit', true] },
                          { $eq: ['$$permissions.view', true] }
                        ]
                      },
                      { $ne: ['$$permissions.manager', 'dashboard'] }
                    ]
                  },
                  as: 'permissions'
                }
              }
            }
          }
        },

        {
          $project: {
            password: 0
          }
        },
        ...getPaginationArray(parseInt(page), limit)
      ]
      let queryResult = await Admin.aggregate(aggregationPipeline)

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
  addSubAdmin: async (req, res) => {
    try {
      let { firstName, lastName, email, address, mobile, countryCode } = req.body
      email = email.toLowerCase()
      const findRecord = await Admin.findOne({
        $or: [
          { email: email },
          { countryCode, mobile: mobile }
        ]
      })
      const url = `${process.env.REACT_APP_BASE_URL}/login`
      if (!isEmpty(findRecord)) {
        return res.json(
          responseData('ADMIN_SUB_ADMIN_ALREADY_EXISTS', {}, req, false)
        )
      }
      const salt = await bcrypt.genSalt(10)
      let subAdmin = {
        email,
        firstName,
        address,
        lastName,
        countryCode,
        mobile
      }
      if (req.body.permission) {
        subAdmin.permission = JSON.parse(req.body.permission)
      }
      const generatedPassword = generateRandomAlphanumeric(8)
      subAdmin.password = await bcrypt.hash(generatedPassword, salt)
      const result = await Admin.create(subAdmin)

      if (result) {
        const newResult = result.toJSON()
        delete newResult['password']

        let dataBody = {
          email: email.toLowerCase(),
          EMAIL: email.toLowerCase(),
          URL: url,
          PASSWORD: generatedPassword
        }

        sendEmail("new-subadmin-account", dataBody);
        return res.json(responseData('SUB_ADMIN_ADD_SUCCESS', {}, req, true))
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  editSubAdmin: async (req, res) => {
    try {
      let {
        firstName,
        lastName,
        permission,
        address,
        mobile,
        email,
        countryCode
      } = req.body
      let updateValues = {}
      email = email.toLowerCase()
      if (email) {
        const findRecordE = await Admin.findOne({
          _id: req.params.id
        })

        if (isEmpty(findRecordE)) {
          return res.json(responseData('SUB_ADMIN_NOT_FOUND', {}, req, false))
        }
        updateValues.email = email
        updateValues.mobile = mobile
        updateValues.countryCode = countryCode
      }
      if (!isEmpty(permission)) {
        updateValues.permission = JSON.parse(permission)
        updateValues.forceLogout = true
      }
      if (firstName) updateValues.firstName = firstName
      if (lastName) updateValues.lastName = lastName
      if (address) updateValues.address = address
      const result = await Admin.updateOne(
        { _id: req.params.id },
        { $set: updateValues }
      )
      if (result.modifiedCount) {
        return res.json(
          responseData('SUB_ADMIN_UPDATE_SUCCESS', updateValues, req, true)
        )
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  }
}
