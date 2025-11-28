// models/ride.model.js
const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
      default : null
    },

    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Pickup GeoJSON location
    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lat, lng] or app uses [lat,lng]
        required: true
      },
      address: { type: String, default: "" }
    },

    // Drop GeoJSON location
    dropLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lat,lng]
        required: true
      },
      address: { type: String, default: "" }
    },

    distance: { type: Number, default: 0 }, // in km
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
        "completed", 
        "cancelled"
      ],
      default: "requested"
    },

    cancellationReason: { type: String, default: "" },

    otpForRideStart: { type: String, default: null }, // 4-digit OTP like Ola/Uber

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

RideSchema.index({ pickupLocation: "2dsphere" });
RideSchema.index({ dropLocation: "2dsphere" });

module.exports = mongoose.model("Ride", RideSchema);
