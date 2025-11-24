const { validatorMiddleware } = require('../../helpers/helper')
const { param, body } = require('express-validator')

module.exports.validate = (method) => {
  switch (method) {
    case 'add-category': {
      return [
        body('categoryType').notEmpty().withMessage('CATEGORY_TYPE_EMPTY'), //
        body('name').notEmpty().withMessage('NAME_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'status-category': {
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
