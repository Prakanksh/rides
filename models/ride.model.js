const mongoose = require("mongoose");

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
    estimatedFare: { type: Number, default: 0 },
    finalFare: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "wallet"],
      default: "cash"
    },

    vehicleType: {
      type: String,
      enum: ["two-wheeler", "auto", "mini", "prime sedan", "suv"],
      required: true
    },

    status: {
      type: String,
      enum: [
        "requested", 
        "accepted", 
        "arrived", 
        "ongoing", 
        "reachedDestination",
        "completed", 
        "cancelled"
      ],
      default: "requested"
    },

    cancellationReason: { type: String, default: "" },
    cancelledBy: {
      type: String,
      enum: ["user", "driver", null],
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
      paymentCompletedAt: { type: Date, default: null }
    }
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

RideSchema.index({ pickupLocation: "2dsphere" });
RideSchema.index({ dropLocation: "2dsphere" });

module.exports = mongoose.model("Ride", RideSchema);
