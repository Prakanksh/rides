const mongoose = require('mongoose')
const { generateRandomAlphanumericId } = require('../helpers/helper')

const TransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true
    },
    rideIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      default: []
    }],
    paidBy: {
      type: String,
      enum: ["user", "driver", "admin"],
      required: false
    },
    paidTo: {
      type: String,
      enum: ["user", "driver", "admin"],
      required: false
    },
    paidById: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    paidToId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    paymentMethod: {
      type: String,
      enum: ["wallet", "cash", "online", "upi", "card", "netbanking"],
      required: false
    },
    paymentDetails: {
      walletTransactionId: { type: String, default: null },
      gatewayTransactionId: { type: String, default: null },
      gatewayName: { type: String, default: null },
      paymentGatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
      cashReceivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
      cashReceivedAt: { type: Date, default: null },
      cashReceiptNumber: { type: String, default: null },
      upiId: { type: String, default: null },
      upiTransactionId: { type: String, default: null },
      cardLast4: { type: String, default: null },
      cardType: { type: String, default: null },
      notes: { type: String, default: null }
    },
    transactionType: {
      type: String,
      enum: [
        "ride_payment",
        "driver_settlement",
        "admin_commission",
        "wallet_recharge",
        "wallet_withdrawal",
        "refund",
        "penalty",
        "bonus"
      ],
      required: false
    },
    amount: {
      type: Number,
      required: false
    },
    commissionAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: false
    },
    currency: {
      type: String,
      default: "INR"
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "cancelled"],
      default: "completed"
    },
    // Legacy fields for backward compatibility
    transactionAmount: {
      type: Number,
      default: null
    },
    VATAmount: {
      type: Number,
      default: 0
    },
    discountedPrice: {
      type: Number,
      default: 0
    },
    adminCommission: {
      type: Number,
      default: 0
    },
    supplierCommission: {
      type: Number,
      default: 0
    },
    type: {
      type: String,
      default: null
    },
    paymentType: {
      type: String,
      default: null
    },
    userId: {
      type: mongoose.Types.ObjectId,
      default: null
    },
    supplierId: {
      type: mongoose.Types.ObjectId,
      default: null
    },
    driverId: {
      type: mongoose.Types.ObjectId,
      default: null
    },
    orderObjectId: {
      type: mongoose.Types.ObjectId,
      default: null
    },
    orderId: {
      type: String,
      default: null
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
    // Generate unique transactionId with timestamp to avoid collisions
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    this.transactionId = `TXN${timestamp}${random}`;
  }
  if (this.paidBy === "user" && this.paidById) {
    this.userId = this.paidById
  }
  if (this.paidBy === "driver" && this.paidById) {
    this.driverId = this.paidById
  }
  if (this.transactionAmount === null && this.totalAmount) {
    this.transactionAmount = this.totalAmount
  }
  next()
})

TransactionSchema.index({ transactionId: 1 })
TransactionSchema.index({ rideIds: 1 })
TransactionSchema.index({ paidById: 1, paidBy: 1 })
TransactionSchema.index({ paidToId: 1, paidTo: 1 })
TransactionSchema.index({ status: 1 })
TransactionSchema.index({ createdAt: -1 })
TransactionSchema.index({ userId: 1 })
TransactionSchema.index({ driverId: 1 })

const Transaction = mongoose.model('transactions', TransactionSchema)

module.exports = Transaction
