const _ = require('multi-lang')('lang.json')
const jwt = require('jsonwebtoken')
const User = require('../models/user.model')

module.exports = {
  responseData: (message, result, req, success) => {
    const language = req.headers['language'] ? req.headers['language'] : 'en'
    let response = {}
    response.success = success
    response.message =
      _(message, language) || _('SOMETHING_WENT_WRONG', language)
    response.results = result
    return response
  },

  setMessage: (message, language) => {
    return __(message, language)
  },

  generateAuthToken: userData => {
    const token = jwt.sign(userData, process.env.JWT_SECRET, {
      expiresIn: process.env.TOKEN_LIFE
    })

    const refreshToken = jwt.sign(userData, process.env.JWT_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_LIFE
    })

    return { token, refreshToken }
  },

  generateUniqueUserId: () => {
    const randomUserId = Math.floor(Math.random() * 1000000)
    return randomUserId.toString()
  },

  handleSocialIdExist: (req, res) => {
    return res.json(responseData('SOCIAL_ID_EXIST', {}, req, false))
  }
}
