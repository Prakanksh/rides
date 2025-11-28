// models/adminWallet.model.js

const mongoose = require("mongoose");

const adminWalletSchema = new mongoose.Schema(
  {
    // Admin's earning from commissions
    mainBalance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminWallet", adminWalletSchema);
