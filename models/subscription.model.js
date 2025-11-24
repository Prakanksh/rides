const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  subscriptionId: {
    type: Number
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  months: {
    type: Number,
    required: true
  },
  duration: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, {
  timestamps: true,
  toObject: { getters: true, setters: true, virtuals: false },
  toJSON: { getters: true, setters: true, virtuals: false }
});

subscriptionSchema.pre("save", function (next) {
  mongoose
    .model("Subscription")
    .findOne({}).sort({ subscriptionId: -1 })
    .then((entry) => {
      this.subscriptionId = (parseInt(entry?.subscriptionId) || 0) + 1
      next();
    });
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
