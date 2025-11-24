const { body, param } = require('express-validator');
const { validatorMiddleware } = require('../../helpers/helper');


module.exports.validate = (method) => {
  switch (method) {
    case 'create-subscription': {
      return [
        body('name')
          .notEmpty()
          .withMessage('NAME_EMPTY')
          .isLength({ max: 100 })
          .withMessage('NAME_LIMIT_REACHED'),
        body('description')
          .notEmpty()
          .withMessage('DESCRIPTION_EMPTY'),
        body('duration')
          .notEmpty()
          .withMessage('DURATION_EMPTY'),
        body('price')
          .notEmpty()
          .withMessage('PRICE_EMPTY'),
        body('months')
          .notEmpty()
          .withMessage('MONTHS_EMPTY'),
        validatorMiddleware,
      ];
    }
  }
};
