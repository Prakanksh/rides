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
  //   changeStatus: async (req, res) => {
  //     try {
  //       await userService.changeStatus(req, res)
  //     } catch (err) {
  //       const msg = err.message || 'SOMETHING_WENT_WRONG'
  //       return res.status(422).json(responseData(msg, {}, req))
  //     }   
  // }
  tempDelete: async(req,res)=>{
       try {
        // console.log("ed")
         await userService.tempDelete(req, res)
       } catch (err) {
         const msg = err.message || 'SOMETHING_WENT_WRONG'
         return res.status(422).json(responseData(msg, {}, req))
       }  }
}
