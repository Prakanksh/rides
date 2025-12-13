const { responseData } = require('../../helpers/responseData')
const userService = require('../../services/users/user.services')
module.exports = {
  checkUsername: async (req, res) => {
    try {
      await userService.checkUsername(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  checkSocialId: async (req, res) => {
    try {
      await userService.checkSocialId(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  register: async (req, res) => {
    try {
      await userService.register(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  userLogin: async (req, res) => {
    try {
      await userService.userLogin(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  userForgotPassword: async (req, res) => {
    try {
      await userService.userForgotPassword(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  verifyUserForgotPasswordOTP: async (req, res) => {
    try {
      await userService.verifyUserForgotPasswordOTP(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  userResetPassword: async (req, res) => {
    try {
      await userService.userResetPassword(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  verifyOTP: async (req, res) => {
    try {
      await userService.verifyOTP(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  sendOtpLogin: async (req, res) => {
    try {
      await userService.sendOtpLogin(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  sendEmailVerifyOtp: async (req, res) => {
    try {
      await userService.sendEmailVerifyOtp(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  verifyOtpLogin: async (req, res) => {
    try {
      await userService.verifyOtpLogin(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  verifyEmailOtp: async (req, res) => {
    try {
      await userService.verifyEmailOtp(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  refreshToken: async (req, res) => {
    try {
      await userService.refreshToken(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  logout: async (req, res) => {
    try {
      await userService.logout(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },

  resendOTP: async (req, res) => {
    try {
      await userService.resendOTP(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  resendOTPMobile: async (req, res) => {
    try {
      await userService.resendOTPMobile(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  resendOtpEmail: async (req, res) => {
    try {
      await userService.resendOtpEmail(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  updateProfilePic: async (req, res) => {
    try {
      await userService.updateProfilePic(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  getProfile: async (req, res) => {
    try {
      await userService.getProfile(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  updateProfile: async (req, res) => {
    try {
      await userService.updateProfile(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  deleteAddress: async (req, res) => {
    try {
      console.log('<<<<<<<<< INTO THE CONTROLLERS >>>>>>>>>')
      await userService.deleteAddress(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  accountDelete: async (req, res) => {
    try {
      await userService.accountDelete(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  globalSetting: async (req, res) => {
    try {
      await userService.globalSettingWithoutToken(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  convertCurrency: async (req, res) => {
    try {
      await userService.convertCurrency(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  generatePutPresignedURL: async (req, res) => {
    try {
      await userService.generatePutPresignedURL(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  getGlobalSettings: async (req, res) => {
    try {
      await userService.getGlobalSettings(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  socialLogin: async (req, res) => {
    try {
      await userService.socialLogin(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  socialSignup: async (req, res) => {
    try {
      await userService.socialSignup(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  sendOtpMobileSocialSignUp: async (req, res) => {
    try {
      await userService.sendOtpMobileSocialSignUp(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  verifyOtpMobileSocialSignUp: async (req, res) => {
    try {
      await userService.verifyOtpMobileSocialSignUp(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  changePassword: async (req, res) => {
    try {
      await userService.changePassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  rating: async (req, res) => {
    try {
      await userService.rating(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  siteVisitNotification: async (req, res) => {
    try {
      await userService.siteVisitNotification(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  categoryList: async (req, res) => {
    try {
      await userService.categoryList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  bannerList: async (req, res) => {
    try {
      await userService.bannerList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  recentViewProducts: async (req, res) => {
    try {
      await userService.recentViewProducts(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  favoriteProductList: async (req, res) => {
    try {
      await userService.favoriteProductList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  countryList: async (req, res) => {
    try {
      await userService.countryList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  notificationAndFavoriteCount: async (req, res) => {
    try {
      await userService.notificationAndFavoriteCount(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  subCategoryListMasterData: async (req, res) => {
    try {
      await userService.subCategoryListMasterData(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
 createSupport :async (req, res) => {
 try {
      await userService.submitSupportRequest(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}
