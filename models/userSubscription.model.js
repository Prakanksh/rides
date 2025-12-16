const UserSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },

  startDate: Date,
  endDate: Date,
  isActive: { type: Boolean, default: true },

  usedRides: { type: Number, default: 0 },
  freeRidesUsed: { type: Number, default: 0 },

  autoRenew: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model("UserSubscription", UserSubscriptionSchema);