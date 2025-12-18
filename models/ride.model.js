const mongoose = require("mongoose");
const vehicleFareSchema = new mongoose.Schema({
  
  vehicleType: {
    type: String,
    enum: ['two-wheeler', 'auto', 'mini', 'prime-sedan', 'suv'],
    required: true
  },
  estimatedFare: {
    type: Number,
    required: true,
    min: 0
  }
},{ _id: false });
const RideSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
      default: null
    },

    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        required: true
      },
      address: { type: String, default: "" }
    },

    dropLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        required: true
      },
      address: { type: String, default: "" }
    },

    distance: { type: Number, default: 0 },
    // estimatedFare: { type: Number, default: 0 },
    estimatedFare:[vehicleFareSchema],
    finalFare: { type: Number, default: 0 },
    originalFare: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "wallet"],
      default: "cash"
    },

    vehicleType: {
      type: String,
      enum: ["two-wheeler", "auto", "mini", "prime-sedan", "suv"],
      // required: true
    },

    status: {
      type: String,
      enum: [
        "estimating",
        "scheduled",
        "scheduled_ready",
        "requested", 
        "accepted", 
        "arrived", 
        "ongoing", 
        "reachedDestination",
        "completed", 
        "cancelled"
      ],
      default: "estimating"
    },

    isScheduled: { type: Boolean, default: false },
    scheduledFor: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
    reminderSent: { type: Boolean, default: false },
    autoCancelled: { type: Boolean, default: false },

    cancellationReason: { type: String, default: "" },
    cancelledBy: {
      type: String,
      enum: ["user", "driver", "system", null],
      default: null
    },
    cancelledAt: { type: Date, default: null },
    cancelledDrivers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver"
    }],

    otpForRideStart: { type: String, default: null },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    estimatedTime: { type: Number, default: 0 },
    actualTime: { type: Number, default: 0 },
    actualArrivalTime: { type: Date, default: null },
    actualCompletionTime: { type: Date, default: null },

    paidToDriver: {
      type: Boolean,
      default: false
    },
    paidToAdmin: {
      type: Boolean,
      default: false
    },
    paymentSuccessful: {
      type: Boolean,
      default: false
    },
    cashPaidByUser: {
      type: Boolean,
      default: false
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transactions",
      default: null
    },
    driverReceivedAmount: {
      type: Number,
      default: 0
    },
    adminCommissionAmount: {
      type: Number,
      default: 0
    },
    paymentDetails: {
      userPaidAmount: { type: Number, default: 0 },
      driverReceivedAmount: { type: Number, default: 0 },
      adminCommissionAmount: { type: Number, default: 0 },
      paymentCompletedAt: { type: Date, default: null },
      discountAmount: { type: Number, default: 0 },
      originalFare: { type: Number, default: 0 },
      promoCode: { type: String, default: null }
    },  promoCode:{
type: String,
  },
  },

  { timestamps: true, versionKey: false }
);

RideSchema.methods.updatePaymentStatus = function() {
  if (this.paidToAdmin && this.paidToDriver) {
    this.paymentSuccessful = true;
    if (!this.paymentDetails.paymentCompletedAt) {
      this.paymentDetails.paymentCompletedAt = new Date();
    }
  } else {
    this.paymentSuccessful = false;
    this.paymentDetails.paymentCompletedAt = null;
  }
  this.paymentDetails.userPaidAmount = Number(this.paymentDetails.userPaidAmount.toFixed(2));
  this.paymentDetails.driverReceivedAmount = Number(this.paymentDetails.driverReceivedAmount.toFixed(2));
  this.paymentDetails.adminCommissionAmount = Number(this.paymentDetails.adminCommissionAmount.toFixed(2));
};

RideSchema.pre("validate", function(next) {
  if (this.vehicleType === "prime sedan") this.vehicleType = "prime-sedan";
  next();
});

RideSchema.methods.getEstimatedArrivalTime = function() {
  if (!this.createdAt) return null;
  const { DRIVER_ARRIVAL_BUFFER_MINUTES } = require("../helpers/etaCalculator");
  return new Date(this.createdAt.getTime() + (DRIVER_ARRIVAL_BUFFER_MINUTES * 60 * 1000));
};

RideSchema.methods.getEstimatedCompletionTime = function() {
  const estimatedArrivalTime = this.getEstimatedArrivalTime();
  if (!estimatedArrivalTime || !this.estimatedTime) return null;
  return new Date(estimatedArrivalTime.getTime() + (this.estimatedTime * 60 * 1000));
};

RideSchema.index({ pickupLocation: "2dsphere" });
RideSchema.index({ rider: 1, status: 1 });
RideSchema.index({ driver: 1, status: 1 });
RideSchema.index({ isScheduled: 1, status: 1, scheduledFor: 1 });
RideSchema.index({ isScheduled: 1, status: 1, updatedAt: 1 });
RideSchema.index({ status: 1, vehicleType: 1 });

module.exports = mongoose.model("Ride", RideSchema);
