// models/adminSetting.model.js

const mongoose = require("mongoose");

const AdminSettingSchema = new mongoose.Schema(
  {
    commissionPercentage: { type: Number, default: 30 },  // Admin cut
    cancellationFee: { type: Number, default: 20 },
    minimumFare: { type: Number, default: 25 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminSetting", AdminSettingSchema);
