const jwt = require('jsonwebtoken')
const { responseData } = require('../helpers/responseData')
const { isEmpty } = require('lodash')
const Admin = require('../models/admin.model')
const User = require('../models/user.model')
const constant = require('../helpers/constant')

const getTokenFromHeaders = (headers) => {
  if (headers?.authorization && headers?.authorization.startsWith('Bearer')) {
    return headers.authorization.split(' ')[1]
  }
  return null
}

const handleAdminRole = async (user, req, res, next) => {
  const admin_data = await Admin.findOne({
    _id: user._id,
    status: user.status,
    forceLogout: false
  })
  if (!isEmpty(admin_data)) {
    next()
  } else {
    res.status(409).json(responseData('UNAUTHENTICATED', {}, req, false))
  }
}

const handleUserRole = (user, req, res, next) => {
  User.findOne({
    _id: user._id
  })
    .then((data) => {
      if (data) {
        if (data.status !== constant.status.active) {
          return res
            .status(409)
            .json(responseData('UNAUTHENTICATED', {}, req, false))
        }
        next()
      } else {
        res.status(409).json(responseData('USER_NOT_FOUND', {}, req, false))
      }
    })
    .catch((error) => {
      res
        .status(409)
        .json(responseData('UNAUTHENTICATED', error.message, req, false))
    })
}

const handleVerification = async (req, res, next, token) => {
  try {
    const user = await jwt.verify(token, process.env.JWT_SECRET)
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Token is expired', data: {} })
    }

    req.user = user

    switch (user.userType || user.role) {
      case constant.type.admin:
      case constant.type.subAdmin:
        await handleAdminRole(user, req, res, next)
        break

      case 'user':
        handleUserRole(user, req, res, next)
        break

      case 'driver':
        next()
        break

      default:
        res.status(409).json(responseData('UNAUTHENTICATED', {}, req, false))
    }
  } catch (error) {
    console.log('error', error)
    return res.status(401).json(responseData('NOT_AUTHORIZED', {}, req, true))
  }
}

exports.verifyToken = async (req, res, next) => {
  const token = getTokenFromHeaders(req.headers)
  if (!token) {
    return res.status(401).json(responseData('NOT_AUTHORIZED', {}, req, true))
  }
  handleVerification(req, res, next, token)
}

exports.withOptionalTokenMiddleware = async (req, res, next) => {
  const token = getTokenFromHeaders(req.headers)
  if (token) {
    handleVerification(req, res, next, token)
  } else {
    next()
  }
}
