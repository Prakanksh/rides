const { validatorMiddleware } = require('../../helpers/helper')
const { param, body } = require('express-validator')

module.exports.validate = (method) => {
  switch (method) {
    case 'add-banner': {
      return [
        body('title').notEmpty().withMessage('TITLE_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'status-banner': {
      return [
        param('id').notEmpty().withMessage('ID_EMPTY'),
        body('status')
          .notEmpty()
          .withMessage('STATUS_EMPTY')
          .isIn(['active', 'inactive']) //
          .withMessage('INVALID_STATUS'), //
        validatorMiddleware
      ]
    }
  }
}
