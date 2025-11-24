const Admin = require('../../models/admin.model')
const EmailTemplate = require('../../models/emailTemplate')
const fs = require('fs')
const { isEmpty } = require('lodash')
const {
  responseData,
  generateAuthToken
} = require('../../helpers/responseData')
const bcrypt = require('bcryptjs')
const { v4 } = require('uuid')
const {
  genSalt,
  genHash,
  sendEmailVerificationEmail,
  getModelByType,
  generatePutPresignedUrl,
  sendEmail
} = require('../../helpers/helper')
const ejs = require('ejs')
const constant = require('../../helpers/constant')
const Country = require('../../models/countries.model')

module.exports = {
  adminLogin: async (req, res) => {
    try {
      let { email, password } = req.body
      email = email?.toLowerCase()
      let admin = await Admin.findOne({ email })

      if (!isEmpty(admin)) {
        if (admin?.status === constant.status.inactive) {
          return res.json(responseData('ACCOUNT_INACTIVE', {}, req, false))
        }
        bcrypt.compare(password, admin.password, async (err, response) => {
          if (err)
            return res.json(responseData('ADMIN_INVALID_LOGIN', {}, req, false))
          if (!response)
            return res.json(responseData('ADMIN_INVALID_LOGIN', {}, req, false))
          const adminData = admin.toJSON()
          delete adminData['password']
          adminData.fullName = adminData.firstName + ' ' + adminData.lastName
          let deviceTokens = generateAuthToken(adminData)
          await Admin.findOneAndUpdate(
            { _id: admin._id },
            { forceLogout: false }
          )
          return res.json(
            responseData(
              'ACCOUNT_LOGIN',
              { ...adminData, ...deviceTokens },
              req,
              true
            )
          )
        })
      } else {
        return res.json(responseData('ADMIN_NOT_FOUND', {}, req, false))
      }
    } catch (error) {
      console.log('Error', error.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },
  adminProfile: async (req, res) => {
    try {
      const { _id } = req.user
      const adminData = await Admin.findOne({ _id }).select({ password: 0 })
      if (!isEmpty(adminData)) {
        return res.json(responseData('PROFILE_DETAILS', adminData, req, true))
      } else {
        return res.json(responseData('PROFILE_DETAILS', {}, req, false))
      }
    } catch (error) {
      console.log('Error', error.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },
  adminForgotPassword: async (req, res) => {
    try {
      const email = req.body.email.toLowerCase()
      const admin = await Admin.findOne({ email })
      if (!isEmpty(admin)) {
        const resetToken = v4().toString().replace(/-/g, '')
        const link = `${process.env.RESET_PASSWORD_LINK}/${resetToken}`
        let dataBody = {
          email: email,
          EMAIL: email,
          LINK: link,
          FIRSTNAME: admin.firstName
        }
        sendEmail("forgot-password", dataBody);

        await Admin.findOneAndUpdate({ email }, { token: resetToken })
        return res.json(responseData('EMAIL_SENT', {}, req, true))
      } else {
        return res.json(responseData('ADMIN_EMAIL_NOT_FOUND', {}, req, false))
      }
    } catch (err) {
      console.log('Error', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },
  adminResetPassword: async (req, res) => {
    try {
      const { password } = req.body
      const token = req.params.token

      const resetToken = await Admin.findOne({ token })
      const passwordMatch = await bcrypt.compare(password, resetToken?.password)
      if (passwordMatch) {
        return res.json(responseData('PASSWORD_SAME_ERORR', {}, req, false))
      }
      if (!isEmpty(resetToken)) {
        let salt = await genSalt(10)
        let hash = await genHash(password, salt)
        if (!isEmpty(hash)) {
          await Admin.findOneAndUpdate(
            { _id: resetToken._id },
            { password: hash, token: null, forceLogout: true }
          )
          return res.json(responseData('PASSWORD_CHANGED', {}, req, true))
        } else {
          return res.json(responseData('ERROR_OCCUR', {}, req, false))
        }
      } else {
        return res.json(responseData('LINK_INVALID', {}, req, false))
      }
    } catch (err) {
      console.log('Error', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },
  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body
      const { _id } = req.user

      const admin = await Admin.findOne({ _id })
      const isPasswordMatch = await bcrypt.compare(oldPassword, admin.password)

      if (!isPasswordMatch) {
        return res.json(responseData('INVALID_OLD_PASSWORD', {}, req, false))
      }

      if (oldPassword === newPassword) {
        return res.json(responseData('PASSWORD_SAME_ERROR', {}, req, false))
      }

      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash(newPassword, salt)

      if (!hash) {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }

      await Admin.findOneAndUpdate(
        { _id },
        {
          password: hash,
          isPasswordSet: true,
          forceLogout: true
        }
      )

      return res.json(responseData('PASSWORD_CHANGED', {}, req, true))
    } catch (err) {
      console.log('Error', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },
  editAdmin: async (req, res) => {
    try {
      const { fullName, profilePic } = req.body
      const { _id } = req.user

      const updateValues = {}
      if (profilePic) {
        updateValues.profilePic = profilePic
      }

      if (fullName) {
        function splitFullName(fullNameAdmin) {
          const firstSpaceIndex = fullNameAdmin?.indexOf(' ')
          if (firstSpaceIndex === -1) {
            return {
              firstName: fullNameAdmin,
              lastName: ''
            }
          }

          const firstName = fullNameAdmin?.substring(0, firstSpaceIndex)
          const lastName = fullNameAdmin?.substring(firstSpaceIndex + 1)

          return {
            firstName: firstName,
            lastName: lastName
          }
        }
        const splitName = splitFullName(fullName)
        updateValues.firstName = splitName?.firstName
        updateValues.lastName = splitName?.lastName
      }
      updateValues.lastUpdate = new Date()
      const adminUpdate = await Admin.findOneAndUpdate(
        { _id },
        { $set: updateValues },
        { new: true }
      )
      if (adminUpdate) {
        const adminData = adminUpdate.toJSON()
        delete adminData['password']
        adminData.fullName = adminData.firstName + ' ' + adminData.lastName
        let deviceTokens = generateAuthToken(adminData)
        return res.json(
          responseData(
            'ADMIN_UPDATE_SUCCESS',
            { ...adminData, ...deviceTokens },
            req,
            true
          )
        )
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (err) {
      console.log('Error', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },
  notificationToggle: async (req, res) => {
    try {
      const { status } = req.body
      const resp = await Admin.findOneAndUpdate(
        { _id: req.user._id },
        { notification: status }
      )
      if (resp) {
        return res.json(
          responseData('NOTIFICATION_TOGGLE_UPDATED', {}, req, true)
        )
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  changeStatus: async (req, res) => {
    try {
      const { status, visibility, type } = req.body

      if (visibility) {
        return await updateVisibilityStatus(
          getModelByType(type),
          req.params.id,
          visibility,
          req,
          res
        )
      }

      if (isInvalidRequest(type)) {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }

      const model = getModelByType(type)
      console.log('model', model)
      const checkRecord = await getCheckRecord(model, req.params.id)

      if (isInvalidStatus(status) || isRecordNotFound(checkRecord)) {
        return res.json(
          responseData('INVALID_STATUS_OR_NOT_FOUND', {}, req, false)
        )
      }

      if (isDeletedUser(type, checkRecord)) {
        return res.json(responseData('USER_NOT_FOUND', {}, req, false))
      }

      return await updateStatus(model, req.params.id, status, req, res)
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  generatePresignedURL: async (req, res) => {
    try {
      let { contentType, folder } = req.body
      const mimeType = constant.mimeTypes[contentType]
      let uniqueFileName
      switch (folder) {
        case 'admin':
          uniqueFileName = `static/admin/${Date.now()}-${v4()}.${mimeType}`
          break
        case 'customer':
          uniqueFileName = `static/customer/${Date.now()}-${v4()}.${mimeType}`
          break
        case 'category':
          uniqueFileName = `static/category/${Date.now()}-${v4()}.${mimeType}`
          break
        case 'banner':
          uniqueFileName = `static/banner/${Date.now()}-${v4()}.${mimeType}`
          break
        case 'product':
          uniqueFileName = `static/category/${Date.now()}-${v4()}.${mimeType}`
          break
      }
      const newURL = await generatePutPresignedUrl(
        process.env.AWS_BUCKET_NAME,
        uniqueFileName,
        contentType
      )
      if (newURL) {
        res.json({
          success: true,
          msg: 'Pre signed URL generated successfully.',
          results: {
            key: uniqueFileName,
            url: newURL
          }
        })
      } else {
        res.json({
          success: false,
          msg: 'Error occur.',
          results: {}
        })
      }
    } catch (error) {
      res.json({
        success: false,
        msg: error.message,
        results: error
      })
    }
  },
  countryList: async (req, res) => {
    try {
      const countryList = await Country.find()
      return res.json(responseData('GET_LIST', countryList, req, true))
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  }
}

const isInvalidRequest = (type) => isEmpty(type)

const getCheckRecord = async (model, id) => model.findOne({ _id: id })

const isInvalidStatus = (status) => {
  return (
    status !== constant.status.active && status !== constant.status.inactive
  )
}

const isRecordNotFound = (checkRecord) => isEmpty(checkRecord)

const isDeletedUser = (type, checkRecord) => {
  return type === 'user' && checkRecord?.status === constant.status.deleted
}

const updateStatus = async (model, id, status, req, res) => {
  const resp = await model.updateOne({ _id: id }, { $set: { status } })
  if (resp.modifiedCount) {
    return res.json(responseData('STATUS_UPDATE', {}, req, true))
  } else {
    return res.json(responseData('NOT_FOUND', {}, req, false))
  }
}
const updateVisibilityStatus = async (model, id, visibility, req, res) => {
  const resp = await model.updateOne({ _id: id }, { $set: { visibility } })
  if (resp.modifiedCount) {
    return res.json(responseData('VISIBILITY_STATUS_UPDATE', {}, req, true))
  } else {
    return res.json(responseData('NOT_FOUND', {}, req, false))
  }
}
