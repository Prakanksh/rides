const { constant } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const userService = require('../../services/admins/user.services')
module.exports = {
  adminUserList: async (req, res) => {
    try {
      await userService.adminUserList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  keywordFilter: async (req, res) => {
    try {
      await userService.keywordFilter(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  userDetail: async (req, res) => {
    try {
      await userService.userDetail(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  userOrderList: async (req, res) => {
    try {
      await userService.userOrderList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  statusChange: async (req, res) => {
    try {
      await userService.statusChange(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  awsUrl: async (req, res) => {
    try {
      await userService.awsUrl(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
getAllUsers: async (req, res) => {
  try {
    const { keyword, status, page = 1, limit = 10 } = req.query;

    const result = await userService.getAllUsers(
      keyword,
      status,
      parseInt(page),
      parseInt(limit)
    );

    return res.status(200).json(
      responseData(
        'GET_LIST',
        result || constant.staticResponseForEmptyResult,
        req,
        true
      )
    );

  } catch (error) {
    return res.status(400).json(
      responseData(
        'FETCH_USERS_FAILED',
        { error: error.message },
        req,
        false
      )
    );
  }
}

};


