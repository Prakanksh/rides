// models/userWallet.model.js

const mongoose = require("mongoose");

const userWalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true
    },

    // Money user can spend
    mainBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserWallet", userWalletSchema);
