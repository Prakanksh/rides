const mongoose = require("mongoose");

const PromoCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },

    discountType: { type: String, enum: ["flat", "percentage"], required: true },
    discountValue: { type: Number, required: true },

    // validFor: {
    //   type: String,
    //   enum: ["user", "driver"],  // separated promos
    //   required: true,
    // },
    description: { type: String, default: "" },
maxDiscountValue: { type: Number, default: 0 }, // applicable for percentage type
    expiryDate: { type: Date, required: true },

    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },

    perUserLimit: { type: Number, default: 1 }, // optional

    isActive: { type: Boolean, default: true },

    // Track usage history
    usageHistory: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        usedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("PromoCode", PromoCodeSchema);
