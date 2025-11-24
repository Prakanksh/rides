const { body, param } = require('express-validator')
const { validatorMiddleware } = require('../../helpers/helper')

module.exports.validate = (method) => {
  switch (method) {
    case 'change-status':
    case 'add': {
      return [
        body('fullName').notEmpty().withMessage('NAME_EMPTY'),
        body('category').notEmpty().withMessage('CATEGORY_EMPTY'),
        body('subCategory').notEmpty().withMessage('SUB_CATEGORY_EMPTY'),
        body('images')
          .isArray().withMessage('IMAGES_MUST_BE_ARRAY')
          .bail()
          .custom((value) => {
            if (value.length > 3) {
              throw new Error('IMAGES_TOO_MANY');
            }
            return true;
          })
          .withMessage('IMAGES_TOO_MANY')
          .bail(),
        validatorMiddleware
      ]
    }
    case 'status': {
      return [
        param('id').notEmpty().withMessage('ID_EMPTY'),
        body('status')
          .notEmpty() //
          .withMessage('STATUS_EMPTY')
          .isIn(['active', 'inactive']) //
          .withMessage('INVALID_STATUS'),
        validatorMiddleware
      ]
    }
    case 'edit': {
      return [
        body('category').notEmpty().withMessage('CATEGORY_EMPTY'),
        body('name').notEmpty().withMessage('NAME_EMPTY'),
        validatorMiddleware
      ]
    }
  }
}
