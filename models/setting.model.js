const mongoose = require('mongoose')

const AdminSettingSchema = new mongoose.Schema(
  {
    adminEmail: {
      type: String
    },
    vat: {
      type: Number
    },
    payButtonValidity: {
      type: Number
    },
    supplierLinkCommissionUsers: {
      type: Number
    },
    supplierLinkCommission: {
      type: Number
    },
    appleLink: {
      type: String
    },
    facebookLink: {
      type: String
    },
    googleLink: {
      type: String
    },
    instagramLink: {
      type: String
    },
    twitterLink: {
      type: String
    },
    locationMeters: {
      type: Number
    },
  },
  {
    timestamps: true,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false }
  }
)

const adminSetting = mongoose.model('settings', AdminSettingSchema)

module.exports = adminSetting
