const mongoose = require('mongoose')
const { generateRandomAlphanumericId } = require('../helpers/helper')

const TransactionSchema = new mongoose.Schema(
  {
    transactionAmount: {
      type: Number
    },
    VATAmount: {
      type: Number
    },
    discountedPrice: {
      type: Number
    },
    adminCommission: {
      type: Number
    },
    supplierCommission: {
      type: Number
    },
    transactionId: {
      type: String
    },
    type: {
      type: String
    },
    paymentType: {
      type: String
    },
    transactionType: {
      type: String
    },
    currency: {
      type: String
    },
    userId: {
      type: mongoose.Types.ObjectId
    },
    supplierId: {
      type: mongoose.Types.ObjectId
    },
    orderObjectId: {
      type: mongoose.Types.ObjectId
    },
    orderId: {
      type: String
    },
    isCancelled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false }
  }
)

TransactionSchema.pre('validate', function (next) {
  if (!this.transactionId) {
    this.transactionId = generateRandomAlphanumericId(10)
  }
  next()
})

const Transaction = mongoose.model('transactions', TransactionSchema)

module.exports = Transaction
