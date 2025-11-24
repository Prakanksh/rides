const { body, param, check, query } = require('express-validator')
const { validatorMiddleware } = require('../../helpers/helper')

module.exports.validate = (method) => {
  switch (method) {
    case 'verifyMobileOtp': {
      return [
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'),
        body('countryCode').notEmpty().withMessage('COUNTRY_CODE_EMPTY'), //
        body('otp').notEmpty().withMessage('OTP_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'verifyMobile': {
      return [
        body('countryCode').notEmpty().withMessage('COUNTRY_CODE_EMPTY'),
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'), //

        validatorMiddleware
      ]
    }
    case 'userForgotPassword': {
      return [
        body('email').notEmpty().withMessage('EMAIL_EMPTY'), //
        validatorMiddleware
      ]
    }
    case 'resetPassword': {
      return [
        body('newPassword').notEmpty().withMessage('PASSWORD_EMPTY'),

        validatorMiddleware
      ]
    }
    case 'register': {
      return [
        body('fullName')
          .notEmpty()
          .withMessage('USERNAME_REQUIRED')
          .isLength({ min: 3 })
          .withMessage('FULLNAME_MIN_LENGTH_3'),
        body('email').notEmpty().withMessage('EMAIL_REQUIRED'),
        body('mobile').notEmpty().withMessage('MOBILE_REQUIRED'),
        validatorMiddleware
      ]
    }
    case 'checkUsername': {
      return [
        body('userName').notEmpty().withMessage('USERNAME_REQUIRED'),
        validatorMiddleware
      ]
    }
    case 'resendOtpEmail':
    case 'sendEmailOTP': {
      return [
        body('email').notEmpty().withMessage('EMAIL_REQUIRED'),
        validatorMiddleware
      ]
    }
    case 'passCode': {
      return [
        body('email').notEmpty().withMessage('EMAIL_REQUIRED'),
        body('passCode')
          .notEmpty()
          .withMessage('PASS_CODE_REQUIRED')
          .isLength({ min: 6 })
          .withMessage('PASS_CODE_LENGTH_MIN')
          .isLength({ max: 6 })
          .withMessage('PASS_CODE_LENGTH_MAX'),

        validatorMiddleware
      ]
    }
    case 'verifyOTP': {
      return [
        body('mobileOtpId')
          .notEmpty()
          .withMessage('MOBILE_OTP_ID_REQUIRED')
          .isMongoId()
          .withMessage('INVALID_MONGODB_ID'),
        body('emailOtpId')
          .notEmpty()
          .withMessage('EMAIL_OTP_ID_REQUIRED')
          .isMongoId()
          .withMessage('INVALID_MONGODB_ID'),
        body('otpMobile').notEmpty().withMessage('OTP_REQUIRED'),

        validatorMiddleware
      ]
    }
    case 'login': {
      return [
        body('email').notEmpty().withMessage('EMAIL_REQUIRED'),
        body('userType').notEmpty().withMessage('USER_TYPE_REQUIRED'),
        body('passCode').notEmpty().withMessage('PASS_CODE_REQUIRED'),
        validatorMiddleware
      ]
    }
    case 'resendOTP': {
      return [
        body('email').notEmpty().withMessage('EMAIL_REQUIRED'),
        body('mobile').notEmpty().withMessage('MOBILE_REQUIRED'),
        body('countryCode').notEmpty().withMessage('COUNTRY_CODE_REQUIRED'),

        validatorMiddleware
      ]
    }
    case 'resendOTPMobile': {
      return [
        body('mobile').notEmpty().withMessage('MOBILE_REQUIRED'),
        body('countryCode').notEmpty().withMessage('COUNTRY_CODE_REQUIRED'),
        validatorMiddleware
      ]
    }
    case 'sendOTP': {
      return [
        body('mobile').notEmpty().withMessage('MOBILE_REQUIRED'),
        validatorMiddleware
      ]
    }
    case 'verifyEmailOTP': {
      return [
        body('emailOtpId')
          .notEmpty()
          .withMessage('EMAIL_OTP_ID_REQUIRED')
          .isMongoId()
          .withMessage('INVALID_MONGODB_ID'),
        body('otp').notEmpty().withMessage('OTP_REQUIRED'),

        validatorMiddleware
      ]
    }
    case 'socialLogin': {
      return [
        body('accessToken').notEmpty().withMessage('ACCESS_TOKEN_REQUIRED'),
        validatorMiddleware
      ]
    }
    case 'checkSocialId': {
      return [
        body('socialId').notEmpty().withMessage('SOCIAL_ID_REQUIRED'),
        validatorMiddleware
      ]
    }
    case 'socialSignup': {
      return [
        body('accessToken').notEmpty().withMessage('EMAIL_OTP_ID_REQUIRED'),

        validatorMiddleware
      ]
    }
    case 'updateProfile': {
      return [
        body('fullName')
          .notEmpty()
          .withMessage('NAME_EMPTY')
          .isLength({ min: 2 })
          .withMessage('NAME_LENGTH_MIN')
          .isLength({ max: 30 })
          .withMessage('NAME_LENGTH_MAX'),
        validatorMiddleware
      ]
    }
    case 'change-password': {
      return [
        body('newPassword').notEmpty().withMessage('NEWPASSWORD_EMPTY'), //
        body('oldPassword').notEmpty().withMessage('OLDPASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'convertCurrency': {
      return [
        body('amount').notEmpty().withMessage('CURRENCY_AMOUNT'), //
        body('from').notEmpty().withMessage('CURRENCY_FROM'), //
        body('to').notEmpty().withMessage('CURRENCY_TO'),
        validatorMiddleware
      ]
    }
    case 'changeDefaultAddress': {
      return [
        query('defaultAddress').notEmpty().withMessage('DEFAULT_ADDRESS_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'productListCategoryWise': {
      return [
        query('category').notEmpty().withMessage('CATEGORY_ID_EMPTY'),
        validatorMiddleware
      ]
    }
  }
}
