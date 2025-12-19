
const { body, param } = require("express-validator");
const { validatorMiddleware } = require("../../helpers/helper");

module.exports.validate = (method) => {
  switch (method) {

    case "create-subscription": {
      return [

        body("name")
          .notEmpty().withMessage("NAME_REQUIRED")
          .isLength({ max: 100 }).withMessage("NAME_TOO_LONG"),

        body("description")
          .optional()
          .isString().withMessage("INVALID_DESCRIPTION"),

        body("validityDays")
          .notEmpty().withMessage("VALIDITY_REQUIRED")
          .isInt({ min: 1 }).withMessage("VALIDITY_MUST_BE_POSITIVE_NUMBER"),

        body("price")
          .notEmpty().withMessage("PRICE_REQUIRED")
          .isFloat({ min: 0 }).withMessage("PRICE_INVALID"),

        /* BENEFITS VALIDATION */
        body("benefits").notEmpty().withMessage("BENEFITS_REQUIRED"),

        body("benefits.rideDiscountFlat")
          .optional()
          .isFloat({ min: 0 }).withMessage("INVALID_FLAT_DISCOUNT"),

        body("benefits.rideDiscountPercent")
          .optional()
          .isFloat({ min: 0, max: 100 })
          .withMessage("INVALID_PERCENT_DISCOUNT"),

        body("benefits.maxDiscountPerRide")
          .optional()
          .isFloat({ min: 0 }).withMessage("INVALID_MAX_DISCOUNT"),

        body("benefits.freeRidesPerMonth")
          .optional()
          .isInt({ min: 0 }).withMessage("INVALID_FREE_RIDES"),

        body("benefits.surgeWaiver")
          .optional()
          .isBoolean().withMessage("INVALID_SURGE_WAIVER"),

        body("benefits.cancellationWaiver")
          .optional()
          .isBoolean().withMessage("INVALID_CANCELLATION_WAIVER"),

        body("benefits.priorityBooking")
          .optional()
          .isBoolean().withMessage("INVALID_PRIORITY_BOOKING"),

        body("benefits.maxRidesPerMonth")
          .optional()
          .isInt({ min: 1 }).withMessage("INVALID_MAX_RIDES"),

        body("benefits.zeroWaitingCharge")
          .optional()
          .isBoolean().withMessage("INVALID_ZERO_WAITING_CHARGE"),

        validatorMiddleware
      ];
    }


      // UPDATE SUBSCRIPTION PLAN
   
    case "update-subscription": {
      return [

        param("id")
          .notEmpty().withMessage("ID_REQUIRED")
          .isMongoId().withMessage("INVALID_ID"),

        body("name")
          .optional()
          .isLength({ max: 100 }).withMessage("NAME_TOO_LONG"),

        body("description")
          .optional()
          .isString().withMessage("INVALID_DESCRIPTION"),

        body("validityDays")
          .optional()
          .isInt({ min: 1 }).withMessage("INVALID_VALIDITY"),

        body("price")
          .optional()
          .isFloat({ min: 0 }).withMessage("INVALID_PRICE"),

        // All benefit validations reused
        body("benefits").optional().isObject().withMessage("INVALID_BENEFITS"),

        body("benefits.rideDiscountFlat").optional().isFloat({ min: 0 }),
        body("benefits.rideDiscountPercent").optional().isFloat({ min: 0, max: 100 }),
        body("benefits.maxDiscountPerRide").optional().isFloat({ min: 0 }),
        body("benefits.freeRidesPerMonth").optional().isInt({ min: 0 }),
        body("benefits.surgeWaiver").optional().isBoolean(),
        body("benefits.cancellationWaiver").optional().isBoolean(),
        body("benefits.priorityBooking").optional().isBoolean(),
        body("benefits.maxRidesPerMonth").optional().isInt({ min: 1 }),
        body("benefits.zeroWaitingCharge").optional().isBoolean(),

        body("active")
          .optional()
          .isBoolean().withMessage("INVALID_ACTIVE_FLAG"),

        validatorMiddleware
      ];
    }

  }
};
