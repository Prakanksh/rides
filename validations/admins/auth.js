const { body, param } = require('express-validator')
const { validatorMiddleware } = require('../../helpers/helper')

module.exports.validate = (method) => {
  
  switch (method) {
    case 'adminLogin': {
      return [
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'forgot-password': {
      return [
        body('email')
          .notEmpty()
          .withMessage('EMAIL_EMPTY')
          .isEmail()
          .withMessage('EMAIL_VALID'),
        validatorMiddleware
      ]
    }
    case 'reset-password': {
      return [
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'change-password': {
      return [
        body('oldPassword').notEmpty().withMessage('OLDPASSWORD_EMPTY'),
        body('newPassword').notEmpty().withMessage('NEWPASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'deleteUser': {
      return [
        body('_id').notEmpty().withMessage('ID_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'addSubAdmin': {
      return [
        body('firstName')
          .notEmpty()
          .withMessage('NAME_EMPTY')
          .isLength({ min: 2 })
          .withMessage('NAME_LENGTH_MIN')
          .isLength({ max: 30 })
          .withMessage('NAME_LENGTH_MAX'),
        body('lastName')
          .notEmpty()
          .withMessage('NAME_EMPTY')
          .isLength({ min: 2 })
          .withMessage('NAME_LENGTH_MIN')
          .isLength({ max: 30 })
          .withMessage('NAME_LENGTH_MAX'),
        body('email')
          .notEmpty()
          .withMessage('EMAIL_EMPTY')
          .isEmail()
          .withMessage('EMAIL_VALID'),
        validatorMiddleware
      ]
    }
    case 'addUser': {
      return [
        body('name')
          .notEmpty()
          .withMessage('NAME_EMPTY')
          .isLength({ min: 2 })
          .withMessage('NAME_LENGTH_MIN')
          .isLength({ max: 30 })
          .withMessage('NAME_LENGTH_MAX'),
        body('email')
          .notEmpty()
          .withMessage('EMAIL_EMPTY')
          .isEmail()
          .withMessage('EMAIL_VALID'),
        body('mobile')
          .notEmpty()
          .withMessage('MOBILE_EMPTY')
          .isNumeric()
          .withMessage('INVALID_MOBILE'),
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'addFAQ': {
      return [
        body('title').notEmpty().withMessage('TITLE_EMPTY'),
        body('content').notEmpty().withMessage('CONTENT_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'verify-mobile': {
      return [
        body('country_code').notEmpty().withMessage('COUNTRY_CODE_EMPTY'),
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'),
        body('otp_phone').notEmpty().withMessage('OTP_PHONE_EMPTY'),
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        body('otp_email').notEmpty().withMessage('OTP_EMAIL_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'resend-otp': {
      return [
        body('country_code').notEmpty().withMessage('COUNTRY_CODE_EMPTY'),
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'),
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'login': {
      return [
        body('login_type').notEmpty().withMessage('LOGIN_TYPE_EMPTY'),
        body('login_input').notEmpty().withMessage('LOGIN_INPUT_EMPTY'),
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'login-token': {
      return [
        body('input').notEmpty().withMessage('LOGIN_INPUT_EMPTY'),
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        body('device_id').notEmpty().withMessage('DEVICE_ID_EMPTY'),
        body('device_type').notEmpty().withMessage('DEVICE_TYPE_EMPTY'),
        body('device_token').notEmpty().withMessage('DEVICE_TOKEN_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'permission': {
      return [
        body('permission').notEmpty().withMessage('PERMISSION_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'change-status': {
      return [
        body('status').notEmpty().withMessage('STATUS_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'set-security-pin': {
      return [
        body('pin').notEmpty().withMessage('PIN_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'contact-us': {
      return [
        body('name').notEmpty().withMessage('NAME_EMPTY'),
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        body('message').notEmpty().withMessage('MESSAGE_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'reset-password-user': {
      return [
        body('otp').notEmpty().withMessage('OTP_EMPTY'),
        body('password').notEmpty().withMessage('PASSWORD_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'refund': {
      return [
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'),
        body('amount').notEmpty().withMessage('AMOUNT_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'reply': {
      return [
        body('message').notEmpty().withMessage('MESSAGE_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'add-notification': {
      return [
        body('title').notEmpty().withMessage('TITLE_EMPTY'),
        body('description').notEmpty().withMessage('DESCRIPTION_EMPTY'),
        body('sendTo').notEmpty().withMessage('SENDTO_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'EDIT-PROFILE': {
      return [
        body('name').notEmpty().withMessage('NAME_EMPTY'),
        body('countryID').notEmpty().withMessage('COUNTRY_EMPTY'),
        body('cityID').notEmpty().withMessage('CITY_EMPTY'),
        body('address').notEmpty().withMessage('ADDRESS_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'status-faq': {
      return [
        param('id').notEmpty().withMessage('ID_EMPTY'),
        body('status')
          .notEmpty()
          .withMessage('STATUS_EMPTY')
          .isIn(['active', 'inactive'])
          .withMessage('INVALID_STATUS'),
        validatorMiddleware
      ]
    }
    case 'add-category': {
      return [
        body('name').notEmpty().withMessage('NAME_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'add-user': {
      return [
        body('fullName').notEmpty().withMessage('NAME_EMPTY'),
        body('mobile').notEmpty().withMessage('MOBILE_EMPTY'),
        body('countryCode').notEmpty().withMessage('COUNTRY_CODE_EMPTY'),
        body('email').notEmpty().withMessage('EMAIL_EMPTY'),
        validatorMiddleware
      ]
    }
  }
}
