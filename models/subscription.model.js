
const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,

  validityDays: { type: Number, required: true }, // 30, 90 etc.
  price: { type: Number, required: true },

  benefits: {
    rideDiscountFlat: Number,      // e.g. ₹20 off per ride
    rideDiscountPercent: Number,   // e.g. 10%
    maxDiscountPerRide: Number,    // cap
    freeRidesPerMonth: Number,
    surgeWaiver: Boolean,
    cancellationWaiver: Boolean,
    priorityBooking: Boolean,
    maxRidesPerMonth: Number,      // e.g. 30 rides
    zeroWaitingCharge: Boolean
  },
 status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    isDeleted: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model("Subscription", SubscriptionSchema);
