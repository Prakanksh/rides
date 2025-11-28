// models/driverWallet.model.js

const mongoose = require("mongoose");

const driverWalletSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      unique: true,
      required: true
    },

    // Total money earned by driver (cash + wallet)
    mainBalance: { type: Number, default: 0 },

    // Driver's real earning after admin cut (commission share)
    commissionBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverWallet", driverWalletSchema);
