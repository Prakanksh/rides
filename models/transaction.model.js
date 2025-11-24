const mongoose = require('mongoose') 
const TransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String
    },
    offer_code: {
      type: String
    },
    transactionAmount: {
      type: Number,
      required: false
    },
    cashbackAmount: {
      type: Number,
      required: false
    },
    transactionType: {
      type: String,
      required: false
    },
    type: {
      type: String,
      ENUM: ['debit', 'credit'],
      required: false
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    },
    status: {
      type: String,
      ENUM: ['failed', 'success'],
      default: 'success'
    }
  },
  {
    timestamps: true
  }
)

TransactionSchema.pre('save', function (next) {
  if (!this.transactionId) {
    this.transactionId = 'txn-' + Date.now();
  }
  next();
});

const TransactionModel = mongoose.model('transactions', TransactionSchema)

module.exports = TransactionModel
