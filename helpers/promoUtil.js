const promoCodeModel = require("../models/promoCode.model");

/**
 * Calculate discount amount from promo code
 * @param {String} promoCode - Promo code string
 * @param {Number} originalFare - Original fare before discount
 * @returns {Object} - { discountAmount, isValid }
 */
async function calculateDiscount(promoCode, originalFare) {
  if (!promoCode || !originalFare || originalFare <= 0) {
    return { discountAmount: 0, isValid: false };
  }

  try {
    const promo = await promoCodeModel.findOne({ code: promoCode, isActive: true });
    
    if (!promo) {
      return { discountAmount: 0, isValid: false };
    }

    if (promo.expiryDate < new Date()) {
      return { discountAmount: 0, isValid: false };
    }

    let discountAmount = 0;

    if (promo.discountType === "flat") {
      discountAmount = Math.min(promo.discountValue, originalFare);
    } else if (promo.discountType === "percentage") {
      discountAmount = (originalFare * promo.discountValue) / 100;
      if (promo.maxDiscountValue && promo.maxDiscountValue > 0) {
        discountAmount = Math.min(discountAmount, promo.maxDiscountValue);
      }
      discountAmount = Math.min(discountAmount, originalFare);
    }

    return {
      discountAmount: Number(discountAmount.toFixed(2)),
      isValid: true,
      promo
    };
  } catch (error) {
    console.error("Error calculating discount:", error);
    return { discountAmount: 0, isValid: false };
  }
}

module.exports = {
  calculateDiscount
};


