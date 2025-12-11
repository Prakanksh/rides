const express = require('express')
const router = express.Router()
const validationRule = require('../../validations/users/auth')
const { verifyToken } = require('../../middlewares/verifyToken')
const {
  register,
  verifyOTP,
  sendOtpLogin,
  verifyOtpLogin,
  resendOTP,
  updateProfilePic,
  getProfile,
  updateProfile,
  refreshToken,
  logout,
  accountDelete,
  globalSetting,
  convertCurrency,
  generatePutPresignedURL,
  sendEmailVerifyOtp,
  verifyEmailOtp,
  socialLogin,
  socialSignup,
  checkSocialId,
  checkUsername,
  userLogin,
  resendOtpEmail,
  resendOTPMobile,
  userResetPassword,
  userForgotPassword,
  verifyUserForgotPasswordOTP,
  changePassword,
  deleteAddress,
  rating,
  siteVisitNotification,
  categoryList,
  bannerList,
  recentViewProducts,
  favoriteProductList,
  countryList,
  notificationAndFavoriteCount,
  subCategoryListMasterData,
  verifyOtpMobileSocialSignUp,
  sendOtpMobileSocialSignUp
} = require('../../controllers/users/user.controller')

router
  .post('/register', validationRule.validate('register'), register)
  .post('/login', userLogin)
  .post('/forgotPassword', userForgotPassword)
  .post('/verifyUserForgotPasswordOTP', verifyUserForgotPasswordOTP)
  .post(
    '/resetPassword',
    validationRule.validate('resetPassword'),
    userResetPassword
  )
  .post('/socialLogin', validationRule.validate('socialLogin'), socialLogin)
  .post(
    '/checkSocialId',
    validationRule.validate('checkSocialId'),
    checkSocialId
  )
  .post('/socialSignup', validationRule.validate('socialSignup'), socialSignup)
  .post('/send-otp-social-signup', verifyToken, validationRule.validate('resendOTPMobile'), sendOtpMobileSocialSignUp)
  .post('/verify-otp-social-signup', verifyToken, verifyOtpMobileSocialSignUp)
  .post(
    '/checkUsername',
    validationRule.validate('checkUsername'),
    checkUsername
  )
  .post('/verifyOTP', validationRule.validate('verifyOTP'), verifyOTP)
  .post('/sendLoginOtp', validationRule.validate('sendOTP'), sendOtpLogin)
  .post('/verifyLoginOtp', validationRule.validate('verifyOTP'), verifyOtpLogin)
  .post(
    '/sendEmailVerifyOtp',
    validationRule.validate('sendEmailOTP'),
    sendEmailVerifyOtp
  )
  .post(
    '/verifyEmailOtp',
    validationRule.validate('verifyEmailOTP'),
    verifyEmailOtp
  )
  .post('/logout', [verifyToken], logout)
  .post('/resendOTP', validationRule.validate('resendOTP'), resendOTP)
  .post(
    '/resendOTPMobile',
    validationRule.validate('resendOTPMobile'),
    resendOTPMobile
  )
  .post(
    '/resendOtpEmail',
    validationRule.validate('resendOtpEmail'),
    resendOtpEmail
  )
  .post('/refreshToken', refreshToken)
  .post('/updateProfilePic', verifyToken, updateProfilePic)
  .get('/getProfile', [verifyToken], getProfile)
  .put(
    '/updateProfile',
    validationRule.validate('updateProfile'),
    [verifyToken],
    updateProfile
  )
  .delete('/updateProfileAddress/:id', [verifyToken], deleteAddress)
  .put('/deleteAccount', [verifyToken], accountDelete)
  .get('/globalSetting', globalSetting)
  .post(
    '/convertCurrency',
    [verifyToken],
    validationRule.validate('convertCurrency'),
    convertCurrency
  )
  .get('/generatePreSignedUrl', [verifyToken], generatePutPresignedURL)
  .post(
    '/change-password',
    [verifyToken],
    validationRule.validate('change-password'),
    changePassword
  )
  .post('/rating', [verifyToken], rating)
  .get('/siteVisitNotification', [verifyToken], siteVisitNotification)
  .get('/category-list', [], categoryList)
  .get('/banner-list', [], bannerList)
  .get('/recent-view-products', [verifyToken], recentViewProducts)
  .get('/favorite-product-list', [verifyToken], favoriteProductList)
  .get('/country-list', [], countryList)
  .get('/notification-favorite-count', [verifyToken], notificationAndFavoriteCount)
  .get('/sub-category-list', [], subCategoryListMasterData)
  // .post('/user-document', [], userDocs.uploadDocuments)
module.exports = router
