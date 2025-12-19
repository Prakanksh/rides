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

/**
 * Update promo code usage when a ride completes
 * Atomically increments usedCount and adds to usageHistory
 * Note: Updates even if promo is later deactivated (usage happened when it was active)
 * @param {String} promoCode - Promo code string
 * @param {String|ObjectId} userId - User ID who used the promo
 * @returns {Promise<Boolean>} - true if updated, false if not found/invalid
 */
async function updatePromoCodeUsage(promoCode, userId) {
  if (!promoCode || !userId) {
    return false;
  }

  try {
    // Find promo code regardless of active status (usage happened when it was active)
    const promo = await promoCodeModel.findOne({ code: promoCode });
    
    if (!promo) {
      return false;
    }

    // Atomically increment usedCount and add to usageHistory
    await promoCodeModel.updateOne(
      { _id: promo._id },
      {
        $inc: { usedCount: 1 },
        $push: {
          usageHistory: {
            userId: userId,
            usedAt: new Date()
          }
        }
      }
    );

    return true;
  } catch (error) {
    console.error("Error updating promo code usage:", error);
    return false;
  }
}

module.exports = {
  calculateDiscount,
  updatePromoCodeUsage
};


