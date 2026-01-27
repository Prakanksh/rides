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
    paymentDetails: {
      upiId: { type: String, default: null },
      upiQrCode: { type: String, default: null },
      bankAccountNumber: { type: String, default: null },
      bankAccountName: { type: String, default: null },
      bankName: { type: String, default: null },
      bankIfsc: { type: String, default: null },
      bankBranch: { type: String, default: null },
      chequePayableTo: { type: String, default: null },
      chequeAddress: { type: String, default: null }
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
