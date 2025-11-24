const { body, param } = require('express-validator')
const { validatorMiddleware } = require('../../helpers/helper')

module.exports.validate = (method) => {
  switch (method) {
    case 'status': {
      return [
        param('id').notEmpty().withMessage('ID_EMPTY'),
        body('status')
          .notEmpty()
          .withMessage('STATUS_EMPTY') //
          .isIn(['active', 'inactive']) //active, inactive
          .withMessage('INVALID_STATUS'),
        validatorMiddleware
      ]
    }
    case 'edit': {
      return [
        body('category').notEmpty().withMessage('CATEGORY_EMPTY'), //
        body('name').notEmpty().withMessage('NAME_EMPTY'),
        validatorMiddleware
      ]
    }
    case 'add': {
      return [
        body('unit').notEmpty().withMessage('UNIT_EMPTY'), //
        body('category').notEmpty().withMessage('CATEGORY_EMPTY'),
        body('name').notEmpty().withMessage('NAME_EMPTY'), //
        validatorMiddleware
      ]
    }
  }
}
