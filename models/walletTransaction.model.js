// models/walletTransaction.model.js

const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "ride_payment",        // user wallet → driver
        "ride_cash",           // cash given directly to driver
        "ride_earning",        // earning of driver
        "admin_commission"     // commission admin earns
      ]
    },

    
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null
    },

    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride"
    },

    amount: { type: Number },              // actual amount moved
    commissionAmount: { type: Number },    // driver share only
    method: { type: String },              // wallet or cash

    adminShareStatus: {
      type: String,
      enum: ["pending", "settled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
